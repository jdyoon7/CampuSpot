alter table public.discount_reports
  add column discount_percent integer check (discount_percent between 1 and 100),
  add column discount_amount integer check (discount_amount between 1 and 100000000),
  add column available_from time,
  add column available_until time,
  add column target_university_id uuid references public.universities(id) on delete restrict,
  add column target_department_id uuid references public.departments(id) on delete restrict,
  add column is_partnership boolean not null default false,
  add constraint discount_one_value check (discount_percent is null or discount_amount is null),
  add constraint discount_offering_hours check (
    (available_from is null and available_until is null)
    or (available_from is not null and available_until is not null and available_from < available_until)
  ),
  add constraint discount_department_requires_school check (target_department_id is null or target_university_id is not null);

create function public.set_discount_offer_terms(
  p_id uuid,p_percent integer default null,p_amount integer default null,
  p_from time default null,p_until time default null,p_school uuid default null,
  p_department uuid default null,p_partner boolean default false
) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not (public.has_my_role('admin') or public.has_my_role('super_admin')) then
    raise exception using errcode='42501',message='admin required';
  end if;
  if p_department is not null and not exists (
    select 1 from public.departments d join public.campuses c on c.id=d.campus_id
    where d.id=p_department and c.university_id=p_school
  ) then raise exception using errcode='22023',message='department and school do not match'; end if;
  update public.discount_reports set discount_percent=p_percent,discount_amount=p_amount,
    available_from=p_from,available_until=p_until,target_university_id=p_school,
    target_department_id=p_department,is_partnership=coalesce(p_partner,false)
  where id=p_id and status='approved' and withdrawn_at is null;
  if not found then raise exception using errcode='P0002',message='offer unavailable'; end if;
end $$;

create function public.search_discount_catalog_ranked(
  p_query text default '',p_today_only boolean default false,p_ending_soon boolean default false,
  p_limit integer default 20,p_offset integer default 0,p_university_id uuid default null,
  p_region text default null,p_category public.business_category default null,
  p_now_only boolean default false,p_partner_only boolean default false,p_sort text default 'recent'
) returns table(id uuid,store_name text,details text,source_url text,starts_on date,ends_on date,verified_at timestamptz,
  discount_percent integer,discount_amount integer,available_from time,available_until time,
  target_university_id uuid,target_department_id uuid,target_campus_id uuid,target_school text,target_department text,is_partnership boolean)
language plpgsql stable security definer set search_path='' as $$
declare
  term text := regexp_replace(lower(btrim(coalesce(p_query,''))),'[[:space:]]+','','g');
  local_now timestamp := now() at time zone 'Asia/Seoul';
  today date := local_now::date;
begin
  if char_length(btrim(coalesce(p_query,'')))>100 or char_length(p_region)>80
     or p_sort is null or p_sort not in ('recent','percent','amount','popular') then
    raise exception using errcode='22023',message='invalid search';
  end if;
  return query
  select r.id,r.store_name,r.details,r.source_url,r.starts_on,r.ends_on,coalesce(r.reviewed_at,r.updated_at),
    r.discount_percent,r.discount_amount,r.available_from,r.available_until,
    r.target_university_id,r.target_department_id,d.campus_id,u.name,d.name,r.is_partnership
  from public.discount_reports r
  left join public.businesses b on b.id=r.business_id
  left join public.universities u on u.id=r.target_university_id
  left join public.departments d on d.id=r.target_department_id
  where r.status='approved' and r.withdrawn_at is null and (r.ends_on is null or r.ends_on>=today)
    and (not (coalesce(p_today_only,false) or coalesce(p_now_only,false)) or (
      (r.starts_on is null or r.starts_on<=today)
      and (r.available_weekdays is null or extract(isodow from today)::integer=any(r.available_weekdays))
    ))
    and (not coalesce(p_now_only,false) or (
      r.available_from is not null and local_now::time>=r.available_from and local_now::time<r.available_until
    ))
    and (not coalesce(p_ending_soon,false) or r.ends_on between today and today+6)
    and (not coalesce(p_partner_only,false) or r.is_partnership)
    and (p_university_id is null or b.nearby_university_id=p_university_id or r.target_university_id=p_university_id)
    and (p_region is null or b.region=p_region)
    and (p_category is null or b.category=p_category)
    and (term='' or strpos(regexp_replace(lower(r.store_name),'[[:space:]]+','','g'),term)>0
      or strpos(regexp_replace(lower(r.details),'[[:space:]]+','','g'),term)>0)
  order by case when p_sort='percent' then r.discount_percent end desc nulls last,
    case when p_sort='amount' then r.discount_amount end desc nulls last,
    case when p_sort='popular' then (select count(*) from public.discount_offer_bookmarks x where x.offer_id=r.id) end desc nulls last,
    coalesce(r.reviewed_at,r.updated_at) desc,r.id desc
  limit greatest(1,least(coalesce(p_limit,20),100)) offset greatest(0,coalesce(p_offset,0));
end $$;

-- Include explicitly eligible schools for online offers as well as nearby schools for physical branches.
create or replace function public.list_discount_catalog_filters()
returns table(dimension text,value text,label text)
language sql stable security definer set search_path='' as $$
  with active as (
    select b.nearby_university_id,r.target_university_id,b.region,b.category
    from public.discount_reports r left join public.businesses b on b.id=r.business_id
    where r.status='approved' and r.withdrawn_at is null
      and (r.ends_on is null or r.ends_on >= (now() at time zone 'Asia/Seoul')::date)
  )
  select 'university',u.id::text,u.name from active a join public.universities u
    on u.id=a.nearby_university_id or u.id=a.target_university_id
  union select 'region',a.region,a.region from active a where a.region is not null
  union select 'category',a.category::text,a.category::text from active a where a.category is not null
  order by 1,3,2
$$;
revoke all on function public.set_discount_offer_terms(uuid,integer,integer,time,time,uuid,uuid,boolean),
  public.search_discount_catalog_ranked(text,boolean,boolean,integer,integer,uuid,text,public.business_category,boolean,boolean,text) from public,anon,authenticated;
grant execute on function public.set_discount_offer_terms(uuid,integer,integer,time,time,uuid,uuid,boolean) to authenticated;
grant execute on function public.search_discount_catalog_ranked(text,boolean,boolean,integer,integer,uuid,text,public.business_category,boolean,boolean,text) to anon,authenticated;
