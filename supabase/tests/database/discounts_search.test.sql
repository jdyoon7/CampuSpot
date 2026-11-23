begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
set local timezone='America/Los_Angeles';
select no_plan();
insert into auth.users(id) values ('61000000-0000-4000-8000-000000000001');
with local_day as (select (now() at time zone 'Asia/Seoul')::date as d)
insert into discount_reports(reporter_id,store_name,details,source_url,starts_on,ends_on,status,reviewed_at)
 select '61000000-0000-4000-8000-000000000001',v.name,v.details,'https://example.test/notice',d+v.start_day,d+v.end_day,v.status::discount_report_status,now()+v.rank*interval '1 minute'
 from local_day cross join (values
 ('Search A','학생 10% 할인',null::int,null::int,'approved',1),
 ('Search B','학생 10% 할인',0,0,'approved',2),
 ('Search C','학생 10% 할인',1,6,'approved',3),
 ('Search D','학생 10% 할인',-1,7,'approved',4),
 ('Search E','학생 10% 할인',-3,-1,'approved',5),
 ('Search F','학생 10% 할인',0,0,'pending',6),
 ('Search G','학생 10% 할인',0,0,'rejected',7)
 ) v(name,details,start_day,end_day,status,rank);
set local role anon;
select results_eq($q$select store_name from search_published_discounts(' sEaRcH ')$q$,$q$values ('Search D'::text),('Search C'),('Search B'),('Search A')$q$,'case insensitive search preserves approved-only recency order');
select is((select count(*) from search_published_discounts('학생')),4::bigint,'finds Korean offer details');
select is((select count(*) from search_published_discounts('10%')),4::bigint,'percent is literal');
select is((select count(*) from search_published_discounts('_')),0::bigint,'underscore is literal');
select results_eq($q$select store_name from search_published_discounts('Search',true,false)$q$,$q$values ('Search D'::text),('Search B'),('Search A')$q$,'today includes ongoing and date boundaries, excludes future');
select results_eq($q$select store_name from search_published_discounts('Search',false,true)$q$,$q$values ('Search C'::text),('Search B')$q$,'ending in days 0..6, excludes ongoing and day 7');
select results_eq($q$select store_name from search_published_discounts('Search',true,true)$q$,$q$values ('Search B'::text)$q$,'filters intersect');
select results_eq($q$select store_name from search_published_discounts('Search',false,true,1,1)$q$,$q$values ('Search B'::text)$q$,'offset is applied after filtering');
select results_eq('select id from list_published_discounts()','select id from search_published_discounts()','old public API agrees with new feed');
select throws_ok($q$select * from search_published_discounts(repeat('a',101))$q$,'22023',null,'bounds search input');
select * from finish();
rollback;
