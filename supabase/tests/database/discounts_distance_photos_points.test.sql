begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(20);

insert into auth.users(id) values
 ('6c010000-0000-4000-8000-000000000001'),('6c010000-0000-4000-8000-000000000002'),
 ('6c010000-0000-4000-8000-000000000003'),('6c010000-0000-4000-8000-000000000004');
insert into user_roles(user_id,role) values ('6c010000-0000-4000-8000-000000000002','admin');
insert into universities(id,name) values ('6c010000-0000-4000-8000-000000000009','Distance QA');
update private_profiles set university_id='6c010000-0000-4000-8000-000000000009' where id='6c010000-0000-4000-8000-000000000003';
insert into businesses(id,name,branch_name,address,source_url,latitude,longitude) values
 ('6c010000-0000-4000-8000-000000000010','Distance QA','Near','Test A','https://example.test/a',37.58,127.01),
 ('6c010000-0000-4000-8000-000000000011','Distance QA','Far','Test B','https://example.test/b',37.58,127.02);
insert into business_operator_requests(business_id,requested_by,evidence_url,note,status) values
 ('6c010000-0000-4000-8000-000000000010','6c010000-0000-4000-8000-000000000001','https://example.test/owner','Proof','approved');
insert into discount_reports(id,reporter_id,business_id,store_name,details,source_url,status,target_university_id) values
 ('6c010000-0000-4000-8000-000000000020','6c010000-0000-4000-8000-000000000003','6c010000-0000-4000-8000-000000000010','Distance QA near','Terms','https://example.test/a','pending',null),
 ('6c010000-0000-4000-8000-000000000021','6c010000-0000-4000-8000-000000000003','6c010000-0000-4000-8000-000000000011','Distance QA school','Terms','https://example.test/b','approved','6c010000-0000-4000-8000-000000000009');
insert into storage.objects(bucket_id,name) values
 ('business-photos','6c010000-0000-4000-8000-000000000010/6c010000-0000-4000-8000-000000000050.png'),
 ('business-photos','6c010000-0000-4000-8000-000000000010/6c010000-0000-4000-8000-000000000051.png');

set local role anon;
select is((select count(*) from storage.objects where bucket_id='business-photos' and name like '6c010000%'),0::bigint,'A staged photo stays private');
select throws_ok($$select search_discount_catalog_v2(p_sort=>'distance')$$,'22023',null,'Distance requires a valid origin');
select throws_ok($$select manage_discount_business_photo(null,null,null,null)$$,'42501',null,'Browser cannot publish the storage path directly');
set local role service_role;
select throws_ok($$select manage_discount_business_photo('6c010000-0000-4000-8000-000000000004','6c010000-0000-4000-8000-000000000010',null,null)$$,'42501',null,'A service request must name the approved operator');
select ok(manage_discount_business_photo('6c010000-0000-4000-8000-000000000001','6c010000-0000-4000-8000-000000000010',null,'6c010000-0000-4000-8000-000000000010/6c010000-0000-4000-8000-000000000050.png'),'Approved operator can publish staged image');
select is(manage_discount_business_photo('6c010000-0000-4000-8000-000000000001','6c010000-0000-4000-8000-000000000010',null,'6c010000-0000-4000-8000-000000000010/6c010000-0000-4000-8000-000000000051.png'),false,'A stale request cannot overwrite the published image');
set local role anon;
select is((select count(*) from storage.objects where bucket_id='business-photos' and name like '6c010000%'),1::bigint,'Only the selected image can be read publicly');

set local role authenticated;
set local request.jwt.claim.sub='6c010000-0000-4000-8000-000000000002';
select lives_ok($$select review_discount_report('6c010000-0000-4000-8000-000000000020','approved')$$,'A reviewed member report grants points');
set local role anon;
select is((select store_name from search_discount_catalog_v2('Distance QA',p_limit=>1,p_sort=>'distance',p_lat=>37.58,p_lng=>127.01)),'Distance QA near'::text,'Distance sorts before pagination');
select is((select distance_m from search_discount_catalog_v2('Distance QA',p_limit=>1,p_sort=>'distance',p_lat=>37.58,p_lng=>127.01)),0,'A matching origin has zero distance');
set local role authenticated;
set local request.jwt.claim.sub='6c010000-0000-4000-8000-000000000001';
select lives_ok($$select create_points_discount_coupon('6c010000-0000-4000-8000-000000000010','QA paid coupon','Terms',current_date-1,current_date+1,3,70)$$,'Operator creates a coupon priced at 70 points');
set local request.jwt.claim.sub='6c010000-0000-4000-8000-000000000004';
select throws_ok($$select claim_discount_coupon((select id from list_business_coupon_offers('6c010000-0000-4000-8000-000000000010')))$$,'P0001',null,'Insufficient points block a claim');
select is((select remaining from list_business_coupon_offers('6c010000-0000-4000-8000-000000000010')),3,'A failed payment leaves stock intact');
set local request.jwt.claim.sub='6c010000-0000-4000-8000-000000000003';
select is((select store_name from search_discount_catalog_v2('Distance QA',p_limit=>1,p_sort=>'recommended')),'Distance QA school'::text,'A school match is recommended first');
select is(claim_discount_coupon((select id from list_business_coupon_offers('6c010000-0000-4000-8000-000000000010'))),
  claim_discount_coupon((select id from list_business_coupon_offers('6c010000-0000-4000-8000-000000000010'))),'Repeated purchase returns the same code');
select is(my_discount_point_balance(),30::bigint,'The coupon charged points once');
select throws_ok($$select list_discount_reward_grants()$$,'42501',null,'Members cannot see the administrative ledger');
set local request.jwt.claim.sub='6c010000-0000-4000-8000-000000000002';
select lives_ok($$select revoke_discount_reward((select id from list_discount_reward_grants(100) where label='Distance QA near'),'QA invalid report')$$,'Administrator records a reversal with a reason');
select lives_ok($$select revoke_discount_reward((select id from list_discount_reward_grants(100) where label='Distance QA near'),'QA duplicate request')$$,'A retry does not create another reversal');
set local request.jwt.claim.sub='6c010000-0000-4000-8000-000000000003';
select is(my_discount_point_balance(),-70::bigint,'A reversal after spending leaves the debt exactly once');
select * from finish();
rollback;
