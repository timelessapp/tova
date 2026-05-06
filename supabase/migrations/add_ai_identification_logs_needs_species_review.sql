alter table public.ai_identification_logs
  add column if not exists needs_species_review boolean not null default false;