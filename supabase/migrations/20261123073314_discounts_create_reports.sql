create type public.discount_report_status as enum ('pending', 'approved', 'rejected');

create table public.discount_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  store_name text not null check (char_length(store_name) between 1 and 100 and store_name ~ '[^[:space:]]'),
  details text not null check (char_length(details) between 1 and 2000 and details ~ '[^[:space:]]'),
  source_url text not null check (
    char_length(source_url) <= 2048 and source_url !~ '[[:space:][:cntrl:]]'
    and position(chr(92) in source_url) = 0
    and source_url ~ '^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?([/?#].*)?$'
  ),
  starts_on date,
  ends_on date,
  constraint discount_report_period check (
    (starts_on is null and ends_on is null)
    or (starts_on is not null and ends_on is not null and starts_on <= ends_on
        and starts_on >= date '0001-01-01' and ends_on <= date '9999-12-31')
  ),
  status public.discount_report_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index discount_reports_by_reporter on public.discount_reports(reporter_id,created_at desc,id desc);
-- Keep repeated/concurrent submissions from duplicating an identical pending report.
create unique index discount_reports_pending_unique on public.discount_reports
  (reporter_id, lower(btrim(store_name)), md5(btrim(details)), md5(source_url), starts_on, ends_on)
  nulls not distinct where status='pending';
create trigger touch_updated_at before update on public.discount_reports
  for each row execute function core_private.touch_updated_at();

alter table public.discount_reports enable row level security;
revoke all on public.discount_reports from public, anon, authenticated;
grant select on public.discount_reports to authenticated;
grant insert (reporter_id,store_name,details,source_url,starts_on,ends_on) on public.discount_reports to authenticated;
grant all on public.discount_reports to service_role;
create policy reports_submit on public.discount_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status='pending');
create policy reports_read_own on public.discount_reports for select to authenticated
  using (reporter_id = (select auth.uid()));
