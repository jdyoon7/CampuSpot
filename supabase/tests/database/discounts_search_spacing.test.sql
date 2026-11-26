begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(4);
insert into auth.users(id) values ('66000000-0000-4000-8000-000000000001');
insert into discount_reports(id,reporter_id,store_name,details,source_url,status) values
 ('66000000-0000-4000-8000-000000000010','66000000-0000-4000-8000-000000000001',
  'Spacing QA 매장','테스트 천원의 아침밥','https://example.test/notice','approved'),
 ('66000000-0000-4000-8000-000000000011','66000000-0000-4000-8000-000000000001',
  'Spacing QA 미검수','테스트 천원의 아침밥','https://example.test/notice','pending');
set local role anon;
select results_eq(
  $$select id from search_published_discounts('테스트천원의아침밥')$$,
  $$values ('66000000-0000-4000-8000-000000000010'::uuid)$$,
  'Search without spaces matches Korean descriptions, excluding pending offers'
);
select results_eq(
  $$select id from search_published_discounts(E'spacingQA\t매장')$$,
  $$values ('66000000-0000-4000-8000-000000000010'::uuid)$$,
  'Case and whitespace variants match store names'
);
select is((select count(*) from search_published_discounts('테스트천원의아침밥%')),0::bigint,'Percent remains literal');
select throws_ok(
  $$select * from search_published_discounts(repeat('가 ', 101))$$,
  '22023', null, 'The input length limit applies before removing internal whitespace'
);
select * from finish();
rollback;
