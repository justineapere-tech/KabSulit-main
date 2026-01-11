-- Add soft-delete support to messages table
-- This allows users to hide messages from their view without deleting for the other user

-- Step 1: Add hidden_by column to track which users have hidden this message
ALTER TABLE messages ADD COLUMN IF NOT EXISTS hidden_by UUID[] DEFAULT '{}';

-- Step 2: Update RLS SELECT policy to exclude hidden messages
-- Drop old SELECT policy
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;

-- Create new SELECT policy that excludes hidden messages
CREATE POLICY "Users can view their own messages"
  ON messages
  FOR SELECT
  USING (
    (auth.uid() = sender_id OR auth.uid() = receiver_id)
    AND NOT (hidden_by @> ARRAY[auth.uid()])
  );

-- Step 3: Add UPDATE policy to allow users to hide messages
DROP POLICY IF EXISTS "Users cannot update messages" ON messages;

CREATE POLICY "Users can hide messages they are involved with"
  ON messages
  FOR UPDATE
  USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  )
  WITH CHECK (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

-- Keep the delete policy but it's now just for admin use
-- Users should use the UPDATE to add to hidden_by instead
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

CREATE POLICY "Only admins can delete messages"
  ON messages
  FOR DELETE
  USING (false);
