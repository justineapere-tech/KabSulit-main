-- Drop existing RLS policies on messages table
DROP POLICY IF EXISTS "Users can select their own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Allow SELECT: Users can read messages they sent or received (regardless of archive status)
CREATE POLICY "Users can select all their messages"
  ON messages
  FOR SELECT
  USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

-- Allow INSERT: Only authenticated users can insert messages they are sending
CREATE POLICY "Users can insert their own messages"
  ON messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
  );

-- Block UPDATE and DELETE on messages (messages are immutable)
CREATE POLICY "Block message updates"
  ON messages
  FOR UPDATE
  USING (false);

CREATE POLICY "Block message deletes"
  ON messages
  FOR DELETE
  USING (false);
