create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100 and name = btrim(name) and name ~ '[^[:space:]]'),
  branch_name text not null check (char_length(branch_name) between 1 and 100 and branch_name = btrim(branch_name) and branch_name ~ '[^[:space:]]'),
  address text not null check (char_length(address) between 1 and 250 and address = btrim(address) and address ~ '[^[:space:]]'),
  source_url text not null check (
    char_length(source_url) <= 2048 and source_url !~ '[[:space:][:cntrl:]]'
    and position(chr(92) in source_url) = 0
    and source_url ~ '^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?([/?#].*)?$'
  ),
  registered_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index businesses_unique_location on public.businesses(lower(name), lower(branch_name), lower(address));
create index businesses_directory_order on public.businesses(name, branch_name, id);
create index businesses_registrar on public.businesses(registered_by);

alter table public.businesses enable row level security;
revoke all on public.businesses from public, anon, authenticated;
grant select (id, name, branch_name, address, source_url) on public.businesses to anon, authenticated;
grant insert (name, branch_name, address, source_url) on public.businesses to authenticated;
grant all on public.businesses to service_role;
create policy businesses_read on public.businesses for select to anon, authenticated using (true);
create policy businesses_register on public.businesses for insert to authenticated
  with check (
    registered_by = (select auth.uid()) and
    ((select public.has_my_role('admin')) or (select public.has_my_role('super_admin')))
  );

alter table public.discount_reports add column business_id uuid references public.businesses(id) on delete set null;
create index discount_reports_business on public.discount_reports(business_id) where business_id is not null;

create function public.set_discount_business_link(p_offer_id uuid, p_business_id uuid, p_linked boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  linked_business uuid;
begin
  if auth.uid() is null or not (public.has_my_role('admin') or public.has_my_role('super_admin')) then
    raise exception using errcode = '42501', message = 'admin role required';
  end if;
  if p_offer_id is null or p_business_id is null or p_linked is null then
    raise exception using errcode = '22023', message = 'invalid business link';
  end if;
  if p_linked then
    perform 1 from public.businesses where id = p_business_id for key share;
    if not found then
      raise exception using errcode = 'P0002', message = 'business not found';
    end if;
  end if;
  select r.business_id into linked_business from public.discount_reports r
  where r.id = p_offer_id and r.status = 'approved' and r.withdrawn_at is null
    and (r.ends_on is null or r.ends_on >= (now() at time zone 'Asia/Seoul')::date)
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'public offer not found';
  end if;
  if linked_business is not null and linked_business <> p_business_id then
    raise exception using errcode = '55000', message = 'offer linked to another business';
  end if;
  if p_linked and linked_business is null then
    update public.discount_reports set business_id = p_business_id where id = p_offer_id;
  elsif not p_linked and linked_business = p_business_id then
    update public.discount_reports set business_id = null where id = p_offer_id;
  end if;
end $$;

create function public.list_business_discounts(p_business_id uuid, p_limit integer default 20, p_offset integer default 0)
returns table(id uuid, store_name text, details text, source_url text,
  starts_on date, ends_on date, verified_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.store_name, r.details, r.source_url, r.starts_on, r.ends_on, coalesce(r.reviewed_at,r.updated_at)
  from public.discount_reports r
  where r.business_id = p_business_id and r.status = 'approved' and r.withdrawn_at is null
    and (r.ends_on is null or r.ends_on >= (now() at time zone 'Asia/Seoul')::date)
  order by coalesce(r.reviewed_at,r.updated_at) desc, r.id desc
  limit greatest(1,least(coalesce(p_limit,20),100)) offset greatest(0,coalesce(p_offset,0))
$$;

create function public.list_public_discount_business_links(p_offer_ids uuid[])
returns table(offer_id uuid, business_id uuid, name text, branch_name text)
language sql stable security definer set search_path = '' as $$
  select r.id, b.id, b.name, b.branch_name
  from public.discount_reports r
  join public.businesses b on b.id = r.business_id
  where cardinality(p_offer_ids) between 1 and 100 and r.id = any(p_offer_ids)
    and r.status = 'approved' and r.withdrawn_at is null
    and (r.ends_on is null or r.ends_on >= (now() at time zone 'Asia/Seoul')::date)
$$;

revoke all on function public.set_discount_business_link(uuid,uuid,boolean) from public, anon, authenticated;
revoke all on function public.list_business_discounts(uuid,integer,integer) from public, anon, authenticated;
revoke all on function public.list_public_discount_business_links(uuid[]) from public, anon, authenticated;
grant execute on function public.set_discount_business_link(uuid,uuid,boolean) to authenticated;
grant execute on function public.list_business_discounts(uuid,integer,integer),
  public.list_public_discount_business_links(uuid[]) to anon, authenticated;
