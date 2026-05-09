-- Ensure the AI identification storage bucket exists and has the expected policies.
-- Safe to run multiple times.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ai-identification-images',
  'ai-identification-images',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read ai identification images" on storage.objects;
create policy "Public can read ai identification images"
  on storage.objects for select
  to public
  using (bucket_id = 'ai-identification-images');

drop policy if exists "Users can upload own ai identification images" on storage.objects;
create policy "Users can upload own ai identification images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'ai-identification-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Anon can upload anonymous ai identification images" on storage.objects;
create policy "Anon can upload anonymous ai identification images"
  on storage.objects for insert
  to anon
  with check (
    bucket_id = 'ai-identification-images'
    and (storage.foldername(name))[1] = 'anon'
  );
