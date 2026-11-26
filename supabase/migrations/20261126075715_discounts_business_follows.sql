alter table public.discount_reports add column business_linked_at timestamptz;

create function core_private.track_discount_business_link()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.business_linked_at := case when new.business_id is not null then statement_timestamp() end;
  elsif new.business_id is distinct from old.business_id then
    new.business_linked_at := case when new.business_id is not null then statement_timestamp() end;
  end if;
  return new;
end $$;
revoke all on function core_private.track_discount_business_link() from public, anon, authenticated;
create trigger track_discount_business_link
  before insert or update of business_id on public.discount_reports
  for each row execute function core_private.track_discount_business_link();

create table public.business_follows (
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default statement_timestamp(),
  primary key (user_id, business_id)
);
create index business_follows_user_order on public.business_follows(user_id, created_at desc, business_id desc);
create index business_follows_business on public.business_follows(business_id);

create type public.business_notification_kind as enum ('new_offer','starting','ending');
create table public.business_notification_reads (
  user_id uuid not null,
  business_id uuid not null,
  offer_id uuid not null references public.discount_reports(id) on delete cascade,
  kind public.business_notification_kind not null,
  event_at timestamptz not null,
  read_at timestamptz not null default statement_timestamp(),
  primary key (user_id, business_id, offer_id, kind, event_at),
  foreign key (user_id, business_id) references public.business_follows on delete cascade
);
create index business_notification_reads_offer on public.business_notification_reads(offer_id);

alter table public.business_follows enable row level security;
alter table public.business_notification_reads enable row level security;
revoke all on public.business_follows, public.business_notification_reads from public, anon, authenticated;
grant select (user_id,business_id) on public.business_follows to authenticated;
grant all on public.business_follows, public.business_notification_reads to service_role;
create policy business_follows_read_own on public.business_follows for select to authenticated
  using (user_id = (select auth.uid()));

create function public.set_business_follow(p_business_id uuid, p_followed boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null then
    raise exception using errcode='42501', message='authentication required';
  end if;
  if p_business_id is null or p_followed is null then
    raise exception using errcode='22023', message='invalid follow request';
  end if;
  if p_followed then
    insert into public.business_follows(user_id,business_id)
    values (owner_id,p_business_id) on conflict (user_id,business_id) do nothing;
  else
    delete from public.business_follows f where f.user_id=owner_id and f.business_id=p_business_id;
  end if;
end $$;

create function public.list_my_followed_businesses(p_limit integer default 20,p_offset integer default 0)
returns table(id uuid, name text, branch_name text, address text)
language sql stable security definer set search_path = '' as $$
  select b.id,b.name,b.branch_name,b.address
  from public.business_follows f join public.businesses b on b.id=f.business_id
  where f.user_id=(select auth.uid())
  order by f.created_at desc,f.business_id desc
  limit greatest(1,least(coalesce(p_limit,20),100)) offset greatest(0,coalesce(p_offset,0))
$$;

-- Derive alerts from public offers and follow timestamps. Store only read receipts.
create function core_private.business_notification_events(p_user uuid)
returns table(business_id uuid,offer_id uuid,name text,branch_name text,store_name text,
  kind public.business_notification_kind,event_at timestamptz,starts_on date,ends_on date)
language sql stable set search_path = '' as $$
  with clock as (
    select statement_timestamp() at time zone 'Asia/Seoul' as local_now
  ), offers as (
    select b.id as business_id,r.id as offer_id,b.name,b.branch_name,r.store_name,r.starts_on,r.ends_on,
      f.created_at as followed_at,c.local_now::date as today,
      greatest(r.business_linked_at,coalesce(a.decided_at,r.created_at)) as published_at
    from public.business_follows f
    join public.businesses b on b.id=f.business_id
    join public.discount_reports r on r.business_id=b.id
    left join core_private.discount_review_log a on a.report_id=r.id and a.decision='approved'
    cross join clock c
    where f.user_id=p_user and r.status='approved' and r.withdrawn_at is null
      and (r.ends_on is null or r.ends_on>=c.local_now::date)
  )
  select o.business_id,o.offer_id,o.name,o.branch_name,o.store_name,e.kind,e.event_at,o.starts_on,o.ends_on
  from offers o
  cross join lateral (
    values
      ('new_offer'::public.business_notification_kind, o.published_at,
        o.published_at>=o.followed_at and o.published_at>=statement_timestamp()-interval '30 days'),
      ('starting'::public.business_notification_kind, o.starts_on::timestamp at time zone 'Asia/Seoul',
        o.starts_on between o.today-6 and o.today
        and (o.starts_on::timestamp at time zone 'Asia/Seoul')>=o.followed_at
        and (o.starts_on::timestamp at time zone 'Asia/Seoul')>o.published_at),
      ('ending'::public.business_notification_kind,
        greatest((o.ends_on-6)::timestamp at time zone 'Asia/Seoul',o.followed_at),
        o.ends_on between o.today and o.today+6 and (o.starts_on is null or o.starts_on<=o.today))
  ) e(kind,event_at,visible)
  where e.visible and e.event_at<=statement_timestamp()
$$;
revoke all on function core_private.business_notification_events(uuid) from public, anon, authenticated;

create function public.list_my_business_notifications(p_limit integer default 20,p_offset integer default 0)
returns table(business_id uuid,offer_id uuid,name text,branch_name text,store_name text,
  kind public.business_notification_kind,event_at timestamptz,starts_on date,ends_on date,read_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select e.business_id,e.offer_id,e.name,e.branch_name,e.store_name,e.kind,e.event_at,e.starts_on,e.ends_on,r.read_at
  from core_private.business_notification_events((select auth.uid())) e
  left join public.business_notification_reads r on r.user_id=(select auth.uid()) and r.business_id=e.business_id
    and r.offer_id=e.offer_id and r.kind=e.kind and r.event_at=e.event_at
  order by e.event_at desc,e.business_id desc,e.offer_id desc,e.kind
  limit greatest(1,least(coalesce(p_limit,20),100)) offset greatest(0,coalesce(p_offset,0))
$$;

create function public.mark_business_notification_read(
  p_business_id uuid,p_offer_id uuid,p_kind public.business_notification_kind,p_event_at timestamptz
) returns void language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null then
    raise exception using errcode='42501', message='authentication required';
  end if;
  perform 1 from public.business_follows f where f.user_id=owner_id and f.business_id=p_business_id for key share;
  if not found then return; end if;
  insert into public.business_notification_reads(user_id,business_id,offer_id,kind,event_at)
  select owner_id,e.business_id,e.offer_id,e.kind,e.event_at
  from core_private.business_notification_events(owner_id) e
  where e.business_id=p_business_id and e.offer_id=p_offer_id and e.kind=p_kind and e.event_at=p_event_at
  on conflict (user_id,business_id,offer_id,kind,event_at) do nothing;
end $$;

revoke all on function public.set_business_follow(uuid,boolean), public.list_my_followed_businesses(integer,integer),
  public.list_my_business_notifications(integer,integer),
  public.mark_business_notification_read(uuid,uuid,public.business_notification_kind,timestamptz) from public, anon, authenticated;
grant execute on function public.set_business_follow(uuid,boolean), public.list_my_followed_businesses(integer,integer),
  public.list_my_business_notifications(integer,integer),
  public.mark_business_notification_read(uuid,uuid,public.business_notification_kind,timestamptz) to authenticated;
