-- Fix RLS UPDATE policy for messages table to allow soft-delete
-- This allows users to update the hidden_by array for messages they are involved with

-- Drop the old restrictive UPDATE policy
DROP POLICY IF EXISTS "Users can update their message hidden_by status" ON messages;

-- Create new UPDATE policy that allows users to update hidden_by column
CREATE POLICY "Users can hide messages they are involved with"
  ON messages
  FOR UPDATE
  USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  )
  WITH CHECK (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );
