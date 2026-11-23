-- School affiliation is self-reported. Only a mailbox challenge can issue a verified affiliation.
create schema if not exists core_private;
revoke all on schema core_private from public, anon, authenticated;
create type public.app_role as enum ('member','verified_student','event_organizer','business_owner','admin','super_admin');

create table public.universities (
  id uuid primary key default gen_random_uuid(), name text not null unique check (btrim(name) <> '')
);
create table public.campuses (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities,
  name text not null check (btrim(name) <> ''), unique(university_id,name), unique(university_id,id)
);
create table public.departments (
  id uuid primary key default gen_random_uuid(), campus_id uuid not null references public.campuses,
  name text not null check (btrim(name) <> ''), unique(campus_id,name), unique(campus_id,id)
);
create table public.university_email_domains (
  domain text primary key check (domain = lower(domain) and domain ~ '^[a-z0-9.-]+[.][a-z]+$'),
  university_id uuid not null references public.universities
);
create index on public.university_email_domains(university_id);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '캠퍼스 회원' check (nickname = btrim(nickname) and char_length(nickname) between 2 and 24)
);
create table public.private_profiles (
  id uuid primary key references public.profiles on delete cascade,
  university_id uuid references public.universities,
  campus_id uuid, department_id uuid,
  student_number text check (student_number ~ '^[A-Za-z0-9-]{1,24}$'),
  foreign key(university_id,campus_id) references public.campuses(university_id,id),
  foreign key(campus_id,department_id) references public.departments(campus_id,id),
  check (campus_id is null or university_id is not null),
  check (department_id is null or campus_id is not null)
);
create index on public.private_profiles(university_id,campus_id);
create index on public.private_profiles(campus_id,department_id);
create table public.user_roles (
  user_id uuid not null references public.profiles on delete cascade,
  role public.app_role not null check (role <> 'verified_student'), primary key(user_id,role)
);
create table public.university_verifications (
  user_id uuid primary key references public.profiles on delete cascade,
  university_id uuid not null references public.universities,
  school_email text unique not null, verified_at timestamptz not null default now(),
  expires_at timestamptz not null check (expires_at > verified_at)
);
create index on public.university_verifications(university_id);
create table core_private.mail_challenges (
  user_id uuid primary key references public.profiles on delete cascade,
  school_email text not null, university_id uuid not null references public.universities,
  digest bytea not null, issued_at timestamptz not null default now()
);
create index on core_private.mail_challenges(school_email,issued_at);
create function core_private.create_identity() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id) values (new.id);
  insert into public.private_profiles(id) values (new.id);
  insert into public.user_roles values (new.id,'member');
  return new;
end $$;
revoke all on function core_private.create_identity() from public,anon,authenticated;
create trigger core_signup after insert on auth.users for each row execute function core_private.create_identity();
insert into public.profiles(id) select id from auth.users;
insert into public.private_profiles(id) select id from public.profiles;
insert into public.user_roles select id,'member' from public.profiles;

