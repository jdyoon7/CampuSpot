create function public.list_discount_calendar(
  p_day date, p_limit integer default 20, p_offset integer default 0
) returns table(id uuid, store_name text, details text, source_url text,
                starts_on date, ends_on date, verified_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.store_name, r.details, r.source_url, r.starts_on, r.ends_on,
         coalesce(r.reviewed_at, r.updated_at)
  from public.discount_reports r
  where p_day >= (now() at time zone 'Asia/Seoul')::date
    and r.status = 'approved'
    and (r.starts_on is null or r.starts_on <= p_day)
    and (r.ends_on is null or r.ends_on >= p_day)
  order by coalesce(r.reviewed_at, r.updated_at) desc, r.id desc
  limit greatest(1, least(coalesce(p_limit, 20), 100))
  offset greatest(0, coalesce(p_offset, 0))
$$;

revoke all on function public.list_discount_calendar(date,integer,integer) from public, anon, authenticated;
grant execute on function public.list_discount_calendar(date,integer,integer) to anon, authenticated;
