-- Migration 018: Chat Features Enhancements
-- Adds group avatars and tagging support.

-- 1. Add avatar_url to conversations
ALTER TABLE public.workspace_conversations 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Add tagging support to messages
ALTER TABLE public.workspace_messages
ADD COLUMN IF NOT EXISTS mentions uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS mention_all boolean DEFAULT false;

-- 3. Index for mentions performance
CREATE INDEX IF NOT EXISTS idx_workspace_messages_mentions ON public.workspace_messages USING GIN (mentions);
