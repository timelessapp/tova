create table if not exists public.ai_identification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  image_url text,
  status text not null,
  best_common_name text,
  best_scientific_name text,
  best_confidence numeric,
  internal_suggestions jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists ai_identification_logs_user_id_idx
  on public.ai_identification_logs (user_id);

create index if not exists ai_identification_logs_created_at_idx
  on public.ai_identification_logs (created_at desc);

alter table public.ai_identification_logs enable row level security;

drop policy if exists "Users can insert own ai identification logs" on public.ai_identification_logs;
create policy "Users can insert own ai identification logs"
  on public.ai_identification_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own ai identification logs" on public.ai_identification_logs;
create policy "Users can read own ai identification logs"
  on public.ai_identification_logs for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Anonymous can insert anonymous ai identification logs" on public.ai_identification_logs;
create policy "Anonymous can insert anonymous ai identification logs"
  on public.ai_identification_logs for insert
  to anon
  with check (user_id is null);

grant insert on public.ai_identification_logs to anon;
grant insert, select on public.ai_identification_logs to authenticated;

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