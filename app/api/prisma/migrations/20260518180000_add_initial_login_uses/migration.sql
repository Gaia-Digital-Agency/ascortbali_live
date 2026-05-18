-- Counter for the creator initial-login (/creator/initial-login) page.
-- Increments on every successful match of phone_number + temp_password.
-- The endpoint refuses to issue a token once this hits 3, so a leaked
-- temp_password is bounded in usefulness and creators are pushed onto
-- the normal /creator login (or /creator/register) afterwards.
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS initial_login_uses INTEGER NOT NULL DEFAULT 0;
