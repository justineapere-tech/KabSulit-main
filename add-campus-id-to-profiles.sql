-- Add campus_id column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS campus_id TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN profiles.campus_id IS 'Campus or school ID of the user';
