alter table public.discount_reports
  add column rejection_reason text check (
    rejection_reason is null or
    (status='rejected' and char_length(rejection_reason) between 1 and 500 and rejection_reason ~ '[^[:space:]]')
  ),
  add column reviewed_at timestamptz;

create index discount_reports_queue on public.discount_reports(created_at,id) where status='pending';
create index discount_reports_published on public.discount_reports((coalesce(reviewed_at,updated_at)) desc,id desc) where status='approved';

-- A decision survives deletion of its report. Keep the free-text reason only in the private report.
create table core_private.discount_review_log (
  report_id uuid primary key,
  reviewer_id uuid references public.profiles(id) on delete set null,
  decision public.discount_report_status not null check (decision in ('approved','rejected')),
  decided_at timestamptz not null
);
create index on core_private.discount_review_log(reviewer_id);
alter table core_private.discount_review_log enable row level security;
revoke all on core_private.discount_review_log from public,anon,authenticated;

create policy reports_review_queue on public.discount_reports for select to authenticated
using (status='pending' and ((select public.has_my_role('admin')) or (select public.has_my_role('super_admin'))));

create function public.review_discount_report(
  p_report_id uuid, p_decision public.discount_report_status, p_reason text default null
) returns void language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  reason text := nullif(regexp_replace(p_reason,'^[[:space:]]+|[[:space:]]+$','','g'),'');
  decision_time timestamptz := statement_timestamp();
begin
  if actor is null or not (public.has_my_role('admin') or public.has_my_role('super_admin')) then
    raise exception using errcode='42501', message='review permission required';
  end if;
  if p_decision is null or p_decision='pending'
    or (p_decision='approved' and reason is not null)
    or (p_decision='rejected' and (reason is null or char_length(reason)>500)) then
    raise exception using errcode='22023', message='invalid review decision';
  end if;

  -- Concurrent UPDATEs recheck the pending predicate after acquiring the row lock.
  update public.discount_reports set status=p_decision, rejection_reason=reason, reviewed_at=decision_time
  where id=p_report_id and status='pending' and reporter_id<>actor;
  if not found then
    raise exception using errcode='P0002', message='no eligible pending report';
  end if;
  insert into core_private.discount_review_log(report_id, reviewer_id, decision, decided_at)
  values(p_report_id, actor, p_decision, decision_time);
end $$;
revoke all on function public.review_discount_report(uuid,public.discount_report_status,text) from public,anon,authenticated;
grant execute on function public.review_discount_report(uuid,public.discount_report_status,text) to authenticated;

-- Publish only the offer fields; raw submissions keep their existing owner/admin policies.
create function public.list_published_discounts(p_limit integer default 20,p_offset integer default 0)
returns table(id uuid, store_name text, details text, source_url text, starts_on date, ends_on date, verified_at timestamptz)
language sql stable security definer set search_path='' as $$
  select r.id,r.store_name,r.details,r.source_url,r.starts_on,r.ends_on,coalesce(r.reviewed_at,r.updated_at)
  from public.discount_reports r
  where r.status='approved' and (r.ends_on is null or r.ends_on >= (now() at time zone 'Asia/Seoul')::date)
  order by coalesce(r.reviewed_at,r.updated_at) desc,r.id desc
  limit greatest(1,least(coalesce(p_limit,20),100)) offset greatest(0,coalesce(p_offset,0))
$$;
revoke all on function public.list_published_discounts(integer,integer) from public,anon,authenticated;
grant execute on function public.list_published_discounts(integer,integer) to anon,authenticated;
