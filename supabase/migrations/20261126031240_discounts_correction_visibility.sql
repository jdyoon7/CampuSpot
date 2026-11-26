-- The public API needs only the fields used by the author history and review queue.
revoke select on public.discount_corrections from authenticated;
grant select (id, reporter_id, kind, store_name, current_details, proposed_details,
  source_url, report_note, status, rejection_reason, created_at)
  on public.discount_corrections to authenticated;
