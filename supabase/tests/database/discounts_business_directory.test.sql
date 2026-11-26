begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(15);

insert into auth.users(id) values
  ('67000000-0000-4000-8000-000000000001'), ('67000000-0000-4000-8000-000000000002');
insert into user_roles(user_id,role) values ('67000000-0000-4000-8000-000000000002','admin');
insert into discount_reports(id,reporter_id,store_name,details,source_url,status) values
  ('67000000-0000-4000-8000-000000000010','67000000-0000-4000-8000-000000000001','Directory QA benefit','Offer details','https://example.test/notice','approved'),
  ('67000000-0000-4000-8000-000000000011','67000000-0000-4000-8000-000000000001','Directory QA pending','Private details','https://example.test/notice','pending');

set local role anon;
select lives_ok('select id, name, branch_name, address, source_url from businesses','Guests can browse public branch data');
select throws_ok('select registered_by from businesses','42501',null,'Registrar identities are private');
select throws_ok(
  $$select set_discount_business_link('67000000-0000-4000-8000-000000000010','67000000-0000-4000-8000-000000000099',true)$$,
  '42501',null,'Guests cannot link offers'
);

set local role authenticated;
set local request.jwt.claim.sub='67000000-0000-4000-8000-000000000001';
select throws_ok(
  $$insert into businesses(name,branch_name,address,source_url) values('Directory QA','East','East address','https://example.test/east')$$,
  '42501',null,'Members cannot register a business'
);
select throws_ok(
  $$select set_discount_business_link('67000000-0000-4000-8000-000000000010','67000000-0000-4000-8000-000000000099',true)$$,
  '42501',null,'Members cannot link offers'
);

set local request.jwt.claim.sub='67000000-0000-4000-8000-000000000002';
select lives_ok(
  $$insert into businesses(name,branch_name,address,source_url) values('Directory QA','East','East address','https://example.test/east') returning id$$,
  'Admins can register and read their new branch'
);
select lives_ok(
  $$insert into businesses(name,branch_name,address,source_url) values('Directory QA','West','West address','https://example.test/west')$$,
  'A second branch of the same name is independent'
);
select throws_ok(
  $$insert into businesses(name,branch_name,address,source_url) values('directory qa','EAST','east address','https://example.test/east')$$,
  '23505',null,'Identical locations cannot be duplicated by case changes'
);
select lives_ok(
  $$select set_discount_business_link('67000000-0000-4000-8000-000000000010',(select id from businesses where name='Directory QA' and branch_name='East'),true)$$,
  'Admins can link an approved offer'
);
select throws_ok(
  $$select set_discount_business_link('67000000-0000-4000-8000-000000000010',(select id from businesses where name='Directory QA' and branch_name='West'),true)$$,
  '55000',null,'Admins must unlink the old branch before moving an offer'
);
select throws_ok(
  $$select set_discount_business_link('67000000-0000-4000-8000-000000000011',(select id from businesses where name='Directory QA' and branch_name='East'),true)$$,
  'P0002',null,'Pending offers cannot be linked'
);

set local role anon;
select is(
  (select count(*) from list_business_discounts((select id from businesses where name='Directory QA' and branch_name='East'))),
  1::bigint,'Public branch shows its approved linked offer'
);
select is(
  (select branch_name from list_public_discount_business_links(array['67000000-0000-4000-8000-000000000010','67000000-0000-4000-8000-000000000011']::uuid[])),
  'East'::text,'Public association lookup returns the exact branch without pending offers'
);
set local role authenticated;
select lives_ok(
  $$select set_discount_business_link('67000000-0000-4000-8000-000000000010',(select id from businesses where name='Directory QA' and branch_name='East'),false)$$,
  'Admins can unlink the exact branch'
);
set local role anon;
select is(
  (select count(*) from list_public_discount_business_links(array['67000000-0000-4000-8000-000000000010']::uuid[])),
  0::bigint,'Unlinked offers no longer show a branch'
);
select * from finish();
rollback;
