create table public.discount_alert_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  new_offer boolean not null default true,
  starting boolean not null default true,
  ending boolean not null default true
);
alter table public.discount_alert_preferences enable row level security;
revoke all on public.discount_alert_preferences from public,anon,authenticated;

create function public.get_my_discount_alert_preferences()
returns table(new_offer boolean,starting boolean,ending boolean)
language sql stable security definer set search_path='' as $$
  select coalesce(p.new_offer,true),coalesce(p.starting,true),coalesce(p.ending,true)
  from (select auth.uid() as user_id) u
  left join public.discount_alert_preferences p on p.user_id=u.user_id
  where u.user_id is not null
$$;

create function public.set_my_discount_alert_preferences(p_new_offer boolean,p_starting boolean,p_ending boolean)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
  if actor is null then raise exception using errcode='42501',message='member required'; end if;
  insert into public.discount_alert_preferences(user_id,new_offer,starting,ending)
  values(actor,p_new_offer,p_starting,p_ending)
  on conflict (user_id) do update set
    new_offer=excluded.new_offer,starting=excluded.starting,ending=excluded.ending;
end $$;
revoke all on function public.get_my_discount_alert_preferences(),public.set_my_discount_alert_preferences(boolean,boolean,boolean)
  from public,anon,authenticated;
grant execute on function public.get_my_discount_alert_preferences(),public.set_my_discount_alert_preferences(boolean,boolean,boolean)
  to authenticated;

create or replace function public.list_my_business_notifications(p_limit integer default 20,p_offset integer default 0)
returns table(business_id uuid,offer_id uuid,name text,branch_name text,store_name text,
  kind public.business_notification_kind,event_at timestamptz,starts_on date,ends_on date,read_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select e.business_id,e.offer_id,e.name,e.branch_name,e.store_name,e.kind,e.event_at,e.starts_on,e.ends_on,r.read_at
  from core_private.business_notification_events((select auth.uid())) e
  left join public.business_notification_reads r on r.user_id=(select auth.uid()) and r.business_id=e.business_id
    and r.offer_id=e.offer_id and r.kind=e.kind and r.event_at=e.event_at
  left join public.discount_alert_preferences p on p.user_id=(select auth.uid())
  where case e.kind when 'new_offer' then coalesce(p.new_offer,true)
    when 'starting' then coalesce(p.starting,true) when 'ending' then coalesce(p.ending,true) end
  order by e.event_at desc,e.business_id desc,e.offer_id desc,e.kind
  limit greatest(1,least(coalesce(p_limit,20),100)) offset greatest(0,coalesce(p_offset,0))
$$;

