-- SQL to create users table, enum, and password helpers for PostgreSQL
-- Requires the pgcrypto extension (for crypt(), gen_salt(), gen_random_uuid()).

-- Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  last_login TIMESTAMPTZ,
  locked BOOLEAN NOT NULL DEFAULT TRUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger function to keep updated_at current
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Helper: create user (hashes password with bcrypt)
CREATE OR REPLACE FUNCTION create_user(
  p_username TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_password TEXT
) RETURNS UUID AS $$
DECLARE
  _id UUID;
BEGIN
  INSERT INTO users (username, first_name, last_name, password_hash)
  VALUES (
    p_username,
    p_first_name,
    p_last_name,
    crypt(p_password, gen_salt('bf', 12))
  )
  RETURNING id INTO _id;
  RETURN _id;
END;
$$ LANGUAGE plpgsql;

-- Helper: verify password for a username (returns true/false)
CREATE OR REPLACE FUNCTION verify_user_password(
  p_username TEXT,
  p_password TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  _hash TEXT;
BEGIN
  SELECT password_hash INTO _hash FROM users WHERE username = p_username;
  IF _hash IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN (_hash = crypt(p_password, _hash));
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper: set/replace user password (rehashes)
CREATE OR REPLACE FUNCTION set_user_password(
  p_user_id UUID,
  p_password TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET password_hash = crypt(p_password, gen_salt('bf', 12)),
      updated_at = now()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Sample usage (comments):
-- SELECT create_user('alice','Alice','Doe','S3cret!');
-- SELECT verify_user_password('alice','S3cret!');
-- SELECT set_user_password('<uuid-here>','NewP@ssw0rd');
-- Sessions table to track login sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  session_token VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_refresh TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (char_length(session_token) = 50 AND session_token ~ '^[A-Za-z0-9]+$')
);

CREATE INDEX IF NOT EXISTS idx_sessions_session_token ON sessions(session_token);

-- Helper: create session for a user (returns 50-char hex token)
CREATE OR REPLACE FUNCTION create_session(p_user_id UUID) RETURNS TEXT AS $$
DECLARE
  _token TEXT;
  _username TEXT;
BEGIN
  SELECT username INTO _username FROM users WHERE id = p_user_id;
  IF _username IS NULL THEN
    RAISE EXCEPTION 'user id % not found', p_user_id;
  END IF;
  _token := encode(gen_random_bytes(25),'hex'); -- 50 hex chars (0-9a-f)
  INSERT INTO sessions (user_id, username, session_token)
  VALUES (p_user_id, _username, _token);
  RETURN _token;
END;
$$ LANGUAGE plpgsql;

-- Helper: refresh session timestamp
CREATE OR REPLACE FUNCTION refresh_session(p_session_token TEXT) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE sessions SET last_refresh = now() WHERE session_token = p_session_token;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Helper: revoke (delete) a session by token
CREATE OR REPLACE FUNCTION revoke_session(p_session_token TEXT) RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM sessions WHERE session_token = p_session_token;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Helper: login(username,password) -> creates session when credentials valid and user not locked
CREATE OR REPLACE FUNCTION login(p_username TEXT, p_password TEXT) RETURNS TEXT AS $$
DECLARE
  _valid BOOLEAN;
  _user_id UUID;
  _is_locked BOOLEAN;
  _token TEXT;
BEGIN
  SELECT verify_user_password(p_username, p_password) INTO _valid;
  IF NOT COALESCE(_valid, FALSE) THEN
    RETURN NULL;
  END IF;

  SELECT id, locked INTO _user_id, _is_locked FROM users WHERE username = p_username;
  IF _user_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF _is_locked THEN
    RETURN NULL;
  END IF;

  _token := create_session(_user_id);
  RETURN _token;
END;
$$ LANGUAGE plpgsql;

-- Helper: logout(session_token) -> revokes session if user is not locked, fails if user is locked
CREATE OR REPLACE FUNCTION logout(p_session_token TEXT) RETURNS BOOLEAN AS $$
DECLARE
  _username TEXT;
  _is_locked BOOLEAN;
BEGIN
  SELECT username INTO _username FROM sessions WHERE session_token = p_session_token;
  IF _username IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT locked INTO _is_locked FROM users WHERE username = _username;
  IF _is_locked THEN
    RETURN FALSE;
  END IF;

  RETURN revoke_session(p_session_token);
END;
$$ LANGUAGE plpgsql;

-- Helper: logout all sessions for a username
CREATE OR REPLACE FUNCTION logout_all_sessions(p_username TEXT) RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM sessions
  WHERE username = p_username;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Helper: lock(username) -> sets locked field to true
CREATE OR REPLACE FUNCTION lock(p_username TEXT) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users SET locked = TRUE WHERE username = p_username;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Helper: unlock(username) -> sets locked field to false
CREATE OR REPLACE FUNCTION unlock(p_username TEXT) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users SET locked = FALSE WHERE username = p_username;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Helper: delete_user(username) -> removes user and all associated sessions
CREATE OR REPLACE FUNCTION delete_user(p_username TEXT) RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM users WHERE username = p_username;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Sample usage (comments):
-- SELECT create_user('alice','Alice','Doe','S3cret!');
-- SELECT delete_user('alice'); -- removes user and sessions
-- SELECT verify_user_password('alice','S3cret!');
-- SELECT set_user_password('<uuid-here>','NewP@ssw0rd');
-- SELECT create_session('<user-uuid>'); -- returns session token
-- SELECT refresh_session('<session-token>'); -- updates last_refresh
-- SELECT revoke_session('<session-token>'); -- removes session

-- Notes:
-- - Uses bcrypt via crypt(gen_salt('bf', cost)). Adjust cost (12) as needed for your environment.
-- - The file creates the pgcrypto extension if missing; in managed DBs you may need to enable it separately.
-- - This file is intended to be reviewed before applying in production.
