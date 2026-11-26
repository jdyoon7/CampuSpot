begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
set local timezone = 'America/Los_Angeles';
select plan(16);

insert into auth.users(id) values
  ('68000000-0000-4000-8000-000000000001'), ('68000000-0000-4000-8000-000000000002');
insert into businesses(id,name,branch_name,address,source_url) values
  ('68000000-0000-4000-8000-000000000010','Follow QA','East','East address','https://example.test/east'),
  ('68000000-0000-4000-8000-000000000011','Follow QA','West','West address','https://example.test/west');

with clock as (select (now() at time zone 'Asia/Seoul')::date as today)
insert into discount_reports(id,reporter_id,business_id,store_name,details,source_url,starts_on,ends_on,status,created_at)
select fixture.id::uuid,'68000000-0000-4000-8000-000000000001','68000000-0000-4000-8000-000000000010',
  fixture.label,'Test offer','https://example.test/offer',today+fixture.start_offset,today+fixture.end_offset,'approved',now()-interval '4 days'
from clock cross join (values
  ('68000000-0000-4000-8000-000000000020','Follow QA old',null::integer,null::integer),
  ('68000000-0000-4000-8000-000000000021','Follow QA starts today',0,30),
  ('68000000-0000-4000-8000-000000000022','Follow QA ending',-5,6)
) fixture(id,label,start_offset,end_offset);
update discount_reports set business_linked_at = now()-interval '4 days'
  where id in ('68000000-0000-4000-8000-000000000020','68000000-0000-4000-8000-000000000021','68000000-0000-4000-8000-000000000022');

set local role anon;
select throws_ok($$select set_business_follow('68000000-0000-4000-8000-000000000010',true)$$,'42501',null,'Guest cannot follow');
select throws_ok('select * from list_my_business_notifications()','42501',null,'Guest cannot read alerts');
set local role authenticated;
set local request.jwt.claim.sub = '68000000-0000-4000-8000-000000000001';
select lives_ok($$select set_business_follow('68000000-0000-4000-8000-000000000010',true)$$,'Member can follow an exact branch');
select lives_ok($$select set_business_follow('68000000-0000-4000-8000-000000000010',true)$$,'Follow is idempotent');
select is((select count(*) from list_my_followed_businesses()),1::bigint,'Only one follow exists');
select throws_ok('select * from business_notification_reads','42501',null,'Read receipts are private');

reset role;
update business_follows set created_at = now() - interval '2 days' where user_id='68000000-0000-4000-8000-000000000001';
insert into discount_reports(id,reporter_id,business_id,store_name,details,source_url,status) values
 ('68000000-0000-4000-8000-000000000023','68000000-0000-4000-8000-000000000001','68000000-0000-4000-8000-000000000010','Follow QA new','Test offer','https://example.test/offer','approved'),
 ('68000000-0000-4000-8000-000000000024','68000000-0000-4000-8000-000000000001','68000000-0000-4000-8000-000000000010','Follow QA private','Test offer','https://example.test/offer','pending'),
 ('68000000-0000-4000-8000-000000000025','68000000-0000-4000-8000-000000000001','68000000-0000-4000-8000-000000000011','Follow QA other location','Test offer','https://example.test/offer','approved');
set local role authenticated;
select results_eq(
  $$select a.kind::text,a.store_name from list_my_business_notifications() a order by a.kind$$,
  $$values ('new_offer'::text,'Follow QA new'::text),('starting','Follow QA starts today'),('ending','Follow QA ending')$$,
  'Alerts respect follow time, offer status, day boundaries, and branch membership'
);
select is((select count(*) from list_my_business_notifications() where read_at is not null),0::bigint,'New alerts are unread');
select mark_business_notification_read(business_id,offer_id,kind,event_at) from list_my_business_notifications() where kind='new_offer';
select mark_business_notification_read(business_id,offer_id,kind,event_at) from list_my_business_notifications() where kind='new_offer';
select is((select count(*) from list_my_business_notifications() where read_at is not null),1::bigint,'Read state is persisted and idempotent');
select is((select kind::text from list_my_business_notifications() where read_at is not null),'new_offer'::text,'Only the exact alert is marked');
set local request.jwt.claim.sub = '68000000-0000-4000-8000-000000000002';
select is((select count(*) from business_follows),0::bigint,'Other member follows are hidden');
select is((select count(*) from list_my_business_notifications()),0::bigint,'Other member alerts are hidden');
select set_business_follow('68000000-0000-4000-8000-000000000010',false);
set local request.jwt.claim.sub = '68000000-0000-4000-8000-000000000001';
select is((select count(*) from list_my_followed_businesses()),1::bigint,'Another member cannot unfollow for this member');
reset role;
update discount_reports set withdrawn_at=now() where id='68000000-0000-4000-8000-000000000023';
set local role authenticated;
select is((select count(*) from list_my_business_notifications() where kind='new_offer'),0::bigint,'Withdrawn offer alerts disappear');
select set_business_follow('68000000-0000-4000-8000-000000000010',false);
select is((select count(*) from list_my_business_notifications()),0::bigint,'Unfollow removes alerts for the branch');
reset role;
select is((select count(*) from business_notification_reads where user_id='68000000-0000-4000-8000-000000000001'),0::bigint,'Unfollow also removes read receipts');
select * from finish();
rollback;
