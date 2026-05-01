-- ============================================================================
-- POLITICAS RLS COMPLETAS PARA TOVA
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. TABLA: public.profiles
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 2. TABLA: public.species
-- ============================================================================
ALTER TABLE public.species ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can read active species" ON public.species;
CREATE POLICY "Everyone can read active species"
  ON public.species FOR SELECT
  TO public
  USING (is_active = true);

-- ============================================================================
-- 3. TABLA: public.sightings
-- ============================================================================
ALTER TABLE public.sightings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own sightings" ON public.sightings;
CREATE POLICY "Users can read own sightings"
  ON public.sightings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sightings" ON public.sightings;
CREATE POLICY "Users can insert own sightings"
  ON public.sightings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sightings" ON public.sightings;
CREATE POLICY "Users can update own sightings"
  ON public.sightings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 4. TABLA: public.user_achievements
-- ============================================================================
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own achievements" ON public.user_achievements;
CREATE POLICY "Users can read own achievements"
  ON public.user_achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;
CREATE POLICY "Users can insert own achievements"
  ON public.user_achievements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 5. BUCKET STORAGE: sighting-photos
-- ============================================================================
-- Nota: El bucket debe existir. Si no existe, créalo manualmente en Supabase Storage.
-- Una vez creado, ejecuta estas políticas:

DROP POLICY IF EXISTS "Users can upload own photos" ON storage.objects;
CREATE POLICY "Users can upload own photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'sighting-photos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated users can read sighting photos" ON storage.objects;
CREATE POLICY "Authenticated users can read sighting photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'sighting-photos');

DROP POLICY IF EXISTS "Public can read sighting photos" ON storage.objects;
CREATE POLICY "Public can read sighting photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'sighting-photos');

DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'sighting-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- FIN DE POLITICAS RLS
-- ============================================================================
