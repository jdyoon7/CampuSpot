begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
set local timezone = 'America/Los_Angeles';
select plan(4);
insert into auth.users(id) values ('65000000-0000-4000-8000-000000000001');
with clock as (select (now() at time zone 'Asia/Seoul')::date today)
insert into discount_reports(id,reporter_id,store_name,details,source_url,status,available_weekdays)
select '65000000-0000-4000-8000-000000000010', '65000000-0000-4000-8000-000000000001',
  'Weekday Check QA','Test only','https://example.test/notice','approved',
  array[extract(isodow from today + 1)::integer] from clock;

set local role anon;
select is((select count(*) from search_published_discounts('Weekday Check QA')), 1::bigint, 'Default search shows upcoming recurring offers');
select is((select count(*) from search_published_discounts('Weekday Check QA', true)), 0::bigint, 'Today filter excludes a closed weekday');
select is((select count(*) from list_discount_calendar((now() at time zone 'Asia/Seoul')::date)
  where id = '65000000-0000-4000-8000-000000000010'), 0::bigint, 'Calendar excludes closed days');
select is((select count(*) from list_discount_calendar((now() at time zone 'Asia/Seoul')::date + 1, 100)
  where id = '65000000-0000-4000-8000-000000000010'), 1::bigint, 'Calendar shows the scheduled weekday');
select * from finish();
rollback;
