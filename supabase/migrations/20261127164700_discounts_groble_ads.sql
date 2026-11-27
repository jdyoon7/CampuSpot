create table core_private.groble_ad_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  buyer_id uuid references public.profiles(id) on delete set null,
  product_id text not null check (char_length(product_id) between 1 and 128),
  price_krw integer not null check (price_krw between 1 and 100000000),
  duration_hours integer not null check (duration_hours between 1 and 720),
  provider_payment_id text unique,
  paid_at timestamptz,
  active_from timestamptz,
  active_until timestamptz,
  cancel_requested_at timestamptz,
  refunded_krw integer not null default 0 check (refunded_krw between 0 and price_krw),
  created_at timestamptz not null default now(),
  check ((provider_payment_id is null and paid_at is null and active_from is null and active_until is null)
    or (provider_payment_id is not null and paid_at is not null and active_from is not null and active_until is not null and active_until>active_from))
);
create index groble_ad_orders_buyer on core_private.groble_ad_orders(buyer_id,business_id,created_at desc);
create index groble_ad_orders_active on core_private.groble_ad_orders(active_until,business_id)
  where paid_at is not null and refunded_krw=0;
alter table core_private.groble_ad_orders enable row level security;
revoke all on core_private.groble_ad_orders from public,anon,authenticated;

create table core_private.groble_ad_receipts (
  event_id text primary key,
  delivery_key text not null unique,
  kind text not null check (kind in ('payment.completed','payment.cancel_requested','payment.refunded')),
  merchant_id text not null,
  product_id text not null,
  amount_krw integer not null check (amount_krw>0),
  event_at timestamptz not null,
  refund_at timestamptz,
  refund_krw integer,
  outcome text not null default 'received',
  received_at timestamptz not null default now(),
  check ((kind='payment.refunded' and refund_at is not null and refund_krw between 1 and amount_krw)
    or (kind<>'payment.refunded' and refund_at is null and refund_krw is null))
);
create unique index groble_refund_replay on core_private.groble_ad_receipts(merchant_id,refund_at) where kind='payment.refunded';
create index groble_receipts_merchant on core_private.groble_ad_receipts(merchant_id,product_id,amount_krw,kind);
alter table core_private.groble_ad_receipts enable row level security;
revoke all on core_private.groble_ad_receipts from public,anon,authenticated;

create function public.prepare_groble_ad_order(
  p_buyer uuid,p_business uuid,p_product text,p_price integer,p_duration integer
) returns uuid language plpgsql security definer set search_path='' as $$
declare order_id uuid;
begin
  perform 1 from public.businesses where id=p_business for update;
  if not found or not exists (select 1 from public.business_operator_requests
    where business_id=p_business and requested_by=p_buyer and status='approved') then
    raise exception using errcode='42501',message='operator required';
  end if;
  if exists(select 1 from core_private.groble_ad_orders where business_id=p_business
    and active_until>now() and refunded_krw=0) then
    raise exception using errcode='55000',message='advertisement is active';
  end if;
  select id into order_id from core_private.groble_ad_orders where business_id=p_business and buyer_id=p_buyer
    and product_id=p_product and price_krw=p_price and duration_hours=p_duration and paid_at is null
  order by created_at desc,id limit 1;
  if found then return order_id; end if;
  insert into core_private.groble_ad_orders(business_id,buyer_id,product_id,price_krw,duration_hours)
    values(p_business,p_buyer,p_product,p_price,p_duration) returning id into order_id;
  return order_id;
end $$;

create function public.record_groble_ad_event(
  p_event text,p_delivery text,p_kind text,p_merchant text,p_product text,p_amount integer,
  p_occurred_at timestamptz,p_order uuid default null,p_paid_at timestamptz default null,
  p_refund_at timestamptz default null,p_refund_amount integer default null
) returns text language plpgsql security definer set search_path='' as $$
declare
  target core_private.groble_ad_orders%rowtype;
  result_code text;
