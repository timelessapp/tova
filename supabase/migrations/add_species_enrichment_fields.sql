ALTER TABLE public.species DROP COLUMN IF EXISTS image_emoji;

ALTER TABLE public.species
  ADD COLUMN IF NOT EXISTS size_range text,
  ADD COLUMN IF NOT EXISTS weight_range text,
  ADD COLUMN IF NOT EXISTS lifespan text,
  ADD COLUMN IF NOT EXISTS diet text,
  ADD COLUMN IF NOT EXISTS activity text,
  ADD COLUMN IF NOT EXISTS conservation_status text;

UPDATE public.species
SET
  size_range         = '12–14 cm',
  weight_range       = '16–22 g',
  lifespan           = '1–3 años',
  diet               = 'Insectos y pequeños invertebrados',
  activity           = 'Diurna',
  conservation_status = 'Común'
WHERE scientific_name = 'Erithacus rubecula';

UPDATE public.species
SET
  size_range         = '100–160 cm (longitud)',
  weight_range       = '35–100 kg',
  lifespan           = '10–20 años',
  diet               = 'Herbívora',
  activity           = 'Diurna',
  conservation_status = 'Estable'
WHERE scientific_name = 'Capra pyrenaica';
