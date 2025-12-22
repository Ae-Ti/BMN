-- schema.sql: idempotent ALTER statements for H2 (dev)
-- Add OAuth/profile related columns to site_user if they don't exist

ALTER TABLE site_user ADD COLUMN IF NOT EXISTS email_verified BOOLEAN;
ALTER TABLE site_user ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN DEFAULT TRUE;
ALTER TABLE site_user ADD COLUMN IF NOT EXISTS provider VARCHAR(255);
ALTER TABLE site_user ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);
-- Add date_of_birth (nullable) to support LocalDate mapping on SiteUser
ALTER TABLE site_user ADD COLUMN IF NOT EXISTS date_of_birth DATE;
-- Add email_public (default FALSE = 비공개)
ALTER TABLE site_user ADD COLUMN IF NOT EXISTS email_public BOOLEAN DEFAULT FALSE;
-- Add private_account (default FALSE)
ALTER TABLE site_user ADD COLUMN IF NOT EXISTS private_account BOOLEAN DEFAULT FALSE;

-- Ensure existing rows have profile_complete set
UPDATE site_user SET profile_complete = TRUE WHERE profile_complete IS NULL;
-- Ensure existing rows have email_public set to FALSE
UPDATE site_user SET email_public = FALSE WHERE email_public IS NULL;
-- Ensure existing rows have private_account set to FALSE
UPDATE site_user SET private_account = FALSE WHERE private_account IS NULL;

-- If the DB previously created a UNIQUE constraint/index on nickname, remove it.
-- These DROP statements are idempotent (IF EXISTS) and try common names used by hibernate/H2.
ALTER TABLE site_user DROP CONSTRAINT IF EXISTS UK_SITE_USER_NICKNAME;
ALTER TABLE site_user DROP CONSTRAINT IF EXISTS UK_NICKNAME;
DROP INDEX IF EXISTS IDX_SITE_USER_NICKNAME;
DROP INDEX IF EXISTS IDX_NICKNAME;

-- Create pending_email_change table if not exists (for email change verification)
CREATE TABLE IF NOT EXISTS pending_email_change (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    new_email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL
);
