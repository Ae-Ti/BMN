-- schema.sql: idempotent ALTER statements for H2 (dev)
-- Add OAuth/profile related columns to site_user if they don't exist

ALTER TABLE site_user ADD COLUMN IF NOT EXISTS email_verified BOOLEAN;
ALTER TABLE site_user ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN DEFAULT TRUE;
ALTER TABLE site_user ADD COLUMN IF NOT EXISTS provider VARCHAR(255);
ALTER TABLE site_user ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);

-- Ensure existing rows have profile_complete set
UPDATE site_user SET profile_complete = TRUE WHERE profile_complete IS NULL;

-- If the DB previously created a UNIQUE constraint/index on nickname, remove it.
-- These DROP statements are idempotent (IF EXISTS) and try common names used by hibernate/H2.
ALTER TABLE site_user DROP CONSTRAINT IF EXISTS UK_SITE_USER_NICKNAME;
ALTER TABLE site_user DROP CONSTRAINT IF EXISTS UK_NICKNAME;
DROP INDEX IF EXISTS IDX_SITE_USER_NICKNAME;
DROP INDEX IF EXISTS IDX_NICKNAME;
