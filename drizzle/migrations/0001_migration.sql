ALTER TABLE public.profiles
  ADD COLUMN username text,
  ADD COLUMN background text NOT NULL DEFAULT 'midnight',
  ADD COLUMN accent text NOT NULL DEFAULT 'lime';

UPDATE public.profiles SET username = 'user' || substr(replace(id::text,'-',''),1,8) WHERE username IS NULL;
ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX profiles_username_key ON public.profiles (lower(username));

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, username)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Your Name'),
    'user' || substr(replace(NEW.id::text,'-',''),1,8));
  RETURN NEW;
END $$;

DROP POLICY "own select" ON public.profiles;
GRANT SELECT ON public.profiles TO anon;
CREATE POLICY "profiles are public" ON public.profiles FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.follows (
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT SELECT ON public.follows TO anon;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows readable" ON public.follows FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "follow as self" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id AND follower_id <> following_id);
CREATE POLICY "unfollow as self" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

UPDATE public.profiles SET username = 'demo' WHERE id = '9f41c428-3d6f-4023-b65f-2ec6afc46b09';