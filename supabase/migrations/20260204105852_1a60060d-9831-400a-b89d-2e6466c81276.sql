-- Create trigger to automatically insert a profile row when a new user signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Back-fill profiles for any existing auth users that don't have one
INSERT INTO public.profiles (user_id, email, full_name, role)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email),
  COALESCE((raw_user_meta_data->>'role')::public.user_role, 'fan')
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT (user_id) DO NOTHING;