do $$
declare t text;
begin
  foreach t in array array['universities','campuses','departments','university_email_domains','profiles','private_profiles','user_roles','university_verifications'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
  foreach t in array array['universities','campuses','departments','university_email_domains'] loop
    execute format('grant select on public.%I to anon,authenticated',t);
    execute format('create policy catalog_read on public.%I for select to anon,authenticated using (true)',t);
  end loop;
end $$;
grant select on public.profiles,public.private_profiles,public.user_roles,public.university_verifications to authenticated;
create policy nickname_read on public.profiles for select to authenticated using (true);
create policy private_read on public.private_profiles for select to authenticated using (id=(select auth.uid()));
create policy role_read on public.user_roles for select to authenticated using (user_id=(select auth.uid()));
create policy verification_read on public.university_verifications for select to authenticated using (user_id=(select auth.uid()));

-- Narrow mutation surface; update both profile rows or neither. Caller cannot supply a subject ID.
create function public.save_my_profile(p_nickname text,p_university uuid default null,p_campus uuid default null,p_department uuid default null,p_student_number text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set nickname=btrim(p_nickname) where id=auth.uid();
  if not found then raise exception 'profile_missing'; end if;
  update public.private_profiles set university_id=p_university,campus_id=p_campus,
    department_id=p_department,student_number=nullif(btrim(p_student_number),'') where id=auth.uid();
end $$;
create function public.my_verified_university() returns uuid language sql stable security invoker set search_path = '' as $$
 select university_id from public.university_verifications where user_id=auth.uid() and expires_at>now()
$$;
create function public.has_my_role(p_role public.app_role) returns boolean language sql stable security invoker set search_path = '' as $$
 select case when p_role='verified_student' then public.my_verified_university() is not null
 else exists(select 1 from public.user_roles where user_id=auth.uid() and role=p_role) end
$$;

-- Only the mail sender can issue a challenge; the raw random secret never enters an exposed table.
create function public.issue_school_challenge(p_user uuid,p_email text,p_digest bytea) returns text
language plpgsql security definer set search_path = '' as $$
declare school uuid; email text := lower(btrim(p_email));
begin
  if email !~ '^[^@[:space:]]+@[^@[:space:]]+$' or length(email)>254 or octet_length(p_digest)<>32 then return 'invalid'; end if;
  select university_id into school from public.university_email_domains where domain=split_part(email,'@',2);
  if school is null then return 'unknown_domain'; end if;
  perform 1 from public.profiles where id=p_user for update;
  if not found then return 'invalid'; end if;
  perform pg_advisory_xact_lock(hashtextextended(email,0));
  if exists(select from core_private.mail_challenges where (user_id=p_user or school_email=email) and issued_at>now()-interval '1 minute')
    then return 'rate_limited'; end if;
  insert into core_private.mail_challenges values(p_user,email,school,p_digest,now())
    on conflict(user_id) do update set school_email=excluded.school_email,university_id=excluded.university_id,
    digest=excluded.digest,issued_at=excluded.issued_at;
  return 'issued';
end $$;
create function public.confirm_school_email(p_code uuid) returns boolean language plpgsql security definer set search_path = '' as $$
declare c core_private.mail_challenges;
begin
  delete from core_private.mail_challenges where user_id=auth.uid() and issued_at>now()-interval '10 minutes'
    and digest=sha256(convert_to(p_code::text,'UTF8')) returning * into c;
  if not found then return false; end if;
  if not exists(select from public.university_email_domains where domain=split_part(c.school_email,'@',2) and university_id=c.university_id)
    then return false; end if;
  begin
    -- A previously verified address can be claimed again after its proof expires.
    delete from public.university_verifications where school_email=c.school_email and expires_at<=now();
    insert into public.university_verifications values(c.user_id,c.university_id,c.school_email,now(),now()+interval '180 days')
      on conflict(user_id) do update set university_id=excluded.university_id,school_email=excluded.school_email,
      verified_at=excluded.verified_at,expires_at=excluded.expires_at;
  exception when unique_violation then return false;
  end;
  return true;
end $$;
revoke all on function public.issue_school_challenge(uuid,text,bytea) from public,anon,authenticated;
grant execute on function public.issue_school_challenge(uuid,text,bytea) to service_role;
revoke all on function public.save_my_profile(text,uuid,uuid,uuid,text),public.my_verified_university(),public.has_my_role(public.app_role),public.confirm_school_email(uuid) from public,anon;
grant execute on function public.save_my_profile(text,uuid,uuid,uuid,text),public.my_verified_university(),public.has_my_role(public.app_role),public.confirm_school_email(uuid) to authenticated;

-- Avatars are normalized PNGs written by core-account. Clients can only read their own file.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('core-avatars','core-avatars',false,2097152,array['image/png']);
create policy core_read_own_avatar on storage.objects for select to authenticated
using (bucket_id='core-avatars' and name=(select auth.uid())::text || '/avatar.png');

create function core_private.touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
do $$
declare t text;
begin
  foreach t in array array['universities','campuses','departments','university_email_domains','profiles','private_profiles','user_roles','university_verifications'] loop
    execute format('alter table public.%I add created_at timestamptz not null default now(), add updated_at timestamptz not null default now()',t);
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function core_private.touch_updated_at()',t);
  end loop;
end $$;
