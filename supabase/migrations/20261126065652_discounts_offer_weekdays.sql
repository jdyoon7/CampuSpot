-- ISO weekdays: Monday = 1, Sunday = 7. NULL keeps existing daily behavior.
alter table public.discount_reports add column available_weekdays integer[]
  check (available_weekdays is null or (
    array_ndims(available_weekdays) = 1
    and cardinality(available_weekdays) > 0
    and available_weekdays <@ array[1,2,3,4,5,6,7]
  ));

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
      and (not coalesce(p_today_only,false) or (
        (r.starts_on is null or r.starts_on<=today)
        and (r.available_weekdays is null or extract(isodow from today)::integer = any(r.available_weekdays))
      ))
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
    and (r.available_weekdays is null or extract(isodow from p_day)::integer = any(r.available_weekdays))
  order by coalesce(r.reviewed_at, r.updated_at) desc, r.id desc
  limit greatest(1, least(coalesce(p_limit, 20), 100))
  offset greatest(0, coalesce(p_offset, 0))
$$;
