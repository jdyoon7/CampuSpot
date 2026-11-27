begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(12);

insert into auth.users(id) values
  ('69000000-0000-4000-8000-000000000001'), ('69000000-0000-4000-8000-000000000002');
insert into user_roles(user_id,role) values ('69000000-0000-4000-8000-000000000002','admin');
insert into universities(id,name) values
  ('69000000-0000-4000-8000-000000000010','Catalog QA School A'),
  ('69000000-0000-4000-8000-000000000011','Catalog QA School B'),
  ('69000000-0000-4000-8000-000000000012','Catalog QA Unpublished School');
insert into businesses(id,name,branch_name,address,source_url,nearby_university_id,region,category) values
  ('69000000-0000-4000-8000-000000000020','Catalog QA','East','Test address A','https://example.test/east','69000000-0000-4000-8000-000000000010','Catalog QA Region A','food'),
  ('69000000-0000-4000-8000-000000000021','Catalog QA','West','Test address B','https://example.test/west','69000000-0000-4000-8000-000000000010','Catalog QA Region B','cafe'),
  ('69000000-0000-4000-8000-000000000022','Catalog QA','North','Test address C','https://example.test/north','69000000-0000-4000-8000-000000000011','Catalog QA Region A','food'),
  ('69000000-0000-4000-8000-000000000023','Catalog QA','Hidden','Test address D','https://example.test/hidden','69000000-0000-4000-8000-000000000012','Catalog QA Hidden Region','services');
insert into discount_reports(reporter_id,business_id,store_name,details,source_url,status,reviewed_at) values
  ('69000000-0000-4000-8000-000000000001','69000000-0000-4000-8000-000000000020','Catalog QA East','학생 아침밥','https://example.test/east','approved',now()),
  ('69000000-0000-4000-8000-000000000001','69000000-0000-4000-8000-000000000021','Catalog QA West','학생 아침밥','https://example.test/west','approved',now()+interval '1 minute'),
  ('69000000-0000-4000-8000-000000000001','69000000-0000-4000-8000-000000000022','Catalog QA North','학생 아침밥','https://example.test/north','approved',now()+interval '2 minutes'),
  ('69000000-0000-4000-8000-000000000001',null,'Catalog QA Unlinked','학생 아침밥','https://example.test/unlinked','approved',now()),
  ('69000000-0000-4000-8000-000000000001','69000000-0000-4000-8000-000000000023','Catalog QA Hidden','학생 아침밥','https://example.test/hidden','pending',null);

set local role anon;
select is((select count(*) from search_published_discounts('Catalog QA')),4::bigint,'The old search keeps unclassified offers');
select is((select count(*) from search_discount_catalog(p_query=>'Catalog QA',p_university_id=>'69000000-0000-4000-8000-000000000010')),2::bigint,'School matches registered nearby business');
select is((select count(*) from search_discount_catalog(p_query=>'Catalog QA',p_region=>'Catalog QA Region A')),2::bigint,'Region filter matches two districts fixtures');
select is((select count(*) from search_discount_catalog(p_query=>'Catalog QA',p_category=>'cafe')),1::bigint,'Category filter selects the cafe');
select is(
  (select store_name from search_discount_catalog(p_query=>'학생아침밥',p_university_id=>'69000000-0000-4000-8000-000000000010',
    p_region=>'Catalog QA Region A',p_category=>'food',p_limit=>1)),
  'Catalog QA East'::text,'Text and all facets intersect before pagination'
);
select is((select count(*) from list_discount_catalog_filters() where value='Catalog QA Hidden Region'),0::bigint,'Pending-only regions are not offered');
select is((select count(*) from list_discount_catalog_filters() where label='Catalog QA School A'),1::bigint,'School option deduplicates participating branches');
select throws_ok($$select set_business_discovery('69000000-0000-4000-8000-000000000020',p_region=>'Other')$$,'42501',null,'Guests cannot edit business metadata');

set local role authenticated;
set local request.jwt.claim.sub='69000000-0000-4000-8000-000000000001';
select throws_ok($$select set_business_discovery('69000000-0000-4000-8000-000000000020',p_region=>'Other')$$,'42501',null,'Members cannot edit business metadata');
set local request.jwt.claim.sub='69000000-0000-4000-8000-000000000002';
select lives_ok(
  $$select set_business_discovery('69000000-0000-4000-8000-000000000020','69000000-0000-4000-8000-000000000010',' New   Region ','services')$$,
  'Administrators can set the three facets'
);
set local role anon;
select is((select count(*) from search_discount_catalog(p_query=>'Catalog QA',p_region=>'New Region',p_category=>'services')),1::bigint,'Saved and normalized values are immediately searchable');
select is((select count(*) from search_discount_catalog(p_query=>'Catalog QA',p_region=>'Catalog QA Region A')),1::bigint,'The prior region no longer returns the updated branch');
select * from finish();
rollback;
