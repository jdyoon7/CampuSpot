begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(18);

insert into auth.users(id) values
  ('63000000-0000-4000-8000-000000000001'),
  ('63000000-0000-4000-8000-000000000002'),
  ('63000000-0000-4000-8000-000000000003');
insert into user_roles values ('63000000-0000-4000-8000-000000000003', 'admin');
insert into discount_reports(id, reporter_id, store_name, details, source_url, status) values
  ('63000000-0000-4000-8000-000000000010', '63000000-0000-4000-8000-000000000001',
   'Correction QA', 'Original details', 'https://example.test/notice', 'approved'),
  ('63000000-0000-4000-8000-000000000011', '63000000-0000-4000-8000-000000000001',
   'Correction QA pending', 'Pending details', 'https://example.test/notice', 'pending');

set local role anon;
select throws_ok(
  $$select submit_discount_correction('63000000-0000-4000-8000-000000000010', 'ended', 'Reason')$$,
  '42501', null, 'Anonymous visitors cannot file corrections'
);
select throws_ok($$select * from discount_corrections$$, '42501', null, 'Anonymous visitors cannot read corrections');

set local role authenticated;
set local request.jwt.claim.sub = '63000000-0000-4000-8000-000000000001';
select throws_ok(
  $$select submit_discount_correction('63000000-0000-4000-8000-000000000011', 'ended', 'Reason')$$,
  'P0002', null, 'Private pending offers cannot receive corrections'
);
select lives_ok(
  $$select submit_discount_correction('63000000-0000-4000-8000-000000000010', 'edit', 'Updated notice', 'Edited details')$$,
  'A member can submit a correction for a published offer'
);
select is((select count(*) from discount_corrections), 1::bigint, 'The author can view their submission');
select throws_ok($$select reviewer_id from discount_corrections$$, '42501', null, 'Internal reviewer identifiers are private');
select lives_ok(
  $$select id,kind,store_name,current_details,proposed_details,source_url,report_note,status,rejection_reason
    from discount_corrections order by created_at, id$$,
  'The member history can select and order its display fields'
);
select throws_ok(
  $$select submit_discount_correction('63000000-0000-4000-8000-000000000010', 'ended', 'Duplicate')$$,
  '23505', null, 'One pending submission per author and offer'
);
select throws_ok(
  $$select review_discount_correction((select id from discount_corrections), 'approved')$$,
  '42501', null, 'A member cannot review corrections'
);
select is(
  (select details from search_published_discounts('Correction QA')),
  'Original details'::text, 'Pending changes do not alter published details'
);

set local request.jwt.claim.sub = '63000000-0000-4000-8000-000000000002';
select is((select count(*) from discount_corrections), 0::bigint, 'Other members cannot see the author submission');
select submit_discount_correction('63000000-0000-4000-8000-000000000010', 'incorrect', 'Outdated notice');

set local request.jwt.claim.sub = '63000000-0000-4000-8000-000000000003';
select review_discount_correction((select id from discount_corrections where kind = 'edit'), 'approved');
select is(
  (select details from search_published_discounts('Correction QA')),
  'Edited details'::text, 'Approval updates the published details'
);
select throws_ok(
  $$select review_discount_correction((select id from discount_corrections where kind = 'incorrect'), 'approved')$$,
  '55000', null, 'A stale approval cannot overwrite a newer review'
);
select review_discount_correction((select id from discount_corrections where kind = 'incorrect'), 'rejected', 'The official notice was updated');

set local request.jwt.claim.sub = '63000000-0000-4000-8000-000000000002';
select is(
  (select rejection_reason from discount_corrections where kind = 'incorrect'),
  'The official notice was updated'::text, 'The author can see their rejection reason'
);
select submit_discount_correction('63000000-0000-4000-8000-000000000010', 'ended', 'Offer ended');

set local request.jwt.claim.sub = '63000000-0000-4000-8000-000000000003';
select submit_discount_correction('63000000-0000-4000-8000-000000000010', 'incorrect', 'My report');
select throws_ok(
  $$select review_discount_correction((select id from discount_corrections where kind = 'incorrect'), 'approved')$$,
  'P0002', null, 'An admin cannot approve their own correction'
);
select review_discount_correction((select id from discount_corrections where kind = 'ended'), 'approved');

set local role anon;
select is((select count(*) from search_published_discounts('Correction QA')), 0::bigint, 'Withdrawal removes the offer from search');
select is(
  (select count(*) from list_discount_calendar((now() at time zone 'Asia/Seoul')::date)
    where id = '63000000-0000-4000-8000-000000000010'),
  0::bigint, 'Withdrawal removes the offer from the calendar'
);
select is(
  (select count(*) from list_published_discounts() where id = '63000000-0000-4000-8000-000000000010'),
  0::bigint, 'Withdrawal removes the offer from the legacy public list'
);
select * from finish();
rollback;
