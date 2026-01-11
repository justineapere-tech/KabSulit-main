-- Add bio column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN profiles.bio IS 'User biography or about section, max 200 characters recommended';
