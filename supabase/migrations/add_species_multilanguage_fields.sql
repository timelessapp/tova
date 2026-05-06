ALTER TABLE public.species
  ADD COLUMN IF NOT EXISTS description_ca text,
  ADD COLUMN IF NOT EXISTS description_es text,
  ADD COLUMN IF NOT EXISTS habitat_ca text,
  ADD COLUMN IF NOT EXISTS habitat_es text,
  ADD COLUMN IF NOT EXISTS curiosities_ca text[],
  ADD COLUMN IF NOT EXISTS curiosities_es text[];

UPDATE public.species
SET
  description_es = COALESCE(description_es, description),
  habitat_es = COALESCE(habitat_es, habitat),
  curiosities_es = COALESCE(curiosities_es, curiosities);