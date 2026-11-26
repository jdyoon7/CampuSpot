alter table public.discount_reports
  add column withdrawn_at timestamptz,
  add column publication_revision integer not null default 0;

create type public.discount_correction_kind as enum ('edit', 'ended', 'incorrect');

create table public.discount_corrections (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.discount_reports(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  kind public.discount_correction_kind not null,
  report_note text not null check (char_length(report_note) between 1 and 500 and report_note ~ '[^[:space:]]'),
  proposed_details text,
  store_name text not null,
  current_details text not null,
  source_url text not null,
  offer_revision integer not null,
  status public.discount_report_status not null default 'pending',
  rejection_reason text,
  reviewer_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (
    (kind = 'edit' and proposed_details is not null and char_length(proposed_details) between 1 and 2000
      and proposed_details ~ '[^[:space:]]' and proposed_details <> current_details)
    or (kind <> 'edit' and proposed_details is null)
  ),
  check ((status = 'pending' and reviewed_at is null) or (status <> 'pending' and reviewed_at is not null)),
  check (
    (status = 'rejected' and rejection_reason is not null and char_length(rejection_reason) between 1 and 500
      and rejection_reason ~ '[^[:space:]]')
    or (status <> 'rejected' and rejection_reason is null)
  )
);

create unique index discount_corrections_one_pending
  on public.discount_corrections(offer_id, reporter_id) where status = 'pending';
create index discount_corrections_offer on public.discount_corrections(offer_id);
create index discount_corrections_author on public.discount_corrections(reporter_id, created_at desc, id desc);
create index discount_corrections_reviewer on public.discount_corrections(reviewer_id);
create index discount_corrections_queue on public.discount_corrections(created_at, id) where status = 'pending';

alter table public.discount_corrections enable row level security;
revoke all on public.discount_corrections from public, anon, authenticated;
grant select on public.discount_corrections to authenticated;
grant all on public.discount_corrections to service_role;
create policy corrections_read_own on public.discount_corrections for select to authenticated
  using (reporter_id = (select auth.uid()));
create policy corrections_review_queue on public.discount_corrections for select to authenticated
  using (status = 'pending' and ((select public.has_my_role('admin')) or (select public.has_my_role('super_admin'))));

create function public.submit_discount_correction(
  p_offer_id uuid, p_kind public.discount_correction_kind, p_note text, p_details text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  note text := nullif(regexp_replace(p_note, '^[[:space:]]+|[[:space:]]+$', '', 'g'), '');
  details text := nullif(regexp_replace(p_details, '^[[:space:]]+|[[:space:]]+$', '', 'g'), '');
  offer public.discount_reports%rowtype;
begin
  if actor is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_kind is null or note is null or char_length(note) > 500 or
     (p_kind = 'edit' and (details is null or char_length(details) > 2000)) or
     (p_kind <> 'edit' and details is not null) then
    raise exception using errcode = '22023', message = 'invalid correction';
  end if;
  select * into offer from public.discount_reports r
  where r.id = p_offer_id and r.status = 'approved' and r.withdrawn_at is null
    and (r.ends_on is null or r.ends_on >= (now() at time zone 'Asia/Seoul')::date)
  for share;
  if not found then
    raise exception using errcode = 'P0002', message = 'offer unavailable';
  end if;
  if details = offer.details then
    raise exception using errcode = '22023', message = 'details unchanged';
  end if;
  insert into public.discount_corrections
    (offer_id, reporter_id, kind, report_note, proposed_details, store_name, current_details, source_url, offer_revision)
  values (offer.id, actor, p_kind, note, details, offer.store_name, offer.details, offer.source_url, offer.publication_revision);
end $$;

create function public.review_discount_correction(
  p_correction_id uuid, p_decision public.discount_report_status, p_reason text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  reason text := nullif(regexp_replace(p_reason, '^[[:space:]]+|[[:space:]]+$', '', 'g'), '');
  correction public.discount_corrections%rowtype;
  decided_at timestamptz := statement_timestamp();
begin
  if actor is null or not (public.has_my_role('admin') or public.has_my_role('super_admin')) then
    raise exception using errcode = '42501', message = 'review permission required';
  end if;
  if p_decision is null or p_decision = 'pending'
     or (p_decision = 'approved' and reason is not null)
     or (p_decision = 'rejected' and (reason is null or char_length(reason) > 500)) then
    raise exception using errcode = '22023', message = 'invalid review decision';
  end if;
  select * into correction from public.discount_corrections c
  where c.id = p_correction_id and c.status = 'pending' and c.reporter_id <> actor
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'no eligible pending correction';
  end if;
  if p_decision = 'approved' then
    update public.discount_reports r
    set details = case when correction.kind = 'edit' then correction.proposed_details else r.details end,
        withdrawn_at = case when correction.kind <> 'edit' then decided_at else null end,
        reviewed_at = decided_at,
        publication_revision = r.publication_revision + 1
    where r.id = correction.offer_id and r.status = 'approved' and r.withdrawn_at is null
      and r.publication_revision = correction.offer_revision
      and (r.ends_on is null or r.ends_on >= (now() at time zone 'Asia/Seoul')::date);
    if not found then
      raise exception using errcode = '55000', message = 'offer changed since submission';
    end if;
  end if;
  update public.discount_corrections
  set status = p_decision, reviewer_id = actor, reviewed_at = decided_at, rejection_reason = reason
  where id = correction.id;
end $$;

revoke all on function public.submit_discount_correction(uuid,public.discount_correction_kind,text,text) from public, anon, authenticated;
grant execute on function public.submit_discount_correction(uuid,public.discount_correction_kind,text,text) to authenticated;
revoke all on function public.review_discount_correction(uuid,public.discount_report_status,text) from public, anon, authenticated;
grant execute on function public.review_discount_correction(uuid,public.discount_report_status,text) to authenticated;

create or replace function public.search_published_discounts(
  p_query text default '', p_today_only boolean default false,
  p_ending_soon boolean default false, p_limit integer default 20, p_offset integer default 0
) returns table(id uuid, store_name text, details text, source_url text,
                starts_on date, ends_on date, verified_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  term text := lower(btrim(coalesce(p_query,'')));
  today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if char_length(term)>100 then
    raise exception using errcode='22023', message='search query too long';
  end if;
  return query
    select r.id,r.store_name,r.details,r.source_url,r.starts_on,r.ends_on,coalesce(r.reviewed_at,r.updated_at)
    from public.discount_reports r
    where r.status='approved' and r.withdrawn_at is null
      and (r.ends_on is null or r.ends_on>=today)
      and (not coalesce(p_today_only,false) or r.starts_on is null or r.starts_on<=today)
      and (not coalesce(p_ending_soon,false) or r.ends_on between today and today+6)
      and (term='' or strpos(lower(r.store_name),term)>0 or strpos(lower(r.details),term)>0)
    order by coalesce(r.reviewed_at,r.updated_at) desc,r.id desc
    limit greatest(1,least(coalesce(p_limit,20),100)) offset greatest(0,coalesce(p_offset,0));
end $$;

create or replace function public.list_discount_calendar(
  p_day date, p_limit integer default 20, p_offset integer default 0
) returns table(id uuid, store_name text, details text, source_url text,
                starts_on date, ends_on date, verified_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.store_name, r.details, r.source_url, r.starts_on, r.ends_on,
         coalesce(r.reviewed_at, r.updated_at)
  from public.discount_reports r
  where p_day >= (now() at time zone 'Asia/Seoul')::date
    and r.status = 'approved' and r.withdrawn_at is null
    and (r.starts_on is null or r.starts_on <= p_day)
    and (r.ends_on is null or r.ends_on >= p_day)
  order by coalesce(r.reviewed_at, r.updated_at) desc, r.id desc
  limit greatest(1, least(coalesce(p_limit, 20), 100))
  offset greatest(0, coalesce(p_offset, 0))
$$;
