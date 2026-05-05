alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists language text not null default 'ca';

alter table public.profiles
  drop constraint if exists profiles_language_check;

alter table public.profiles
  add constraint profiles_language_check check (language in ('ca', 'es'));

update public.profiles
set language = 'ca'
where language is null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read profile avatars" on storage.objects;
create policy "Public can read profile avatars"
  on storage.objects for select
  to public
  using (bucket_id = 'profile-avatars');

drop policy if exists "Users can upload own profile avatar" on storage.objects;
create policy "Users can upload own profile avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "Users can update own profile avatar" on storage.objects;
create policy "Users can update own profile avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "Users can delete own profile avatar" on storage.objects;
create policy "Users can delete own profile avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
