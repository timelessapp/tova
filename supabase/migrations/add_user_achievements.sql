CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id uuid NOT NULL,
  achievement_key text NOT NULL,
  achievement_label text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  source text NOT NULL DEFAULT 'capture',
  CONSTRAINT user_achievements_pkey PRIMARY KEY (user_id, achievement_key),
  CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS user_achievements_user_id_unlocked_at_idx
  ON public.user_achievements (user_id, unlocked_at DESC);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own achievements" ON public.user_achievements;
CREATE POLICY "Users can read own achievements"
  ON public.user_achievements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;
CREATE POLICY "Users can insert own achievements"
  ON public.user_achievements
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
