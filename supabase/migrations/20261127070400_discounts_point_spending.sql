alter table public.discount_coupon_campaigns
  add column points_cost integer not null default 0 check (points_cost between 0 and 100000);

alter table public.point_ledger
  drop constraint point_ledger_source_check,
  drop constraint point_ledger_amount_check,
  drop constraint point_ledger_source_source_id_key,
  add column memo text check (char_length(memo)<=500),
  add column performed_by uuid references public.profiles(id) on delete set null,
  add constraint point_ledger_transaction_kind check (
    (source='discount_report' and amount>0) or (source in ('coupon_spend','reward_revoke') and amount<0)
  ),
  add constraint point_ledger_user_source_id unique(user_id,source,source_id);
grant select(memo) on public.point_ledger to authenticated;

create function core_private.lock_discount_points(p_actor uuid) returns void
language sql volatile strict set search_path='' as $$
  select pg_advisory_xact_lock(hashtextextended(p_actor::text, 742012))
$$;
revoke all on function core_private.lock_discount_points(uuid) from public,anon,authenticated;

create or replace function core_private.reward_approved_discount() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.decision='approved' then
    perform core_private.lock_discount_points((select reporter_id from public.discount_reports where id=new.report_id));
    insert into public.point_ledger(user_id,source,source_id,reward_key,amount,memo)
    select r.reporter_id,'discount_report',r.id,
      md5(jsonb_build_array(lower(btrim(r.store_name)),btrim(r.details),r.source_url,r.starts_on,r.ends_on)::text),100,r.store_name
    from public.discount_reports r
    where r.id=new.report_id and r.status='approved' and not r.submitted_by_operator
    on conflict do nothing;
  end if;
  return new;
end $$;
create or replace function public.claim_discount_coupon(p_campaign uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid := auth.uid();
  campaign public.discount_coupon_campaigns%rowtype;
  result uuid;
  today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if actor is null then raise exception using errcode='42501',message='authentication required'; end if;
  select * into campaign from public.discount_coupon_campaigns where id=p_campaign for update;
  if not found then raise exception using errcode='P0002',message='coupon missing'; end if;
  select code into result from public.discount_user_coupons where campaign_id=p_campaign and user_id=actor;
  if found then return result; end if;
  if not campaign.active or today not between campaign.starts_on and campaign.ends_on
     or campaign.issued_count>=campaign.quantity then
    raise exception using errcode='55000',message='coupon unavailable';
  end if;
  if campaign.university_id is not null and public.my_verified_university() is distinct from campaign.university_id then
    raise exception using errcode='42501',message='school verification required';
  end if;
  if campaign.points_cost>0 then
    perform core_private.lock_discount_points(actor);
    if (select coalesce(sum(amount),0) from public.point_ledger where user_id=actor)<campaign.points_cost then
      raise exception using errcode='P0001',message='insufficient points';
    end if;
    insert into public.point_ledger(user_id,source,source_id,reward_key,amount,memo)
    values(actor,'coupon_spend',p_campaign,p_campaign::text,-campaign.points_cost,campaign.title);
  end if;
  insert into public.discount_user_coupons(campaign_id,user_id) values(p_campaign,actor) returning code into result;
  update public.discount_coupon_campaigns set issued_count=issued_count+1 where id=p_campaign;
  return result;
end $$;


create function public.create_points_discount_coupon(
  p_business uuid,p_title text,p_terms text,p_start date,p_end date,p_quantity integer,
  p_points_cost integer default 0,p_school uuid default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare campaign_id uuid;
begin
  campaign_id:=public.create_discount_coupon(p_business,p_title,p_terms,p_start,p_end,p_quantity,p_school);
  update public.discount_coupon_campaigns set points_cost=p_points_cost where id=campaign_id;
  return campaign_id;
end $$;

create function public.list_business_coupon_offers(p_business uuid,p_limit integer default 20,p_offset integer default 0)
returns table(id uuid,title text,terms text,school text,starts_on date,ends_on date,remaining integer,active boolean,
  claimed boolean,issued integer,used integer,points_cost integer)
language sql stable security definer set search_path='' as $$
  select q.*,c.points_cost from public.list_business_coupons(p_business,p_limit,p_offset) q
  join public.discount_coupon_campaigns c on c.id=q.id
  order by c.created_at desc,c.id
$$;

create function public.revoke_discount_reward(p_entry uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid();
  entry public.point_ledger%rowtype;
  reason text:=nullif(btrim(p_reason),'');
begin
  if actor is null or not (public.has_my_role('admin') or public.has_my_role('super_admin')) then
    raise exception using errcode='42501',message='admin required'; end if;
  if reason is null or char_length(reason)>500 then raise exception using errcode='22023',message='reason required'; end if;
  select * into entry from public.point_ledger where id=p_entry and source='discount_report';
  if not found then raise exception using errcode='P0002',message='reward not found'; end if;
  if entry.user_id=actor then raise exception using errcode='42501',message='cannot revoke own points'; end if;
  perform core_private.lock_discount_points(entry.user_id);
  insert into public.point_ledger(user_id,source,source_id,reward_key,amount,memo,performed_by)
  values(entry.user_id,'reward_revoke',entry.id,entry.id::text,-entry.amount,reason,actor)
  on conflict (user_id,source,source_id) do nothing;
end $$;

create function public.list_discount_reward_grants(p_limit integer default 20,p_offset integer default 0)
returns table(id uuid, label text, amount integer, awarded_at timestamptz, revoked_at timestamptz, reason text)
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not (public.has_my_role('admin') or public.has_my_role('super_admin')) then
    raise exception using errcode='42501',message='admin required'; end if;
  return query
    select g.id,coalesce(g.memo,r.store_name,'혜택 제보'),g.amount,g.created_at,d.created_at,d.memo
    from public.point_ledger g left join public.discount_reports r on r.id=g.source_id
    left join public.point_ledger d on d.user_id=g.user_id and d.source='reward_revoke' and d.source_id=g.id
    where g.source='discount_report' and g.user_id<>auth.uid()
    order by g.created_at desc,g.id
    limit greatest(1,least(coalesce(p_limit,20),100)) offset greatest(0,coalesce(p_offset,0));
end $$;

revoke all on function public.create_points_discount_coupon(uuid,text,text,date,date,integer,integer,uuid),
  public.list_business_coupon_offers(uuid,integer,integer),public.revoke_discount_reward(uuid,text),
  public.list_discount_reward_grants(integer,integer) from public,anon,authenticated;
grant execute on function public.list_business_coupon_offers(uuid,integer,integer) to anon,authenticated;
grant execute on function public.create_points_discount_coupon(uuid,text,text,date,date,integer,integer,uuid),
  public.revoke_discount_reward(uuid,text),public.list_discount_reward_grants(integer,integer) to authenticated;
