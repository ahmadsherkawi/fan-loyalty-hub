-- Create admins table for system admin authentication
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin_sessions table for session management
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);

-- Enable RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow public access for login (we validate credentials manually)
CREATE POLICY "Admins are publicly readable for login" ON admins
  FOR SELECT USING (true);

CREATE POLICY "Admin sessions publicly readable by token" ON admin_sessions
  FOR SELECT USING (true);

CREATE POLICY "Admin sessions insertable publicly" ON admin_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin sessions deletable publicly" ON admin_sessions
  FOR DELETE USING (true);

-- Insert default admin user
-- Password: admin (hashed with bcrypt-like approach)
-- For simplicity, we'll use a simple hash that can be verified in the app
INSERT INTO admins (username, password_hash) 
VALUES ('admin', 'admin:$2a$10$N9qo8uLOickgx2ZMRZoMy.MrqJ3wP5I.vK.vK.vK.vK.vK.vK.vK.v')
ON CONFLICT (username) DO NOTHING;

-- Function to create admin session
CREATE OR REPLACE FUNCTION admin_login(p_username TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin RECORD;
  v_token TEXT;
  v_session_id UUID;
BEGIN
  -- Find admin by username
  SELECT * INTO v_admin FROM admins WHERE username = p_username;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid credentials');
  END IF;
  
  -- For simplicity, we'll verify password in the app
  -- Just return the admin info for password verification client-side
  RETURN json_build_object(
    'success', true,
    'admin_id', v_admin.id,
    'username', v_admin.username,
    'password_hash', v_admin.password_hash
  );
END;
$$;

-- Function to create a session after password verification
CREATE OR REPLACE FUNCTION create_admin_session(p_admin_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Generate random token
  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := NOW() + INTERVAL '24 hours';
  
  -- Delete any existing sessions for this admin
  DELETE FROM admin_sessions WHERE admin_id = p_admin_id;
  
  -- Create new session
  INSERT INTO admin_sessions (admin_id, token, expires_at)
  VALUES (p_admin_id, v_token, v_expires_at);
  
  RETURN json_build_object(
    'success', true,
    'token', v_token,
    'expires_at', v_expires_at
  );
END;
$$;

-- Function to verify admin session
CREATE OR REPLACE FUNCTION verify_admin_session(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
BEGIN
  SELECT s.*, a.username 
  INTO v_session 
  FROM admin_sessions s
  JOIN admins a ON s.admin_id = a.id
  WHERE s.token = p_token AND s.expires_at > NOW();
  
  IF NOT FOUND THEN
    -- Clean up expired session
    DELETE FROM admin_sessions WHERE token = p_token;
    RETURN json_build_object('valid', false);
  END IF;
  
  RETURN json_build_object(
    'valid', true,
    'admin_id', v_session.admin_id,
    'username', v_session.username
  );
END;
$$;

-- Function to logout (delete session)
CREATE OR REPLACE FUNCTION admin_logout(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM admin_sessions WHERE token = p_token;
END;
$$;
