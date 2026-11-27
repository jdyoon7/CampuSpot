create table public.business_operator_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  evidence_url text not null check (char_length(evidence_url)<=2048 and evidence_url ~ '^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?([/?#].*)?$' and evidence_url !~ '[[:space:][:cntrl:]]' and strpos(evidence_url,chr(92))=0),
  note text not null check (char_length(btrim(note)) between 1 and 500),
  status text not null default 'pending' check (status in ('pending','approved','rejected','revoked')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);
create unique index operator_request_open on public.business_operator_requests(business_id,requested_by)
where status in ('pending','approved');
create unique index business_single_operator on public.business_operator_requests(business_id) where status='approved';
create index operator_request_queue on public.business_operator_requests(created_at,id) where status='pending';
alter table public.business_operator_requests enable row level security;
revoke all on public.business_operator_requests from public,anon,authenticated;
grant select on public.business_operator_requests to authenticated;
create policy operator_request_read on public.business_operator_requests for select to authenticated
using (requested_by=(select auth.uid()) or (select public.has_my_role('admin')) or (select public.has_my_role('super_admin')));

create function core_private.owns_discount_business(p_business uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.business_operator_requests
    where business_id=p_business and requested_by=auth.uid() and status='approved')
$$;
revoke all on function core_private.owns_discount_business(uuid) from public,anon,authenticated;

