begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(23);
insert into auth.users(id) values
 ('6d010000-0000-4000-8000-000000000001'),('6d010000-0000-4000-8000-000000000002'),
 ('6d010000-0000-4000-8000-000000000003'),('6d010000-0000-4000-8000-000000000004');
insert into user_roles(user_id,role) values ('6d010000-0000-4000-8000-000000000002','admin');
insert into businesses(id,name,branch_name,address,source_url) values
 ('6d010000-0000-4000-8000-000000000010','Management QA','Near','Test A','https://example.test/a'),
 ('6d010000-0000-4000-8000-000000000011','Management QA','Far','Test B','https://example.test/b');
insert into business_operator_requests(business_id,requested_by,evidence_url,note,status) values
 ('6d010000-0000-4000-8000-000000000010','6d010000-0000-4000-8000-000000000001','https://example.test/owner','Proof','approved');
insert into discount_reports(id,reporter_id,business_id,store_name,details,source_url,status) values
 ('6d010000-0000-4000-8000-000000000020','6d010000-0000-4000-8000-000000000003','6d010000-0000-4000-8000-000000000010','Management QA discount','Test terms','https://example.test/a','approved');

set local role authenticated;
set local request.jwt.claim.sub='6d010000-0000-4000-8000-000000000001';
select lives_ok($$select save_discount_menu_item('6d010000-0000-4000-8000-000000000010','Lunch',5000,'Description')$$,'Operator can add a menu');
select throws_ok($$select save_discount_menu_item('6d010000-0000-4000-8000-000000000011','Other branch',5000)$$,'42501',null,'Other branches cannot be edited');
select lives_ok($$select save_discount_menu_item('6d010000-0000-4000-8000-000000000010','Lunch',6000,'Updated',(select id from discount_business_menu_items where name='Lunch' and business_id='6d010000-0000-4000-8000-000000000010'))$$,'Operator can update prices');
select lives_ok($$select request_discount_schedule('6d010000-0000-4000-8000-000000000010','6d010000-0000-4000-8000-000000000020','Changed hours',current_date+2,current_date+30,array[1,3],'09:00','17:00')$$,'Operator can request dates, weekdays and hours');
select is((select starts_on from list_owned_discount_schedules('6d010000-0000-4000-8000-000000000010')),null::date,'Pending change does not mutate the offer');
select lives_ok($$select record_discount_business_event('6d010000-0000-4000-8000-000000000010','view')$$,'Operator detail visits do not fail');
set local role anon;
select is((select price_krw from discount_business_menu_items where business_id='6d010000-0000-4000-8000-000000000010'),6000,'Guests read the actual price');
select throws_ok($$select get_owned_discount_business_stats('6d010000-0000-4000-8000-000000000010')$$,'42501',null,'Stats are private');

set local role authenticated;
set local request.jwt.claim.sub='6d010000-0000-4000-8000-000000000004';
select is((select count(*) from discount_business_schedule_requests where business_id='6d010000-0000-4000-8000-000000000010'),0::bigint,'Other members cannot read schedule requests');
select throws_ok($$select get_owned_discount_business_stats('6d010000-0000-4000-8000-000000000010')$$,'42501',null,'Other members cannot read stats');
select record_discount_business_event('6d010000-0000-4000-8000-000000000010','view');
select record_discount_business_event('6d010000-0000-4000-8000-000000000010','view');
select record_discount_business_event('6d010000-0000-4000-8000-000000000010','official_click');
set local request.jwt.claim.sub='6d010000-0000-4000-8000-000000000001';
select is((select views_30d from get_owned_discount_business_stats('6d010000-0000-4000-8000-000000000010')),1::bigint,'Repeated visits and operator views are not counted');
select is((select official_clicks_30d from get_owned_discount_business_stats('6d010000-0000-4000-8000-000000000010')),1::bigint,'Official clicks are counted independently');

set local request.jwt.claim.sub='6d010000-0000-4000-8000-000000000002';
select lives_ok($$select review_discount_schedule((select id from discount_business_schedule_requests where business_id='6d010000-0000-4000-8000-000000000010'),true)$$,'Admin can approve the schedule change');
select throws_ok($$select review_discount_schedule((select id from discount_business_schedule_requests where business_id='6d010000-0000-4000-8000-000000000010'),true)$$,'P0002',null,'Re-review is blocked');
set local role anon;
select is((select starts_on from search_discount_catalog_v2('Management QA discount')),current_date+2,'Approved date is published by search');

set local role authenticated;
set local request.jwt.claim.sub='6d010000-0000-4000-8000-000000000001';
select lives_ok($$select request_discount_schedule('6d010000-0000-4000-8000-000000000010','6d010000-0000-4000-8000-000000000020','Second request',current_date+3,current_date+30)$$,'A branch can request another change after a decision');
select throws_ok($$select request_discount_schedule('6d010000-0000-4000-8000-000000000010','6d010000-0000-4000-8000-000000000020','Duplicate request',current_date+4,current_date+30)$$,'23505',null,'Only one request can be pending for the same offer');
set local request.jwt.claim.sub='6d010000-0000-4000-8000-000000000002';
select set_discount_offer_terms('6d010000-0000-4000-8000-000000000020',p_from=>'10:00',p_until=>'17:00');
select throws_ok($$select review_discount_schedule((select id from discount_business_schedule_requests where business_id='6d010000-0000-4000-8000-000000000010' and decision='pending'),true)$$,'55000',null,'A stale request cannot overwrite a newer schedule');
reset role;
insert into business_follows(user_id,business_id,created_at)
values ('6d010000-0000-4000-8000-000000000004','6d010000-0000-4000-8000-000000000010',now()-interval '1 day');
update discount_reports set starts_on=(now() at time zone 'Asia/Seoul')::date-2,
  ends_on=(now() at time zone 'Asia/Seoul')::date+2
where id='6d010000-0000-4000-8000-000000000020';
set local role authenticated;
set local request.jwt.claim.sub='6d010000-0000-4000-8000-000000000004';
select is((select new_offer and starting and ending from get_my_discount_alert_preferences()),true,'All existing users keep default alert behavior');
select is((select count(*) from list_my_business_notifications() where kind='new_offer' and offer_id='6d010000-0000-4000-8000-000000000020'),1::bigint,'Default new offer is visible');
select lives_ok($$select set_my_discount_alert_preferences(false,true,true)$$,'Member can save preferences');
select is((select string_agg(kind::text,',' order by kind::text) from list_my_business_notifications() where offer_id='6d010000-0000-4000-8000-000000000020'),'ending'::text,'Only enabled notification kinds persist in the feed');
set local request.jwt.claim.sub='6d010000-0000-4000-8000-000000000003';
select is((select new_offer from get_my_discount_alert_preferences()),true,'A member cannot overwrite another account preference');
select * from finish();
rollback;
