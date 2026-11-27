create type public.business_category as enum ('food','cafe','retail','culture','health','services','other');
alter table public.businesses
  add column nearby_university_id uuid references public.universities(id) on delete set null,
  add column region text check (region is null or (
    char_length(region) between 1 and 80 and region = btrim(region) and region ~ '[^[:space:]]'
  )),
  add column category public.business_category;
create index businesses_nearby_university on public.businesses(nearby_university_id);
grant select (nearby_university_id,region,category) on public.businesses to anon, authenticated;

create function public.set_business_discovery(
  p_business_id uuid, p_university_id uuid default null, p_region text default null,
  p_category public.business_category default null
) returns void language plpgsql security definer set search_path = '' as $$
declare clean_region text := nullif(btrim(regexp_replace(p_region, '[[:space:]]+', ' ', 'g')), '');
begin
  if auth.uid() is null or not (public.has_my_role('admin') or public.has_my_role('super_admin')) then
    raise exception using errcode='42501', message='admin role required';
  end if;
  if p_business_id is null or char_length(clean_region)>80 then
    raise exception using errcode='22023', message='invalid business classification';
  end if;
  update public.businesses set nearby_university_id=p_university_id, region=clean_region, category=p_category
  where id=p_business_id;
  if not found then raise exception using errcode='P0002', message='business not found'; end if;
end $$;

create function public.search_discount_catalog(
  p_query text default '', p_today_only boolean default false, p_ending_soon boolean default false,
  p_limit integer default 20, p_offset integer default 0,
  p_university_id uuid default null, p_region text default null, p_category public.business_category default null
) returns table(id uuid,store_name text,details text,source_url text,starts_on date,ends_on date,verified_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  input_term text := btrim(coalesce(p_query,''));
  term text;
  today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if char_length(input_term)>100 or char_length(p_region)>80 then
    raise exception using errcode='22023', message='search input too long';
  end if;
  term := regexp_replace(lower(input_term),'[[:space:]]+','','g');
  return query
    select r.id,r.store_name,r.details,r.source_url,r.starts_on,r.ends_on,coalesce(r.reviewed_at,r.updated_at)
    from public.discount_reports r
    left join public.businesses b on b.id=r.business_id
    where r.status='approved' and r.withdrawn_at is null
      and (r.ends_on is null or r.ends_on>=today)
      and (not coalesce(p_today_only,false) or (
        (r.starts_on is null or r.starts_on<=today)
        and (r.available_weekdays is null or extract(isodow from today)::integer = any(r.available_weekdays))
      ))
      and (not coalesce(p_ending_soon,false) or r.ends_on between today and today+6)
      and (p_university_id is null or b.nearby_university_id=p_university_id)
      and (p_region is null or b.region=p_region)
      and (p_category is null or b.category=p_category)
      and (term='' or strpos(regexp_replace(lower(r.store_name),'[[:space:]]+','','g'),term)>0
        or strpos(regexp_replace(lower(r.details),'[[:space:]]+','','g'),term)>0)
    order by coalesce(r.reviewed_at,r.updated_at) desc,r.id desc
    limit greatest(1,least(coalesce(p_limit,20),100)) offset greatest(0,coalesce(p_offset,0));
end $$;

create or replace function public.search_published_discounts(
  p_query text default '', p_today_only boolean default false,
  p_ending_soon boolean default false,p_limit integer default 20,p_offset integer default 0
) returns table(id uuid,store_name text,details text,source_url text,starts_on date,ends_on date,verified_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select * from public.search_discount_catalog(p_query,p_today_only,p_ending_soon,p_limit,p_offset)
$$;

create function public.list_discount_catalog_filters()
returns table(dimension text,value text,label text)
language sql stable security definer set search_path = '' as $$
  with active as (
    select b.nearby_university_id,b.region,b.category
    from public.businesses b
    where exists (
      select 1 from public.discount_reports r
      where r.business_id=b.id and r.status='approved' and r.withdrawn_at is null
        and (r.ends_on is null or r.ends_on >= (now() at time zone 'Asia/Seoul')::date)
    )
  )
  select 'university',u.id::text,u.name
    from active a join public.universities u on u.id=a.nearby_university_id
  union
  select 'region',a.region,a.region from active a where a.region is not null
  union
  select 'category',a.category::text,a.category::text from active a where a.category is not null
  order by 1,3,2
$$;

revoke all on function public.set_business_discovery(uuid,uuid,text,public.business_category),
  public.search_discount_catalog(text,boolean,boolean,integer,integer,uuid,text,public.business_category),
  public.list_discount_catalog_filters() from public,anon,authenticated;
grant execute on function public.set_business_discovery(uuid,uuid,text,public.business_category) to authenticated;
grant execute on function public.search_discount_catalog(text,boolean,boolean,integer,integer,uuid,text,public.business_category),
  public.list_discount_catalog_filters() to anon,authenticated;
