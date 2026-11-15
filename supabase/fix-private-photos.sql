-- Run once on the existing project (SQL editor) to lock down the photos bucket.
update storage.buckets set public = false where id = 'photos';

drop policy if exists "Public read access" on storage.objects;
create policy "Users can read own folder" on storage.objects for select
  to authenticated
  using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);
