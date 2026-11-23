create function public.search_published_discounts(
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
    where r.status='approved'
      and (r.ends_on is null or r.ends_on>=today)
      and (not coalesce(p_today_only,false) or r.starts_on is null or r.starts_on<=today)
      and (not coalesce(p_ending_soon,false) or r.ends_on between today and today+6)
      and (term='' or strpos(lower(r.store_name),term)>0 or strpos(lower(r.details),term)>0)
    order by coalesce(r.reviewed_at,r.updated_at) desc,r.id desc
    limit greatest(1,least(coalesce(p_limit,20),100)) offset greatest(0,coalesce(p_offset,0));
end $$;
revoke all on function public.search_published_discounts(text,boolean,boolean,integer,integer) from public,anon,authenticated;
grant execute on function public.search_published_discounts(text,boolean,boolean,integer,integer) to anon,authenticated;

-- Existing clients and the search UI use the same publication and expiry rules.
create or replace function public.list_published_discounts(p_limit integer default 20,p_offset integer default 0)
returns table(id uuid, store_name text, details text, source_url text, starts_on date, ends_on date, verified_at timestamptz)
language sql stable security invoker set search_path='' as $$
  select * from public.search_published_discounts('',false,false,p_limit,p_offset)
$$;
