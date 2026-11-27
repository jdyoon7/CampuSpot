begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(25);
insert into auth.users(id) values
 ('6b010000-0000-4000-8000-000000000001'),('6b010000-0000-4000-8000-000000000002'),
 ('6b010000-0000-4000-8000-000000000003'),('6b010000-0000-4000-8000-000000000004');
insert into user_roles(user_id,role) values ('6b010000-0000-4000-8000-000000000002','admin');
insert into universities(id,name) values ('6b010000-0000-4000-8000-000000000009','Operations QA University');
insert into businesses(id,name,branch_name,address,source_url) values
 ('6b010000-0000-4000-8000-000000000010','Operations QA','One','test address A','https://example.test/one'),
 ('6b010000-0000-4000-8000-000000000011','Operations QA','Two','test address B','https://example.test/two');
insert into discount_reports(id,reporter_id,store_name,details,source_url,status) values
 ('6b010000-0000-4000-8000-000000000020','6b010000-0000-4000-8000-000000000003','Operations QA pending','Test terms','https://example.test/pending','pending'),
 ('6b010000-0000-4000-8000-000000000021','6b010000-0000-4000-8000-000000000003','Operations QA second','Test terms','https://example.test/other','approved');

set local role anon;
select throws_ok($$select request_business_operator(null,null,null)$$,'42501',null,'Guests cannot request operator access');
set local role authenticated;
set local request.jwt.claim.sub='6b010000-0000-4000-8000-000000000001';
select lives_ok($$select request_business_operator('6b010000-0000-4000-8000-000000000010','https://example.test/owner','Business evidence')$$,'An authenticated applicant can apply');
select throws_ok($$select edit_owned_business('6b010000-0000-4000-8000-000000000010','intro','hours',null)$$,'42501',null,'Pending applicant cannot edit');
select throws_ok($$insert into point_ledger(user_id,source,source_id,amount) values(auth.uid(),'discount_report',gen_random_uuid(),100)$$,'42501',null,'Members cannot write their own points');
set local request.jwt.claim.sub='6b010000-0000-4000-8000-000000000002';
select lives_ok($$select review_business_operator((select id from business_operator_requests where business_id='6b010000-0000-4000-8000-000000000010'),'approved')$$,'Admin approves the applicant');
select lives_ok($$select review_discount_report('6b010000-0000-4000-8000-000000000020','approved')$$,'Admin approves an eligible report');
select throws_ok($$select review_discount_report('6b010000-0000-4000-8000-000000000020','approved')$$,'P0002',null,'A repeated review cannot pay again');
select is(my_discount_point_balance(),0::bigint,'Reviewers receive no reward');
select lives_ok($$select set_discount_offer_terms('6b010000-0000-4000-8000-000000000020',30,null,'00:00','24:00','6b010000-0000-4000-8000-000000000009',null,true)$$,'Admin records target school, hours and percentage');
select lives_ok($$select set_discount_offer_terms('6b010000-0000-4000-8000-000000000021',10,null)$$,'Admin records a second percentage');
set local role anon;
select is((select discount_percent from search_discount_catalog_ranked('Operations QA',p_limit=>1,p_sort=>'percent')),30,'Search sorts before pagination');
select is((select count(*) from search_discount_catalog_ranked('Operations QA',p_now_only=>true,p_partner_only=>true,p_university_id=>'6b010000-0000-4000-8000-000000000009')),1::bigint,'Time and partner filters intersect with an explicitly eligible school');
set local role authenticated;
set local request.jwt.claim.sub='6b010000-0000-4000-8000-000000000001';
select lives_ok($$select edit_owned_business('6b010000-0000-4000-8000-000000000010','intro','hours',null)$$,'Approved operator can edit the assigned branch');
select throws_ok($$select edit_owned_business('6b010000-0000-4000-8000-000000000011','intro','hours',null)$$,'42501',null,'Cross-branch edits are blocked');
select lives_ok($$select create_discount_coupon('6b010000-0000-4000-8000-000000000010','One coupon','Test terms',(now() at time zone 'Asia/Seoul')::date,(now() at time zone 'Asia/Seoul')::date+2,1)$$,'Approved operator creates a limited campaign');
select lives_ok($$select create_discount_coupon('6b010000-0000-4000-8000-000000000010','School coupon','Test terms',(now() at time zone 'Asia/Seoul')::date,(now() at time zone 'Asia/Seoul')::date+2,1,'6b010000-0000-4000-8000-000000000009')$$,'School restriction is supported');
set local request.jwt.claim.sub='6b010000-0000-4000-8000-000000000003';
select is(my_discount_point_balance(),100::bigint,'Reporter earns exactly 100 points');
select throws_ok($$select claim_discount_coupon((select id from list_business_coupons('6b010000-0000-4000-8000-000000000010') where title='School coupon'))$$,'42501',null,'Unverified member cannot claim a school restricted coupon');
select is(
  claim_discount_coupon((select id from list_business_coupons('6b010000-0000-4000-8000-000000000010') where title='One coupon')),
  claim_discount_coupon((select id from list_business_coupons('6b010000-0000-4000-8000-000000000010') where title='One coupon')),
  'Duplicate claims return the same single-use code'
);
select set_config('test.discount_coupon',(select code::text from list_my_discount_coupons() where title='One coupon'),true);
set local request.jwt.claim.sub='6b010000-0000-4000-8000-000000000004';
select throws_ok($$select claim_discount_coupon((select id from list_business_coupons('6b010000-0000-4000-8000-000000000010') where title='One coupon'))$$,'55000',null,'Issuance quantity cannot be exceeded');
set local request.jwt.claim.sub='6b010000-0000-4000-8000-000000000001';
select is(redeem_discount_coupon('6b010000-0000-4000-8000-000000000010',current_setting('test.discount_coupon')::uuid),'One coupon'::text,'Operator can verify and redeem the code');
select throws_ok($$select redeem_discount_coupon('6b010000-0000-4000-8000-000000000010',current_setting('test.discount_coupon')::uuid)$$,'55000',null,'A redeemed code cannot be used again');
select lives_ok($$select submit_owned_business_offer('6b010000-0000-4000-8000-000000000010','Owner campaign','Terms','https://example.test/new')$$,'Operator requests normal offer review');
set local request.jwt.claim.sub='6b010000-0000-4000-8000-000000000002';
select lives_ok($$select review_discount_report((select id from discount_reports where store_name='Owner campaign'),'approved')$$,'Admin can approve operator offers');
set local request.jwt.claim.sub='6b010000-0000-4000-8000-000000000001';
select is(my_discount_point_balance(),0::bigint,'Operators do not earn report points on their own campaigns');
select * from finish();
rollback;
