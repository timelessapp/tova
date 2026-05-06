alter table public.ai_identification_logs
  add column if not exists species_count integer,
  add column if not exists candidate_species_snapshot jsonb,
  add column if not exists uncertain_reason text,
  add column if not exists model_raw_response jsonb;