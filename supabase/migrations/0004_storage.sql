insert into storage.buckets (id, name, public)
values ('case-files', 'case-files', false)
on conflict (id) do nothing;

drop policy if exists "staff_can_upload_case_files" on storage.objects;
drop policy if exists "staff_can_update_case_files" on storage.objects;
drop policy if exists "staff_can_delete_case_files" on storage.objects;

create policy "staff_can_upload_case_files"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'case-files'
  and (storage.foldername(name))[1] = 'org'
  and app.is_org_staff(((storage.foldername(name))[2])::uuid)
);

create policy "staff_can_update_case_files"
on storage.objects
for update to authenticated
using (
  bucket_id = 'case-files'
  and (storage.foldername(name))[1] = 'org'
  and app.is_org_staff(((storage.foldername(name))[2])::uuid)
)
with check (
  bucket_id = 'case-files'
  and (storage.foldername(name))[1] = 'org'
  and app.is_org_staff(((storage.foldername(name))[2])::uuid)
);

create policy "staff_can_delete_case_files"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'case-files'
  and (storage.foldername(name))[1] = 'org'
  and app.is_org_staff(((storage.foldername(name))[2])::uuid)
);
