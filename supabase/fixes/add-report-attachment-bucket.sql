-- Run this in Supabase SQL Editor to enable screenshot/photo uploads for
-- discrepancy reports without rerunning the full schema.sql file.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'discrepancy-report-attachments',
  'discrepancy-report-attachments',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "report attachments authenticated upload" on storage.objects;
create policy "report attachments authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'discrepancy-report-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "report attachments public read" on storage.objects;
create policy "report attachments public read"
  on storage.objects for select
  to public
  using (bucket_id = 'discrepancy-report-attachments');
