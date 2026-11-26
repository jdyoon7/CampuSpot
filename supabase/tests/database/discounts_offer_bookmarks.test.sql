begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(14);

insert into auth.users(id) values
  ('64000000-0000-4000-8000-000000000001'), ('64000000-0000-4000-8000-000000000002');
insert into discount_reports(id, reporter_id, store_name, details, source_url, status) values
  ('64000000-0000-4000-8000-000000000010', '64000000-0000-4000-8000-000000000001', 'Same Name QA', 'First offer', 'https://example.test/offer-1', 'approved'),
  ('64000000-0000-4000-8000-000000000011', '64000000-0000-4000-8000-000000000001', 'Same Name QA', 'Second offer', 'https://example.test/offer-2', 'approved'),
  ('64000000-0000-4000-8000-000000000012', '64000000-0000-4000-8000-000000000001', 'Pending QA', 'Private', 'https://example.test/private', 'pending');

set local role anon;
select throws_ok($$select set_discount_offer_bookmark('64000000-0000-4000-8000-000000000010', true)$$, '42501', null, 'Anonymous saving is denied');
select throws_ok($$select * from list_my_discount_offer_bookmarks()$$, '42501', null, 'Anonymous listing is denied');
set local role authenticated;
set local request.jwt.claim.sub = '64000000-0000-4000-8000-000000000001';
select is((select count(*) from list_my_discount_offer_bookmarks()), 0::bigint, 'The initial list is empty');
select lives_ok($$select set_discount_offer_bookmark('64000000-0000-4000-8000-000000000010', true)$$, 'A member can save a public offer');
select lives_ok($$select set_discount_offer_bookmark('64000000-0000-4000-8000-000000000010', true)$$, 'Repeated saves are idempotent');
select results_eq(
  $$select id, details from list_my_discount_offer_bookmarks()$$,
  $$values ('64000000-0000-4000-8000-000000000010'::uuid, 'First offer'::text)$$,
  'The saved offer is identified by its id even if store names match'
);
select throws_ok($$select set_discount_offer_bookmark('64000000-0000-4000-8000-000000000012', true)$$, 'P0002', null, 'A pending offer cannot be saved');

set local request.jwt.claim.sub = '64000000-0000-4000-8000-000000000002';
select is((select count(*) from discount_offer_bookmarks), 0::bigint, 'RLS hides other members bookmarks');
select is((select count(*) from list_my_discount_offer_bookmarks()), 0::bigint, 'The list RPC returns only this member bookmarks');
select set_discount_offer_bookmark('64000000-0000-4000-8000-000000000010', false);

reset role;
update discount_reports set withdrawn_at = now() where id = '64000000-0000-4000-8000-000000000010';
set local role authenticated;
set local request.jwt.claim.sub = '64000000-0000-4000-8000-000000000001';
select is((select available from list_my_discount_offer_bookmarks()), false, 'The author can still see the bookmark is unavailable');
select ok(
  (select details is null and source_url is null and starts_on is null and ends_on is null
   from list_my_discount_offer_bookmarks()),
  'No withdrawn offer details are returned'
);
select throws_ok($$select set_discount_offer_bookmark('64000000-0000-4000-8000-000000000010', true)$$, 'P0002', null, 'A withdrawn offer cannot be saved again');
select lives_ok($$select set_discount_offer_bookmark('64000000-0000-4000-8000-000000000010', false)$$, 'A member can remove a withdrawn offer');
select is((select count(*) from list_my_discount_offer_bookmarks()), 0::bigint, 'The bookmark is gone');
select * from finish();
rollback;
