begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
set local timezone = 'America/Los_Angeles';
select plan(5);

insert into auth.users(id) values ('62000000-0000-4000-8000-000000000001');
with clock as (select (now() at time zone 'Asia/Seoul')::date as today)
insert into discount_reports(reporter_id, store_name, details, source_url, starts_on, ends_on, status, reviewed_at)
select '62000000-0000-4000-8000-000000000001', 'Calendar QA ' || fixture.name,
       '학생 할인', 'https://example.test/notice', today + fixture.start_offset,
       today + fixture.end_offset, fixture.status::discount_report_status,
       now() + (1 + fixture.rank) * interval '1 year'
from clock cross join (values
  ('ongoing', null::int, null::int, 'approved', 1),
  ('today', 0, 0, 'approved', 2),
  ('future', 1, 2, 'approved', 3),
  ('expired', -2, -1, 'approved', 4),
  ('pending', 0, 2, 'pending', 5),
  ('rejected', 0, 2, 'rejected', 6)
) fixture(name, start_offset, end_offset, status, rank);

set local role anon;
select results_eq(
  $$select store_name from list_discount_calendar((now() at time zone 'Asia/Seoul')::date)
    where store_name like 'Calendar QA %'$$,
  $$values ('Calendar QA today'::text), ('Calendar QA ongoing')$$,
  'Anonymous today view includes only approved offers, inclusive of both date bounds'
);
select results_eq(
  $$select store_name from list_discount_calendar((now() at time zone 'Asia/Seoul')::date + 2)
    where store_name like 'Calendar QA %'$$,
  $$values ('Calendar QA future'::text), ('Calendar QA ongoing')$$,
  'Future day includes offers active on that day and ongoing offers'
);
select is(
  (select count(*) from list_discount_calendar((now() at time zone 'Asia/Seoul')::date - 1)),
  0::bigint,
  'Past dates are unavailable'
);
select is(
  (select count(*) from list_discount_calendar(null)),
  0::bigint,
  'Null dates are unavailable'
);
select results_eq(
  $$select store_name from list_discount_calendar((now() at time zone 'Asia/Seoul')::date + 2, 1, 1)$$,
  $$values ('Calendar QA ongoing'::text)$$,
  'Pagination runs after date and approval filters'
);
select * from finish();
rollback;
