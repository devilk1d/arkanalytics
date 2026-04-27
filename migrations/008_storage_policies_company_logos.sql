-- =========================================================
-- Arkanalytics: Storage policies for company logos
-- =========================================================
-- Bucket: files
-- Folder/path: company-logos/*

-- Allow authenticated users to upload company logos into the public files bucket.
create policy "files_insert_company_logos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'files'
  and name like 'company-logos/%'
);

-- Allow authenticated users to read logo objects from the same bucket/folder.
create policy "files_select_company_logos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'files'
  and name like 'company-logos/%'
);

-- Allow authenticated users to update their uploaded logo objects if needed.
create policy "files_update_company_logos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'files'
  and name like 'company-logos/%'
)
with check (
  bucket_id = 'files'
  and name like 'company-logos/%'
);

-- Allow authenticated users to delete their uploaded logo objects if needed.
create policy "files_delete_company_logos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'files'
  and name like 'company-logos/%'
);