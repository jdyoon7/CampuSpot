insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('discount-evidence','discount-evidence',false,2097152,array['image/png']);

-- The report's RLS controls reads (reporter and administrators reviewing a pending report).
-- No client write policy: the ingestion function decodes the file before upload.
create policy discount_evidence_read on storage.objects for select to authenticated
using (
  bucket_id = 'discount-evidence' and exists (
    select 1 from public.discount_reports r
    where r.id = case when storage.filename(name) ~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\.png$'
      then left(storage.filename(name),36)::uuid end
    and name = r.reporter_id::text || '/' || r.id::text || '.png'
  )
);

create function public.list_discount_evidence(p_report_ids uuid[])
returns table(report_id uuid, object_path text)
language sql stable security invoker set search_path = '' as $$
  select r.id,o.name from public.discount_reports r
  join storage.objects o on o.bucket_id='discount-evidence'
    and o.name=r.reporter_id::text || '/' || r.id::text || '.png'
  where cardinality(p_report_ids) between 1 and 100 and r.id=any(p_report_ids)
$$;
revoke all on function public.list_discount_evidence(uuid[]) from public,anon,authenticated;
grant execute on function public.list_discount_evidence(uuid[]) to authenticated;

create function public.list_discount_map_businesses(p_limit integer default 20,p_offset integer default 0)
returns table(id uuid,name text,branch_name text,address text,offer_count integer)
language sql stable security definer set search_path = '' as $$
  select b.id,b.name,b.branch_name,b.address,count(*)::integer
  from public.businesses b join public.discount_reports r on r.business_id=b.id
  where r.status='approved' and r.withdrawn_at is null
    and (r.ends_on is null or r.ends_on >= (now() at time zone 'Asia/Seoul')::date)
  group by b.id
  order by b.name,b.branch_name,b.id
  limit greatest(1,least(coalesce(p_limit,20),100)) offset greatest(0,coalesce(p_offset,0))
$$;
revoke all on function public.list_discount_map_businesses(integer,integer) from public,anon,authenticated;
grant execute on function public.list_discount_map_businesses(integer,integer) to anon,authenticated;
