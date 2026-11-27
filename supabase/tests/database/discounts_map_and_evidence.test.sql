begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(10);

insert into auth.users(id) values
  ('6a000000-0000-4000-8000-000000000001'),
  ('6a000000-0000-4000-8000-000000000002'),
  ('6a000000-0000-4000-8000-000000000003');
insert into user_roles(user_id,role) values ('6a000000-0000-4000-8000-000000000003','admin');
insert into businesses(id,name,branch_name,address,source_url) values
  ('6a000000-0000-4000-8000-000000000010','Map QA','Visible','Test address','https://example.test/shop'),
  ('6a000000-0000-4000-8000-000000000011','Map QA','Hidden','Test address','https://example.test/shop');
insert into discount_reports(id,reporter_id,business_id,store_name,details,source_url,status,starts_on,ends_on,withdrawn_at) values
  ('6a000000-0000-4000-8000-000000000020','6a000000-0000-4000-8000-000000000001',null,'Photo QA pending','Offer','https://example.test/offer','pending',null,null,null),
  ('6a000000-0000-4000-8000-000000000021','6a000000-0000-4000-8000-000000000001','6a000000-0000-4000-8000-000000000010','Photo QA approved','Offer','https://example.test/offer','approved',null,null,null),
  ('6a000000-0000-4000-8000-000000000022','6a000000-0000-4000-8000-000000000001','6a000000-0000-4000-8000-000000000011','Photo QA expired','Offer','https://example.test/offer','approved',current_date-3,current_date-2,null),
  ('6a000000-0000-4000-8000-000000000023','6a000000-0000-4000-8000-000000000001','6a000000-0000-4000-8000-000000000011','Photo QA withdrawn','Offer','https://example.test/offer','approved',null,null,now());
insert into storage.objects(bucket_id,name) values
  ('discount-evidence','6a000000-0000-4000-8000-000000000001/6a000000-0000-4000-8000-000000000020.png'),
  ('discount-evidence','6a000000-0000-4000-8000-000000000001/6a000000-0000-4000-8000-000000000021.png'),
  ('discount-evidence','6a000000-0000-4000-8000-000000000001/broken.png');

set local role anon;
select is((select offer_count from list_discount_map_businesses(100) where id='6a000000-0000-4000-8000-000000000010'),1,'Guests can see an active business with its count');
select is((select count(*) from list_discount_map_businesses(100) where id='6a000000-0000-4000-8000-000000000011'),0::bigint,'Expired and withdrawn offers do not populate the map');
select throws_ok($$select list_discount_evidence(array[]::uuid[])$$,'42501',null,'Guests cannot call the evidence RPC');

set local role authenticated;
set local request.jwt.claim.sub='6a000000-0000-4000-8000-000000000001';
select is((select count(*) from storage.objects where bucket_id='discount-evidence'),2::bigint,'The reporter can see both valid object paths');
select is((select count(*) from list_discount_evidence(array['6a000000-0000-4000-8000-000000000020','6a000000-0000-4000-8000-000000000021']::uuid[])),2::bigint,'The reporter receives its report attachments');
select throws_ok($$insert into storage.objects(bucket_id,name) values ('discount-evidence','direct.png')$$,'42501',null,'Members cannot bypass server upload validation');

set local request.jwt.claim.sub='6a000000-0000-4000-8000-000000000002';
select is((select count(*) from storage.objects where bucket_id='discount-evidence'),0::bigint,'Unrelated members cannot see objects');
select is((select count(*) from list_discount_evidence(array['6a000000-0000-4000-8000-000000000020']::uuid[])),0::bigint,'Unrelated members cannot list evidence by report ID');

set local request.jwt.claim.sub='6a000000-0000-4000-8000-000000000003';
select is((select count(*) from storage.objects where bucket_id='discount-evidence'),1::bigint,'Reviewers can see only pending evidence belonging to other users');
select is((select report_id from list_discount_evidence(array['6a000000-0000-4000-8000-000000000020','6a000000-0000-4000-8000-000000000021']::uuid[])),'6a000000-0000-4000-8000-000000000020'::uuid,'Only pending evidence is returned to the reviewer');

select * from finish();
rollback;
