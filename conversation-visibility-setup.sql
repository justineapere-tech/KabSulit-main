-- Alternative approach: Use a separate visibility table for soft-deletes
-- This is cleaner and avoids UPDATE permission complexity

-- Step 1: Create a conversation_visibility table to track hidden conversations per user
CREATE TABLE IF NOT EXISTS conversation_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  other_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hidden_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, other_user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversation_visibility_user ON conversation_visibility(user_id);

-- Step 2: Enable RLS on conversation_visibility
ALTER TABLE conversation_visibility ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see/manage their own visibility records
CREATE POLICY "Users can manage their own visibility"
  ON conversation_visibility
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 3: Remove hidden_by column from messages table (optional - you can keep it)
-- ALTER TABLE messages DROP COLUMN IF EXISTS hidden_by;

-- Step 4: Update SELECT policy to use the new visibility table
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;

CREATE POLICY "Users can view their own messages"
  ON messages
  FOR SELECT
  USING (
    (auth.uid() = sender_id OR auth.uid() = receiver_id)
    AND NOT EXISTS (
      SELECT 1 FROM conversation_visibility cv
      WHERE cv.user_id = auth.uid()
      AND (
        (cv.other_user_id = sender_id AND auth.uid() = receiver_id)
        OR (cv.other_user_id = receiver_id AND auth.uid() = sender_id)
      )
    )
  );
