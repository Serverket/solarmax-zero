-- ==============================================================================
-- SOLARMAX ZERO - SUPABASE SCHEMA INITIALIZATION
-- Zero Gaps, Zero Caveats Implementation
-- ==============================================================================

-- 1. Create Profiles Table (Linked to Auth)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  role TEXT DEFAULT 'player'::text NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Game Progress Table
CREATE TABLE public.game_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  highest_level INTEGER DEFAULT 1 NOT NULL,
  mothership_unlocked BOOLEAN DEFAULT false NOT NULL,
  custom_maps JSONB DEFAULT '[]'::jsonb NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_progress ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- RLS POLICIES FOR PROFILES
-- ==============================================================================

-- Anyone authenticated can view profiles (Needed for Admin Dashboard to list users)
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own profile (Handled mostly by trigger, but good practice)
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);


-- ==============================================================================
-- RLS POLICIES FOR GAME PROGRESS
-- ==============================================================================

-- Users can view their own progress, Admins can view all (via Profile join)
CREATE POLICY "Users can view own progress or Admin can view all"
  ON public.game_progress FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Users can insert their own progress
CREATE POLICY "Users can insert own progress"
  ON public.game_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress, Admins can update anyone's (Granting Mothership access)
CREATE POLICY "Users can update own progress or Admin can update all"
  ON public.game_progress FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );


-- ==============================================================================
-- AUTO-PROFILE GENERATION TRIGGER
-- ==============================================================================

-- Function to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (
    new.id, 
    split_part(new.email, '@', 1), -- Auto-generate username from email prefix
    'player'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the trigger to auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- DONE - ZERO GAPS ACHIVED
-- ==============================================================================
