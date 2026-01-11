-- Update RLS Policies for Messages Table
-- This fixes the deletion policy to allow users to delete their own messages or messages they received

-- Drop the old restrictive delete policy
DROP POLICY IF EXISTS "Users cannot delete messages" ON messages;

-- Create new delete policy that allows users to delete messages where they are sender or receiver
CREATE POLICY "Users can delete their own messages"
  ON messages
  FOR DELETE
  USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

-- Keep existing policies
-- SELECT policy: Users can view their own messages
-- INSERT policy: Users can insert messages where they are the sender
-- UPDATE policy: Users cannot update messages (unchanged)