begin
  -- Serialize the whole merchant history, including a refund delivered before completion.
  perform pg_advisory_xact_lock(hashtextextended(p_merchant, 781643));
  insert into core_private.groble_ad_receipts(event_id,delivery_key,kind,merchant_id,product_id,
    amount_krw,event_at,refund_at,refund_krw)
  values(p_event,p_delivery,p_kind,p_merchant,p_product,p_amount,p_occurred_at,p_refund_at,p_refund_amount)
  on conflict do nothing;
  if not found then return 'duplicate'; end if;

  if p_kind='payment.completed' then
    select * into target from core_private.groble_ad_orders where id=p_order for update;
    if not found then result_code:='unmatched';
    elsif target.product_id<>p_product or target.price_krw<>p_amount
      or p_paid_at is null or p_paid_at<target.created_at-interval '5 seconds'
      or p_paid_at>p_occurred_at+interval '5 seconds' then result_code:='mismatch';
    elsif target.provider_payment_id is not null then
      result_code:=case when target.provider_payment_id=p_merchant then 'duplicate' else 'additional_payment' end;
    elsif exists(select 1 from core_private.groble_ad_orders where provider_payment_id=p_merchant) then
      result_code:='mismatch';
    else
      update core_private.groble_ad_orders set provider_payment_id=p_merchant,paid_at=p_paid_at,
        active_from=now(),active_until=now()+make_interval(hours=>target.duration_hours)
        where id=target.id;
      result_code:='matched';
    end if;
  else
    select * into target from core_private.groble_ad_orders where provider_payment_id=p_merchant for update;
    if not found then result_code:='awaiting_completion';
    elsif target.product_id<>p_product or target.price_krw<>p_amount then result_code:='mismatch';
    else result_code:='matched'; end if;
  end if;

  if result_code='matched' then
    update core_private.groble_ad_orders o set
      cancel_requested_at=(select max(r.event_at) from core_private.groble_ad_receipts r
        where r.merchant_id=p_merchant and r.kind='payment.cancel_requested'
          and r.product_id=p_product and r.amount_krw=p_amount and r.event_at>=o.paid_at),
      refunded_krw=(select least(o.price_krw,coalesce(sum(r.refund_krw),0)) from core_private.groble_ad_receipts r
        where r.merchant_id=p_merchant and r.kind='payment.refunded'
          and r.product_id=p_product and r.amount_krw=p_amount and r.refund_at>=o.paid_at)
    where o.id=target.id;
    update core_private.groble_ad_receipts r set outcome='matched'
    where r.merchant_id=p_merchant and r.product_id=p_product and r.amount_krw=p_amount
      and r.outcome='awaiting_completion';
  end if;
  update core_private.groble_ad_receipts r set outcome=result_code where r.event_id=p_event;
  return result_code;
end $$;

create function public.list_my_groble_ad_orders(p_business uuid,p_limit integer default 20,p_offset integer default 0)
returns table(id uuid,price_krw integer,duration_hours integer,paid_at timestamptz,active_until timestamptz,
  cancel_requested_at timestamptz,refunded_krw integer,created_at timestamptz)
language sql stable security definer set search_path='' as $$
  select o.id,o.price_krw,o.duration_hours,o.paid_at,o.active_until,o.cancel_requested_at,o.refunded_krw,o.created_at
  from core_private.groble_ad_orders o where o.buyer_id=auth.uid() and o.business_id=p_business
  order by o.created_at desc,o.id
  limit greatest(1,least(coalesce(p_limit,20),100)) offset greatest(0,coalesce(p_offset,0))
$$;

create function public.list_groble_ad_payment_review(p_limit integer default 20,p_offset integer default 0)
returns table(id text,kind text,merchant_id text,amount_krw integer,refunded_krw integer,outcome text,event_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not (public.has_my_role('admin') or public.has_my_role('super_admin')) then
    raise exception using errcode='42501',message='admin required';
  end if;
  return query select r.event_id,r.kind,r.merchant_id,r.amount_krw,r.refund_krw,r.outcome,r.event_at
  from core_private.groble_ad_receipts r
  order by r.event_at desc,r.event_id
  limit greatest(1,least(coalesce(p_limit,20),100)) offset greatest(0,coalesce(p_offset,0));
end $$;

create function public.list_active_groble_store_ads(p_limit integer default 6)
returns table(id uuid,name text,branch_name text,description text)
language sql stable security definer set search_path='' as $$
  select b.id,b.name,b.branch_name,b.description
  from public.businesses b join lateral (
    select max(o.active_from) as latest from core_private.groble_ad_orders o where o.business_id=b.id
      and o.paid_at is not null and o.refunded_krw=0 and now()>=o.active_from and now()<o.active_until
  ) active on active.latest is not null
  order by active.latest desc,b.id limit greatest(1,least(coalesce(p_limit,6),20))
$$;

revoke all on function public.prepare_groble_ad_order(uuid,uuid,text,integer,integer),
  public.record_groble_ad_event(text,text,text,text,text,integer,timestamptz,uuid,timestamptz,timestamptz,integer),
  public.list_my_groble_ad_orders(uuid,integer,integer),public.list_groble_ad_payment_review(integer,integer),
  public.list_active_groble_store_ads(integer) from public,anon,authenticated;
grant execute on function public.prepare_groble_ad_order(uuid,uuid,text,integer,integer),
  public.record_groble_ad_event(text,text,text,text,text,integer,timestamptz,uuid,timestamptz,timestamptz,integer) to service_role;
grant execute on function public.list_my_groble_ad_orders(uuid,integer,integer),public.list_groble_ad_payment_review(integer,integer) to authenticated;
grant execute on function public.list_active_groble_store_ads(integer) to anon,authenticated;
