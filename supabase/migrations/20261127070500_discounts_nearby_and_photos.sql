alter table public.businesses add column latitude double precision,
  add column longitude double precision,
  add constraint business_coordinate_pair check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null and latitude between -90 and 90 and longitude between -180 and 180)
  ),
  add column photo_path text check (photo_path is null or (
    split_part(photo_path,'/',1)=id::text
    and photo_path ~ '^[0-9a-f-]{36}/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\.png$'
  ));
create unique index business_photo_path on public.businesses(photo_path) where photo_path is not null;
grant select(latitude,longitude,photo_path) on public.businesses to anon,authenticated;

create function public.set_discount_business_coordinates(p_business uuid,p_lat double precision default null,p_lng double precision default null)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not (public.has_my_role('admin') or public.has_my_role('super_admin')) then
    raise exception using errcode='42501',message='admin required'; end if;
  update public.businesses set latitude=p_lat,longitude=p_lng where id=p_business;
  if not found then raise exception using errcode='P0002',message='business not found'; end if;
end $$;
revoke all on function public.set_discount_business_coordinates(uuid,double precision,double precision) from public,anon,authenticated;
grant execute on function public.set_discount_business_coordinates(uuid,double precision,double precision) to authenticated;

create function public.search_discount_catalog_v2(
  p_query text default '',p_today_only boolean default false,p_ending_soon boolean default false,
  p_limit integer default 20,p_offset integer default 0,p_university_id uuid default null,
  p_region text default null,p_category public.business_category default null,
  p_now_only boolean default false,p_partner_only boolean default false,p_sort text default 'recent',
  p_lat double precision default null,p_lng double precision default null
) returns table(id uuid,store_name text,details text,source_url text,starts_on date,ends_on date,verified_at timestamptz,
  discount_percent integer,discount_amount integer,available_from time,available_until time,
  target_university_id uuid,target_department_id uuid,target_campus_id uuid,target_school text,target_department text,is_partnership boolean,distance_m integer,school_match boolean)
language plpgsql stable security definer set search_path='' as $$
declare
  term text := regexp_replace(lower(btrim(coalesce(p_query,''))),'[[:space:]]+','','g');
  local_now timestamp := now() at time zone 'Asia/Seoul';
  today date := local_now::date;
  school uuid;
  department uuid;
begin
  if char_length(btrim(coalesce(p_query,'')))>100 or char_length(p_region)>80
     or p_sort is null or p_sort not in ('recent','percent','amount','popular','distance','recommended')
     or (p_sort='distance' and (p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180)) then
    raise exception using errcode='22023',message='invalid search';
  end if;
  if p_sort='recommended' and auth.uid() is not null then
    select coalesce(public.my_verified_university(),p.university_id),
      case when public.my_verified_university() is null or public.my_verified_university()=p.university_id then p.department_id end
    into school,department from public.private_profiles p where p.id=auth.uid();
  end if;
  return query
  select r.id,r.store_name,r.details,r.source_url,r.starts_on,r.ends_on,coalesce(r.reviewed_at,r.updated_at),
    r.discount_percent,r.discount_amount,r.available_from,r.available_until,
    r.target_university_id,r.target_department_id,d.campus_id,u.name,d.name,r.is_partnership, geo.distance_m, matches.score>0
  from public.discount_reports r
  left join public.businesses b on b.id=r.business_id
  left join public.universities u on u.id=r.target_university_id
  left join public.departments d on d.id=r.target_department_id
  cross join lateral (select
    case when p_sort='distance' and b.latitude is not null then round(
      12742000.0 * asin(least(1.0,sqrt(
        power(sin(radians(b.latitude-p_lat)/2),2) +
        cos(radians(p_lat))*cos(radians(b.latitude))*power(sin(radians(b.longitude-p_lng)/2),2)
      )))
    )::integer end as distance_m
  ) geo
  cross join lateral (select case when p_sort<>'recommended' then 0
    when r.target_university_id=school and r.target_department_id=department then 3
    when r.target_university_id=school and r.target_department_id is null then 2
    when r.target_university_id is null and b.nearby_university_id=school then 1
    else 0 end as score
  ) matches
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
  order by matches.score desc,geo.distance_m asc nulls last,
    case when p_sort='percent' then r.discount_percent end desc nulls last,
    case when p_sort='amount' then r.discount_amount end desc nulls last,
    case when p_sort='popular' then (select count(*) from public.discount_offer_bookmarks x where x.offer_id=r.id) end desc nulls last,
    coalesce(r.reviewed_at,r.updated_at) desc,r.id desc
  limit greatest(1,least(coalesce(p_limit,20),100)) offset greatest(0,coalesce(p_offset,0));
end $$;


revoke all on function public.search_discount_catalog_v2(text,boolean,boolean,integer,integer,uuid,text,public.business_category,boolean,boolean,text,double precision,double precision) from public,anon,authenticated;
grant execute on function public.search_discount_catalog_v2(text,boolean,boolean,integer,integer,uuid,text,public.business_category,boolean,boolean,text,double precision,double precision) to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('business-photos','business-photos',false,2097152,array['image/png']);

create policy business_published_photo on storage.objects for select to anon,authenticated
using(bucket_id='business-photos' and exists(select 1 from public.businesses b where b.photo_path=storage.objects.name));

create function public.manage_discount_business_photo(
  p_actor uuid,p_business uuid,p_expected text,p_path text
) returns boolean language plpgsql security definer set search_path='' as $$
declare current_photo text;
begin
  select photo_path into current_photo from public.businesses where id=p_business for update;
  if not found or p_actor is null or not exists (
    select 1 from public.business_operator_requests
    where business_id=p_business and requested_by=p_actor and status='approved'
  ) then raise exception using errcode='42501',message='operator required'; end if;
  if current_photo is distinct from p_expected then return false; end if;
  if p_path is not null and not exists (
    select 1 from storage.objects where bucket_id='business-photos' and name=p_path
  ) then raise exception using errcode='22023',message='file not found'; end if;
  update public.businesses set photo_path=p_path where id=p_business;
  return true;
end $$;
revoke all on function public.manage_discount_business_photo(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.manage_discount_business_photo(uuid,uuid,text,text) to service_role;