create function public.request_business_operator(p_business uuid,p_evidence text,p_note text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='authentication required'; end if;
  perform 1 from public.businesses where id=p_business for update;
  if not found then raise exception using errcode='P0002',message='business missing'; end if;
  if exists(select 1 from public.business_operator_requests where business_id=p_business and status='approved') then
    raise exception using errcode='55000',message='business already managed';
  end if;
  insert into public.business_operator_requests(business_id,requested_by,evidence_url,note)
  values(p_business,auth.uid(),btrim(p_evidence),btrim(p_note));
end $$;

create function public.review_business_operator(p_request uuid,p_decision text) returns void
language plpgsql security definer set search_path='' as $$
declare target public.business_operator_requests%rowtype;
begin
  if auth.uid() is null or not (public.has_my_role('admin') or public.has_my_role('super_admin')) then
    raise exception using errcode='42501',message='admin required';
  end if;
  if p_decision is null or p_decision not in ('approved','rejected','revoked') then
    raise exception using errcode='22023',message='invalid decision';
  end if;
  select * into target from public.business_operator_requests where id=p_request;
  if not found or target.requested_by=auth.uid() then raise exception using errcode='42501',message='invalid review'; end if;
  perform 1 from public.businesses where id=target.business_id for update;
  update public.business_operator_requests set status=p_decision,reviewed_by=auth.uid(),reviewed_at=now()
  where id=p_request and ((status='pending' and p_decision in ('approved','rejected'))
                       or (status='approved' and p_decision='revoked'));
  if not found then raise exception using errcode='P0002',message='already reviewed'; end if;
  if p_decision='approved' then
    update public.business_operator_requests set status='rejected',reviewed_by=auth.uid(),reviewed_at=now()
    where business_id=target.business_id and id<>p_request and status='pending';
  elsif p_decision='revoked' then
    update public.discount_coupon_campaigns set active=false where business_id=target.business_id;
  end if;
end $$;

alter table public.businesses add column description text check (char_length(description)<=1200),
  add column opening_hours text check (char_length(opening_hours)<=300),
  add column menu_url text check (char_length(menu_url)<=2048 and menu_url ~ '^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?([/?#].*)?$' and menu_url !~ '[[:space:][:cntrl:]]' and strpos(menu_url,chr(92))=0);
grant select(description,opening_hours,menu_url) on public.businesses to anon,authenticated;

create function public.edit_owned_business(p_business uuid,p_description text,p_hours text,p_menu text) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.businesses where id=p_business for update;
  if not core_private.owns_discount_business(p_business) then raise exception using errcode='42501',message='operator required'; end if;
  update public.businesses set description=nullif(btrim(p_description),''),
    opening_hours=nullif(btrim(p_hours),''),menu_url=nullif(btrim(p_menu),'') where id=p_business;
end $$;

alter table public.discount_reports add column submitted_by_operator boolean not null default false;

create function public.submit_owned_business_offer(p_business uuid,p_title text,p_details text,p_source text,p_start date default null,p_end date default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  perform 1 from public.businesses where id=p_business for update;
  if not core_private.owns_discount_business(p_business) then raise exception using errcode='42501',message='operator required'; end if;
  insert into public.discount_reports(reporter_id,business_id,store_name,details,source_url,starts_on,ends_on,submitted_by_operator)
  values(auth.uid(),p_business,btrim(p_title),btrim(p_details),btrim(p_source),p_start,p_end,true) returning id into result;
  return result;
end $$;

create table public.discount_coupon_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  terms text not null check (char_length(btrim(terms)) between 1 and 500),
  university_id uuid references public.universities(id) on delete restrict,
  starts_on date not null,
  ends_on date not null check (ends_on>=starts_on),
  quantity integer not null check (quantity between 1 and 10000),
  issued_count integer not null default 0 check (issued_count between 0 and quantity),
  redeemed_count integer not null default 0 check (redeemed_count between 0 and issued_count),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index coupon_campaign_by_store on public.discount_coupon_campaigns(business_id,created_at desc,id);
alter table public.discount_coupon_campaigns enable row level security;
revoke all on public.discount_coupon_campaigns from public,anon,authenticated;

create table public.discount_user_coupons (
  campaign_id uuid not null references public.discount_coupon_campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  code uuid not null unique default gen_random_uuid(),
  claimed_at timestamptz not null default now(),
  redeemed_at timestamptz,
  primary key (campaign_id,user_id)
);
create index discount_coupons_by_user on public.discount_user_coupons(user_id,claimed_at desc,campaign_id);
alter table public.discount_user_coupons enable row level security;
revoke all on public.discount_user_coupons from public,anon,authenticated;

create function public.create_discount_coupon(p_business uuid,p_title text,p_terms text,p_start date,p_end date,p_quantity integer,p_school uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  perform 1 from public.businesses where id=p_business for update;
  if not core_private.owns_discount_business(p_business) then raise exception using errcode='42501',message='operator required'; end if;
  if p_end < (now() at time zone 'Asia/Seoul')::date then raise exception using errcode='22023',message='coupon already expired'; end if;
  insert into public.discount_coupon_campaigns(business_id,title,terms,starts_on,ends_on,quantity,university_id)
  values(p_business,btrim(p_title),btrim(p_terms),p_start,p_end,p_quantity,p_school) returning id into result;
  return result;
end $$;

create function public.list_business_coupons(p_business uuid,p_limit integer default 20,p_offset integer default 0)
returns table(id uuid,title text,terms text,school text,starts_on date,ends_on date,remaining integer,active boolean,claimed boolean,issued integer,used integer)
language sql stable security definer set search_path='' as $$
  select c.id,c.title,c.terms,u.name,c.starts_on,c.ends_on,
    c.quantity-c.issued_count,
    c.active,
    exists(select 1 from public.discount_user_coupons x where x.campaign_id=c.id and x.user_id=auth.uid()),
    case when core_private.owns_discount_business(p_business) then c.issued_count end,
    case when core_private.owns_discount_business(p_business) then c.redeemed_count end
  from public.discount_coupon_campaigns c left join public.universities u on u.id=c.university_id
  where c.business_id=p_business and
    ((c.active and (now() at time zone 'Asia/Seoul')::date between c.starts_on and c.ends_on)
      or core_private.owns_discount_business(p_business))
  order by c.created_at desc,c.id
  limit greatest(1,least(coalesce(p_limit,20),100)) offset greatest(0,coalesce(p_offset,0))
$$;

create function public.set_discount_coupon_active(p_campaign uuid,p_active boolean) returns void
language plpgsql security definer set search_path='' as $$
declare business uuid;
begin
  select business_id into business from public.discount_coupon_campaigns where id=p_campaign;
  perform 1 from public.businesses where id=business for update;
  if not core_private.owns_discount_business(business) then raise exception using errcode='42501',message='operator required'; end if;
  update public.discount_coupon_campaigns set active=p_active where id=p_campaign;
end $$;

create function public.claim_discount_coupon(p_campaign uuid) returns uuid
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
  insert into public.discount_user_coupons(campaign_id,user_id) values(p_campaign,actor) returning code into result;
  update public.discount_coupon_campaigns set issued_count=issued_count+1 where id=p_campaign;
  return result;
end $$;

create function public.redeem_discount_coupon(p_business uuid,p_code uuid) returns text
language plpgsql security definer set search_path='' as $$
declare result text;
  campaign_id uuid;
begin
  perform 1 from public.businesses where id=p_business for update;
  if not core_private.owns_discount_business(p_business) then raise exception using errcode='42501',message='operator required'; end if;
  update public.discount_user_coupons x set redeemed_at=now()
  from public.discount_coupon_campaigns c
  where x.campaign_id=c.id and c.business_id=p_business and x.code=p_code and x.redeemed_at is null
    and c.active and (now() at time zone 'Asia/Seoul')::date between c.starts_on and c.ends_on
  returning c.title,c.id into result,campaign_id;
  if not found then raise exception using errcode='55000',message='coupon not redeemable'; end if;
  update public.discount_coupon_campaigns set redeemed_count=redeemed_count+1 where id=campaign_id;
  return result;
end $$;

create function public.list_my_discount_coupons(p_limit integer default 20,p_offset integer default 0)
returns table(id uuid,title text,terms text,business text,code uuid,ends_on date,redeemed_at timestamptz,usable boolean)
language sql stable security definer set search_path='' as $$
  select c.id,c.title,c.terms,b.name||' · '||b.branch_name,
    case when x.redeemed_at is null and c.active and (now() at time zone 'Asia/Seoul')::date between c.starts_on and c.ends_on then x.code end,
    c.ends_on,x.redeemed_at,
    x.redeemed_at is null and c.active and (now() at time zone 'Asia/Seoul')::date between c.starts_on and c.ends_on
  from public.discount_user_coupons x join public.discount_coupon_campaigns c on c.id=x.campaign_id
  join public.businesses b on b.id=c.business_id
  where x.user_id=auth.uid()
  order by x.claimed_at desc,c.id
  limit greatest(1,least(coalesce(p_limit,20),100)) offset greatest(0,coalesce(p_offset,0))
$$;

create table public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source='discount_report'),
  source_id uuid not null,
  reward_key text not null,
  amount integer not null check (amount>0),
  created_at timestamptz not null default now(),
  unique(source,source_id),
  unique(user_id,source,reward_key)
);
create index point_ledger_by_user on public.point_ledger(user_id,created_at desc,id);
alter table public.point_ledger enable row level security;
revoke all on public.point_ledger from public,anon,authenticated;
grant select(id,user_id,source,source_id,amount,created_at) on public.point_ledger to authenticated;
create policy point_ledger_own on public.point_ledger for select to authenticated using (user_id=(select auth.uid()));

create function core_private.reward_approved_discount() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.decision='approved' then
    insert into public.point_ledger(user_id,source,source_id,reward_key,amount)
    select r.reporter_id,'discount_report',r.id,
      md5(jsonb_build_array(lower(btrim(r.store_name)),btrim(r.details),r.source_url,r.starts_on,r.ends_on)::text),100
    from public.discount_reports r
    where r.id=new.report_id and r.status='approved' and not r.submitted_by_operator
    on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function core_private.reward_approved_discount() from public,anon,authenticated;
create trigger discount_review_earn_points after insert on core_private.discount_review_log
for each row execute function core_private.reward_approved_discount();

create function public.my_discount_point_balance() returns bigint
language sql stable security invoker set search_path='' as $$
  select coalesce(sum(amount),0) from public.point_ledger where user_id=auth.uid()
$$;

revoke all on function public.request_business_operator(uuid,text,text),public.review_business_operator(uuid,text),
  public.edit_owned_business(uuid,text,text,text),public.submit_owned_business_offer(uuid,text,text,text,date,date),
  public.create_discount_coupon(uuid,text,text,date,date,integer,uuid),public.set_discount_coupon_active(uuid,boolean),
  public.list_business_coupons(uuid,integer,integer),public.claim_discount_coupon(uuid),public.redeem_discount_coupon(uuid,uuid),
  public.list_my_discount_coupons(integer,integer),public.my_discount_point_balance() from public,anon,authenticated;
grant execute on function public.request_business_operator(uuid,text,text),public.review_business_operator(uuid,text),
  public.edit_owned_business(uuid,text,text,text),public.submit_owned_business_offer(uuid,text,text,text,date,date),
  public.create_discount_coupon(uuid,text,text,date,date,integer,uuid),public.set_discount_coupon_active(uuid,boolean),
  public.claim_discount_coupon(uuid),public.redeem_discount_coupon(uuid,uuid),
  public.list_my_discount_coupons(integer,integer),public.my_discount_point_balance() to authenticated;
grant execute on function public.list_business_coupons(uuid,integer,integer) to anon,authenticated;
