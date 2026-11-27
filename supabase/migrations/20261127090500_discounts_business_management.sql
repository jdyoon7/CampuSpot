create table public.discount_business_menu_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (name=btrim(name) and char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description)<=300),
  price_krw integer not null check (price_krw between 0 and 100000000),
  created_at timestamptz not null default now()
);
create index discount_menu_by_business on public.discount_business_menu_items(business_id,created_at,id);
alter table public.discount_business_menu_items enable row level security;
revoke all on public.discount_business_menu_items from public,anon,authenticated;
grant select on public.discount_business_menu_items to anon,authenticated;
create policy discount_menu_public on public.discount_business_menu_items for select to anon,authenticated using (true);

create function public.save_discount_menu_item(p_business uuid,p_name text,p_price integer,p_description text default '',p_id uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare item uuid;
begin
  perform 1 from public.businesses where id=p_business for update;
  if not core_private.owns_discount_business(p_business) then
    raise exception using errcode='42501',message='operator required';
  end if;
  if p_id is null then
    insert into public.discount_business_menu_items(business_id,name,price_krw,description)
    values(p_business,btrim(p_name),p_price,btrim(coalesce(p_description,''))) returning id into item;
  else
    update public.discount_business_menu_items set name=btrim(p_name),
      price_krw=p_price,description=btrim(coalesce(p_description,''))
    where id=p_id and business_id=p_business returning id into item;
    if not found then raise exception using errcode='P0002',message='menu item not found'; end if;
  end if;
  return item;
end $$;

create function public.remove_discount_menu_item(p_business uuid,p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.businesses where id=p_business for update;
  if not core_private.owns_discount_business(p_business) then
    raise exception using errcode='42501',message='operator required';
  end if;
  delete from public.discount_business_menu_items where id=p_id and business_id=p_business;
end $$;

create table core_private.discount_business_daily_events (
  business_id uuid not null references public.businesses(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('view','official_click')),
  primary key (business_id,member_id,day,kind)
);
create index discount_business_events_by_day on core_private.discount_business_daily_events(business_id,day,kind);
alter table core_private.discount_business_daily_events enable row level security;
revoke all on core_private.discount_business_daily_events from public,anon,authenticated;

create function public.record_discount_business_event(p_business uuid,p_kind text) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
  if actor is null then raise exception using errcode='42501',message='member required'; end if;
  if p_kind is null or p_kind not in ('view','official_click') then
    raise exception using errcode='22023',message='invalid event';
  end if;
  if core_private.owns_discount_business(p_business) then return; end if;
  insert into core_private.discount_business_daily_events(business_id,member_id,day,kind)
  select id,actor,(now() at time zone 'Asia/Seoul')::date,p_kind
  from public.businesses where id=p_business
  on conflict do nothing;
end $$;

create function public.get_owned_discount_business_stats(p_business uuid)
returns table(views_30d bigint,official_clicks_30d bigint,coupons_issued bigint,coupons_redeemed bigint)
language plpgsql stable security definer set search_path='' as $$
begin
  if not core_private.owns_discount_business(p_business) then
    raise exception using errcode='42501',message='operator required';
  end if;
  return query select
    count(*) filter (where kind='view'),
    count(*) filter (where kind='official_click'),
    (select coalesce(sum(c.issued_count),0) from public.discount_coupon_campaigns c where c.business_id=p_business),
    (select coalesce(sum(c.redeemed_count),0) from public.discount_coupon_campaigns c where c.business_id=p_business)
  from core_private.discount_business_daily_events e
  where e.business_id=p_business and e.day between (now() at time zone 'Asia/Seoul')::date-29 and (now() at time zone 'Asia/Seoul')::date;
end $$;

create table public.discount_business_schedule_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  offer_id uuid not null references public.discount_reports(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  offer_name text not null,
  base_starts_on date,
  base_ends_on date,
  base_weekdays integer[],
  base_available_from time,
  base_available_until time,
  starts_on date,
  ends_on date,
  weekdays integer[] check (weekdays is null or (
    array_ndims(weekdays)=1 and cardinality(weekdays) between 1 and 7 and weekdays <@ array[1,2,3,4,5,6,7]
  )),
  available_from time,
  available_until time,
  note text not null check (char_length(note) between 1 and 500),
  decision text not null default 'pending' check (decision in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check ((starts_on is null and ends_on is null) or (
    starts_on is not null and ends_on is not null and starts_on>=date '0001-01-01' and ends_on<=date '9999-12-31' and starts_on<=ends_on
  )),
  check ((available_from is null and available_until is null) or (
    available_from is not null and available_until is not null and available_from<available_until
  ))
);
create unique index schedule_request_open on public.discount_business_schedule_requests(offer_id) where decision='pending';
create index schedule_request_history on public.discount_business_schedule_requests(business_id,created_at desc,id);
alter table public.discount_business_schedule_requests enable row level security;
revoke all on public.discount_business_schedule_requests from public,anon,authenticated;
grant select on public.discount_business_schedule_requests to authenticated;
create policy schedule_request_read on public.discount_business_schedule_requests for select to authenticated
using (requested_by=(select auth.uid()) or (select public.has_my_role('admin')) or (select public.has_my_role('super_admin')));

create function public.request_discount_schedule(
  p_business uuid,p_offer uuid,p_note text,p_start date default null,p_end date default null,
  p_days integer[] default null,p_from time default null,p_until time default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare target public.discount_reports%rowtype;
  request_id uuid;
  days integer[];
begin
  perform 1 from public.businesses where id=p_business for update;
  if not core_private.owns_discount_business(p_business) then
    raise exception using errcode='42501',message='operator required';
  end if;
  select * into target from public.discount_reports where id=p_offer and business_id=p_business
    and status='approved' and withdrawn_at is null for share;
  if not found then raise exception using errcode='P0002',message='offer unavailable'; end if;
  if p_days is not null then
    if cardinality(p_days) not between 1 and 7 or array_ndims(p_days)<>1 or
      exists (select 1 from unnest(p_days) d where d is null or d not between 1 and 7) then
      raise exception using errcode='22023',message='invalid weekdays';
    end if;
    select array_agg(distinct d order by d) into days from unnest(p_days) d;
  end if;
  if row(target.starts_on,target.ends_on,target.available_weekdays,target.available_from,target.available_until)
      is not distinct from row(p_start,p_end,days,p_from,p_until) then
    raise exception using errcode='22023',message='no schedule change';
  end if;
  insert into public.discount_business_schedule_requests
    (business_id,offer_id,requested_by,offer_name,base_starts_on,base_ends_on,base_weekdays,base_available_from,base_available_until,
      starts_on,ends_on,weekdays,available_from,available_until,note)
  values(p_business,p_offer,auth.uid(),target.store_name,target.starts_on,target.ends_on,target.available_weekdays,
    target.available_from,target.available_until,p_start,p_end,days,p_from,p_until,btrim(p_note))
  returning id into request_id;
  return request_id;
end $$;

create function public.review_discount_schedule(p_request uuid,p_approve boolean) returns void
language plpgsql security definer set search_path='' as $$
declare proposed public.discount_business_schedule_requests%rowtype;
begin
  if auth.uid() is null or not (public.has_my_role('admin') or public.has_my_role('super_admin')) then
    raise exception using errcode='42501',message='admin required';
  end if;
  if p_approve is null then raise exception using errcode='22023',message='decision required'; end if;
  select * into proposed from public.discount_business_schedule_requests where id=p_request and decision='pending';
  if not found then raise exception using errcode='P0002',message='request unavailable'; end if;
  perform 1 from public.businesses where id=proposed.business_id for update;
  select * into proposed from public.discount_business_schedule_requests where id=p_request and decision='pending' for update;
  if not found then raise exception using errcode='P0002',message='request unavailable'; end if;
  if proposed.requested_by=auth.uid() then raise exception using errcode='42501',message='self review denied'; end if;
  if p_approve then
    if not exists (select 1 from public.business_operator_requests
      where business_id=proposed.business_id and requested_by=proposed.requested_by and status='approved') then
      raise exception using errcode='55000',message='operator changed';
    end if;
    update public.discount_reports set starts_on=proposed.starts_on,ends_on=proposed.ends_on,available_weekdays=proposed.weekdays,
      available_from=proposed.available_from,available_until=proposed.available_until
    where id=proposed.offer_id and business_id=proposed.business_id and status='approved' and withdrawn_at is null
      and row(starts_on,ends_on,available_weekdays,available_from,available_until) is not distinct from
          row(proposed.base_starts_on,proposed.base_ends_on,proposed.base_weekdays,proposed.base_available_from,proposed.base_available_until);
    if not found then raise exception using errcode='55000',message='schedule changed'; end if;
  end if;
  update public.discount_business_schedule_requests set decision=case when p_approve then 'approved' else 'rejected' end,
    reviewed_by=auth.uid(),reviewed_at=now() where id=p_request;
end $$;

create function public.list_owned_discount_schedules(p_business uuid,p_limit integer default 20,p_offset integer default 0)
returns table(id uuid,store_name text,starts_on date,ends_on date,weekdays integer[],available_from time,available_until time,request_status text)
language plpgsql stable security definer set search_path='' as $$
begin
  if not core_private.owns_discount_business(p_business) then
    raise exception using errcode='42501',message='operator required';
  end if;
  return query select r.id,r.store_name,r.starts_on,r.ends_on,r.available_weekdays,r.available_from,r.available_until,
    (select q.decision from public.discount_business_schedule_requests q
      where q.offer_id=r.id and q.requested_by=auth.uid() order by q.created_at desc,q.id limit 1)
  from public.discount_reports r
  where r.business_id=p_business and r.status='approved' and r.withdrawn_at is null
  order by r.reviewed_at desc nulls last,r.id
  limit greatest(1,least(coalesce(p_limit,20),100)) offset greatest(0,coalesce(p_offset,0));
end $$;

revoke all on function public.save_discount_menu_item(uuid,text,integer,text,uuid),public.remove_discount_menu_item(uuid,uuid),
  public.record_discount_business_event(uuid,text),public.get_owned_discount_business_stats(uuid),
  public.request_discount_schedule(uuid,uuid,text,date,date,integer[],time,time),
  public.review_discount_schedule(uuid,boolean),public.list_owned_discount_schedules(uuid,integer,integer)
  from public,anon,authenticated;
grant execute on function public.save_discount_menu_item(uuid,text,integer,text,uuid),public.remove_discount_menu_item(uuid,uuid),
  public.record_discount_business_event(uuid,text),public.get_owned_discount_business_stats(uuid),
  public.request_discount_schedule(uuid,uuid,text,date,date,integer[],time,time),
  public.review_discount_schedule(uuid,boolean),public.list_owned_discount_schedules(uuid,integer,integer) to authenticated;
