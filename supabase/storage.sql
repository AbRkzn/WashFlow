-- WashFlow photo storage.
-- Deferred photo binaries live in a private `photos` bucket (free tier:
-- 1GB storage). Only the photo *metadata* row rides the sync engine; the
-- binary is uploaded/downloaded here directly with the user's auth session.
--
-- Idempotent: safe to re-run.

-- The bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  false,                                   -- private; access via authenticated policies
  5 * 1024 * 1024,                         -- 5MB per file (photos are ≤1280px q0.7)
  array['image/jpeg']::text[]
)
on conflict (id) do nothing;

-- Authenticated users may read and write objects in the photos bucket.
-- Policy names are dropped first so re-runs replace rather than duplicate.
drop policy if exists "photos_authenticated_select" on storage.objects;
create policy "photos_authenticated_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'photos');

drop policy if exists "photos_authenticated_insert" on storage.objects;
create policy "photos_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'photos');

drop policy if exists "photos_authenticated_update" on storage.objects;
create policy "photos_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'photos')
  with check (bucket_id = 'photos');

drop policy if exists "photos_authenticated_delete" on storage.objects;
create policy "photos_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'photos');
