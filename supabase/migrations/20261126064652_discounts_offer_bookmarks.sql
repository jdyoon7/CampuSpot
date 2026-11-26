create table public.discount_offer_bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  offer_id uuid not null references public.discount_reports(id) on delete cascade,
  store_name text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, offer_id)
);
create index discount_bookmarks_by_user on public.discount_offer_bookmarks(user_id, created_at desc, offer_id desc);
create index discount_bookmarks_by_offer on public.discount_offer_bookmarks(offer_id);

alter table public.discount_offer_bookmarks enable row level security;
revoke all on public.discount_offer_bookmarks from public, anon, authenticated;
grant select (user_id, offer_id) on public.discount_offer_bookmarks to authenticated;
grant all on public.discount_offer_bookmarks to service_role;
create policy discount_bookmarks_read_own on public.discount_offer_bookmarks for select to authenticated
  using (user_id = (select auth.uid()));

create function public.set_discount_offer_bookmark(p_offer_id uuid, p_saved boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  name text;
begin
  if actor is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_offer_id is null or p_saved is null then
    raise exception using errcode = '22023', message = 'invalid bookmark';
  end if;
  if not p_saved then
    delete from public.discount_offer_bookmarks b where b.user_id = actor and b.offer_id = p_offer_id;
    return;
  end if;
  select r.store_name into name from public.discount_reports r
  where r.id = p_offer_id and r.status = 'approved' and r.withdrawn_at is null
    and (r.ends_on is null or r.ends_on >= (now() at time zone 'Asia/Seoul')::date)
  for share;
  if not found then
    raise exception using errcode = 'P0002', message = 'offer unavailable';
  end if;
  insert into public.discount_offer_bookmarks(user_id, offer_id, store_name)
  values (actor, p_offer_id, name) on conflict (user_id, offer_id) do nothing;
end $$;

create function public.list_my_discount_offer_bookmarks(p_limit integer default 20, p_offset integer default 0)
returns table(id uuid, store_name text, available boolean, details text, source_url text, starts_on date, ends_on date)
language sql stable security definer set search_path = '' as $$
  select b.offer_id, coalesce(r.store_name, b.store_name), r.id is not null,
         r.details, r.source_url, r.starts_on, r.ends_on
  from public.discount_offer_bookmarks b
  left join public.discount_reports r on r.id = b.offer_id
    and r.status = 'approved' and r.withdrawn_at is null
    and (r.ends_on is null or r.ends_on >= (now() at time zone 'Asia/Seoul')::date)
  where b.user_id = (select auth.uid())
  order by b.created_at desc, b.offer_id desc
  limit greatest(1, least(coalesce(p_limit, 20), 100))
  offset greatest(0, coalesce(p_offset, 0))
$$;

revoke all on function public.set_discount_offer_bookmark(uuid,boolean) from public, anon, authenticated;
revoke all on function public.list_my_discount_offer_bookmarks(integer,integer) from public, anon, authenticated;
grant execute on function public.set_discount_offer_bookmark(uuid,boolean) to authenticated;
grant execute on function public.list_my_discount_offer_bookmarks(integer,integer) to authenticated;
