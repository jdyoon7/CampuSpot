begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(18);
insert into auth.users(id) values
 ('6e010000-0000-4000-8000-000000000001'),('6e010000-0000-4000-8000-000000000002'),('6e010000-0000-4000-8000-000000000003');
insert into user_roles(user_id,role) values ('6e010000-0000-4000-8000-000000000002','admin');
insert into businesses(id,name,branch_name,address,source_url) values
 ('6e010000-0000-4000-8000-000000000010','Groble QA','One','Test location','https://example.test/qa'),
 ('6e010000-0000-4000-8000-000000000011','Groble QA','Two','Test location','https://example.test/qa');
insert into business_operator_requests(business_id,requested_by,evidence_url,note,status) values
 ('6e010000-0000-4000-8000-000000000010','6e010000-0000-4000-8000-000000000001','https://example.test/verify','Approved','approved'),
 ('6e010000-0000-4000-8000-000000000011','6e010000-0000-4000-8000-000000000001','https://example.test/verify','Approved','approved');

set local role authenticated;
set local request.jwt.claim.sub='6e010000-0000-4000-8000-000000000001';
select throws_ok($$select prepare_groble_ad_order(auth.uid(),null,null,null,null)$$,'42501',null,'Browser cannot create its own price or order');
select throws_ok($$select record_groble_ad_event('id','delivery','payment.completed','merchant','product',1000,now())$$,'42501',null,'Browser cannot record payment completion');
set local role service_role;
select throws_ok($$select prepare_groble_ad_order('6e010000-0000-4000-8000-000000000003','6e010000-0000-4000-8000-000000000010','qa-product',4700,24)$$,'42501',null,'Checkout requires approved operator');
select set_config('test.groble_order_one',prepare_groble_ad_order('6e010000-0000-4000-8000-000000000001','6e010000-0000-4000-8000-000000000010','qa-product',4700,24)::text,true);
select set_config('test.groble_order_two',prepare_groble_ad_order('6e010000-0000-4000-8000-000000000001','6e010000-0000-4000-8000-000000000011','qa-product',4700,24)::text,true);
select is(prepare_groble_ad_order('6e010000-0000-4000-8000-000000000001','6e010000-0000-4000-8000-000000000010','qa-product',4700,24),
 current_setting('test.groble_order_one')::uuid,'Checkout retries use the same pending order');
set local role anon;
select is((select count(*) from list_active_groble_store_ads(20) where name='Groble QA'),0::bigint,'An order has no advertising effect before payment');
set local role service_role;
select is(record_groble_ad_event('qa-wrong','qa-wrong','payment.completed','qa-one','qa-product',4600,now(),current_setting('test.groble_order_one')::uuid,now()),'mismatch'::text,'Wrong total cannot activate ads');
select is(record_groble_ad_event('qa-completion','qa-completion','payment.completed','qa-one','qa-product',4700,now(),current_setting('test.groble_order_one')::uuid,now()),'matched'::text,'Only confirmed matching payment activates advertisement');
select is(record_groble_ad_event('qa-completion','qa-redelivery','payment.completed','qa-one','qa-product',4700,now(),current_setting('test.groble_order_one')::uuid,now()),'duplicate'::text,'Replayed signed event is deduplicated');
select is(record_groble_ad_event('qa-extra','qa-extra','payment.completed','qa-extra-charge','qa-product',4700,now(),current_setting('test.groble_order_one')::uuid,now()),'additional_payment'::text,'Duplicate charge with a different merchant UID is flagged for review');
select is(record_groble_ad_event('qa-cancel','qa-cancel','payment.cancel_requested','qa-one','qa-product',4700,now()+interval '1 second'),'matched'::text,'A cancellation request is recorded');
set local role anon;
select is((select count(*) from list_active_groble_store_ads(20) where name='Groble QA'),1::bigint,'Requested refund alone does not disable advertisement');
set local role authenticated;
set local request.jwt.claim.sub='6e010000-0000-4000-8000-000000000003';
select is((select count(*) from list_my_groble_ad_orders('6e010000-0000-4000-8000-000000000010')),0::bigint,'Others cannot see buyer order history');
select throws_ok($$select list_groble_ad_payment_review()$$,'42501',null,'Others cannot see merchant receipts');
set local role service_role;
select is(record_groble_ad_event('qa-refund','qa-refund','payment.refunded','qa-one','qa-product',4700,now()+interval '2 seconds',p_refund_at=>now()+interval '2 seconds',p_refund_amount=>1000),'matched'::text,'A completed partial refund stops the advertisement');
select is(record_groble_ad_event('qa-refund-new','qa-refund-new','payment.refunded','qa-one','qa-product',4700,now()+interval '2 seconds',p_refund_at=>now()+interval '2 seconds',p_refund_amount=>1000),'duplicate'::text,'The provider refund timestamp suppresses republished duplicates');
select is(record_groble_ad_event('qa-refund-first','qa-refund-first','payment.refunded','qa-two','qa-product',4700,now()+interval '2 seconds',p_refund_at=>now()+interval '2 seconds',p_refund_amount=>4700),'awaiting_completion'::text,'Refund before completion is retained');
select is(record_groble_ad_event('qa-pay-late','qa-pay-late','payment.completed','qa-two','qa-product',4700,now(),current_setting('test.groble_order_two')::uuid,now()),'matched'::text,'Late completion reconciles previously arrived refund');
set local role anon;
select is((select count(*) from list_active_groble_store_ads(20) where name='Groble QA'),0::bigint,'Neither partial nor fully refunded advertisements remain public');

select * from finish();
rollback;
