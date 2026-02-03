-- Create user role enum
CREATE TYPE public.user_role AS ENUM ('club_admin', 'fan');

-- Create club verification status enum
CREATE TYPE public.club_status AS ENUM ('unverified', 'verified', 'official');

-- Create activity frequency enum
CREATE TYPE public.activity_frequency AS ENUM ('once_ever', 'once_per_match', 'once_per_day', 'unlimited');

-- Create verification method enum
CREATE TYPE public.verification_method AS ENUM ('qr_scan', 'location_checkin', 'in_app_completion', 'manual_proof');

-- Create redemption method enum
CREATE TYPE public.redemption_method AS ENUM ('voucher', 'manual_fulfillment', 'code_display');

-- Create manual claim status enum
CREATE TYPE public.claim_status AS ENUM ('pending', 'approved', 'rejected');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'fan',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create clubs table
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1a7a4c',
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  stadium_name TEXT,
  season_start DATE,
  season_end DATE,
  status club_status NOT NULL DEFAULT 'unverified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create club verification table
CREATE TABLE public.club_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL UNIQUE,
  official_email_domain TEXT,
  public_link TEXT,
  authority_declaration BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create loyalty programs table
CREATE TABLE public.loyalty_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  points_currency_name TEXT NOT NULL DEFAULT 'Points',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create activities table
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.loyalty_programs(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  points_awarded INTEGER NOT NULL CHECK (points_awarded > 0),
  frequency activity_frequency NOT NULL,
  verification_method verification_method NOT NULL,
  qr_code_data TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_radius_meters INTEGER DEFAULT 100,
  time_window_start TIMESTAMPTZ,
  time_window_end TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create fan memberships table (fan can only join one club)
CREATE TABLE public.fan_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  program_id UUID REFERENCES public.loyalty_programs(id) ON DELETE CASCADE NOT NULL,
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create activity completions table
CREATE TABLE public.activity_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE NOT NULL,
  fan_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  membership_id UUID REFERENCES public.fan_memberships(id) ON DELETE CASCADE NOT NULL,
  points_earned INTEGER NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create manual claims table
CREATE TABLE public.manual_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE NOT NULL,
  fan_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  membership_id UUID REFERENCES public.fan_memberships(id) ON DELETE CASCADE NOT NULL,
  proof_url TEXT,
  proof_description TEXT,
  status claim_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create rewards table
CREATE TABLE public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.loyalty_programs(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  quantity_limit INTEGER,
  quantity_redeemed INTEGER DEFAULT 0,
  redemption_method redemption_method NOT NULL,
  voucher_code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create reward redemptions table
CREATE TABLE public.reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id UUID REFERENCES public.rewards(id) ON DELETE CASCADE NOT NULL,
  fan_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  membership_id UUID REFERENCES public.fan_memberships(id) ON DELETE CASCADE NOT NULL,
  points_spent INTEGER NOT NULL,
  redemption_code TEXT,
  fulfilled_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_clubs_status ON public.clubs(status);
CREATE INDEX idx_clubs_admin ON public.clubs(admin_id);
CREATE INDEX idx_activities_program ON public.activities(program_id);
CREATE INDEX idx_fan_memberships_fan ON public.fan_memberships(fan_id);
CREATE INDEX idx_fan_memberships_club ON public.fan_memberships(club_id);
CREATE INDEX idx_activity_completions_fan ON public.activity_completions(fan_id);
CREATE INDEX idx_activity_completions_activity ON public.activity_completions(activity_id);
CREATE INDEX idx_manual_claims_status ON public.manual_claims(status);
CREATE INDEX idx_rewards_program ON public.rewards(program_id);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Clubs policies
CREATE POLICY "Anyone can view verified clubs"
  ON public.clubs FOR SELECT
  USING (status IN ('verified', 'official'));

CREATE POLICY "Club admins can view their own club regardless of status"
  ON public.clubs FOR SELECT
  USING (admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Club admins can update their own club"
  ON public.clubs FOR UPDATE
  USING (admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated users can create clubs"
  ON public.clubs FOR INSERT
  WITH CHECK (admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Club verifications policies
CREATE POLICY "Club admins can view their verification"
  ON public.club_verifications FOR SELECT
  USING (club_id IN (SELECT id FROM public.clubs WHERE admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

CREATE POLICY "Club admins can insert verification"
  ON public.club_verifications FOR INSERT
  WITH CHECK (club_id IN (SELECT id FROM public.clubs WHERE admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

CREATE POLICY "Club admins can update verification"
  ON public.club_verifications FOR UPDATE
  USING (club_id IN (SELECT id FROM public.clubs WHERE admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

-- Loyalty programs policies
CREATE POLICY "Anyone can view active programs of verified clubs"
  ON public.loyalty_programs FOR SELECT
  USING (
    is_active = true AND 
    club_id IN (SELECT id FROM public.clubs WHERE status IN ('verified', 'official'))
  );

CREATE POLICY "Club admins can view their own program"
  ON public.loyalty_programs FOR SELECT
  USING (club_id IN (SELECT id FROM public.clubs WHERE admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

CREATE POLICY "Club admins can manage their program"
  ON public.loyalty_programs FOR ALL
  USING (club_id IN (SELECT id FROM public.clubs WHERE admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

-- Activities policies
CREATE POLICY "Anyone can view active activities of verified clubs"
  ON public.activities FOR SELECT
  USING (
    is_active = true AND 
    program_id IN (
      SELECT lp.id FROM public.loyalty_programs lp
      JOIN public.clubs c ON c.id = lp.club_id
      WHERE c.status IN ('verified', 'official')
    )
  );

CREATE POLICY "Club admins can view their activities"
  ON public.activities FOR SELECT
  USING (program_id IN (
    SELECT lp.id FROM public.loyalty_programs lp
    JOIN public.clubs c ON c.id = lp.club_id
    WHERE c.admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  ));

CREATE POLICY "Club admins can manage activities"
  ON public.activities FOR ALL
  USING (program_id IN (
    SELECT lp.id FROM public.loyalty_programs lp
    JOIN public.clubs c ON c.id = lp.club_id
    WHERE c.admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  ));

-- Fan memberships policies
CREATE POLICY "Fans can view their own membership"
  ON public.fan_memberships FOR SELECT
  USING (fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Fans can join a club"
  ON public.fan_memberships FOR INSERT
  WITH CHECK (fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Club admins can view their club's memberships"
  ON public.fan_memberships FOR SELECT
  USING (club_id IN (SELECT id FROM public.clubs WHERE admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

-- Activity completions policies
CREATE POLICY "Fans can view their completions"
  ON public.activity_completions FOR SELECT
  USING (fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Fans can insert completions"
  ON public.activity_completions FOR INSERT
  WITH CHECK (fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Club admins can view completions"
  ON public.activity_completions FOR SELECT
  USING (activity_id IN (
    SELECT a.id FROM public.activities a
    JOIN public.loyalty_programs lp ON lp.id = a.program_id
    JOIN public.clubs c ON c.id = lp.club_id
    WHERE c.admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  ));

-- Manual claims policies
CREATE POLICY "Fans can view their claims"
  ON public.manual_claims FOR SELECT
  USING (fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Fans can submit claims"
  ON public.manual_claims FOR INSERT
  WITH CHECK (fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Club admins can view and manage claims"
  ON public.manual_claims FOR ALL
  USING (activity_id IN (
    SELECT a.id FROM public.activities a
    JOIN public.loyalty_programs lp ON lp.id = a.program_id
    JOIN public.clubs c ON c.id = lp.club_id
    WHERE c.admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  ));

-- Rewards policies
CREATE POLICY "Anyone can view active rewards of verified clubs"
  ON public.rewards FOR SELECT
  USING (
    is_active = true AND 
    program_id IN (
      SELECT lp.id FROM public.loyalty_programs lp
      JOIN public.clubs c ON c.id = lp.club_id
      WHERE c.status IN ('verified', 'official')
    )
  );

CREATE POLICY "Club admins can view their rewards"
  ON public.rewards FOR SELECT
  USING (program_id IN (
    SELECT lp.id FROM public.loyalty_programs lp
    JOIN public.clubs c ON c.id = lp.club_id
    WHERE c.admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  ));

CREATE POLICY "Club admins can manage rewards"
  ON public.rewards FOR ALL
  USING (program_id IN (
    SELECT lp.id FROM public.loyalty_programs lp
    JOIN public.clubs c ON c.id = lp.club_id
    WHERE c.admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  ));

-- Reward redemptions policies
CREATE POLICY "Fans can view their redemptions"
  ON public.reward_redemptions FOR SELECT
  USING (fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Fans can redeem rewards"
  ON public.reward_redemptions FOR INSERT
  WITH CHECK (fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Club admins can view redemptions"
  ON public.reward_redemptions FOR SELECT
  USING (reward_id IN (
    SELECT r.id FROM public.rewards r
    JOIN public.loyalty_programs lp ON lp.id = r.program_id
    JOIN public.clubs c ON c.id = lp.club_id
    WHERE c.admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  ));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clubs_updated_at
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_club_verifications_updated_at
  BEFORE UPDATE ON public.club_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loyalty_programs_updated_at
  BEFORE UPDATE ON public.loyalty_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fan_memberships_updated_at
  BEFORE UPDATE ON public.fan_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_manual_claims_updated_at
  BEFORE UPDATE ON public.manual_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rewards_updated_at
  BEFORE UPDATE ON public.rewards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'fan')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to check club verification requirements
CREATE OR REPLACE FUNCTION public.check_verification_requirements(p_club_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER := 0;
  v_record RECORD;
BEGIN
  SELECT * INTO v_record FROM public.club_verifications WHERE club_id = p_club_id;
  
  IF v_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check official email domain (not Gmail, Yahoo, Outlook, etc.)
  IF v_record.official_email_domain IS NOT NULL AND 
     v_record.official_email_domain NOT LIKE '%gmail%' AND
     v_record.official_email_domain NOT LIKE '%yahoo%' AND
     v_record.official_email_domain NOT LIKE '%outlook%' AND
     v_record.official_email_domain NOT LIKE '%hotmail%' AND
     v_record.official_email_domain NOT LIKE '%live%' THEN
    v_count := v_count + 1;
  END IF;
  
  -- Check public link
  IF v_record.public_link IS NOT NULL AND v_record.public_link != '' THEN
    v_count := v_count + 1;
  END IF;
  
  -- Check authority declaration
  IF v_record.authority_declaration = true THEN
    v_count := v_count + 1;
  END IF;
  
  -- Need at least 2 of 3
  RETURN v_count >= 2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update club status based on verification
CREATE OR REPLACE FUNCTION public.update_club_verification_status()
RETURNS TRIGGER AS $$
BEGIN
  IF public.check_verification_requirements(NEW.club_id) THEN
    UPDATE public.clubs 
    SET status = 'verified', updated_at = now()
    WHERE id = NEW.club_id AND status = 'unverified';
    
    NEW.verified_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER check_club_verification
  AFTER INSERT OR UPDATE ON public.club_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_club_verification_status();

-- Function to award points
CREATE OR REPLACE FUNCTION public.award_points(
  p_membership_id UUID,
  p_points INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.fan_memberships
  SET points_balance = points_balance + p_points, updated_at = now()
  WHERE id = p_membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to spend points
CREATE OR REPLACE FUNCTION public.spend_points(
  p_membership_id UUID,
  p_points INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INTEGER;
BEGIN
  SELECT points_balance INTO v_current_balance
  FROM public.fan_memberships
  WHERE id = p_membership_id;
  
  IF v_current_balance < p_points THEN
    RETURN FALSE;
  END IF;
  
  UPDATE public.fan_memberships
  SET points_balance = points_balance - p_points, updated_at = now()
  WHERE id = p_membership_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;