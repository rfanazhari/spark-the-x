-- Reply Hunter Phase 1A foundation
-- Table: reply_history
CREATE TABLE IF NOT EXISTS reply_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Context: tweet yang di-reply (read-only reference)
  original_tweet_id TEXT NOT NULL,
  original_tweet_text TEXT,
  original_author_handle TEXT,

  -- Data reply yang dibuat user
  reply_tweet_id TEXT NOT NULL,
  reply_text TEXT NOT NULL,
  tone_label TEXT CHECK (tone_label IN ('educational', 'bold', 'curious')),

  -- Metrics reply user (bukan metrics tweet original)
  impressions INTEGER,
  engagements INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metrics_synced_at TIMESTAMPTZ
);

ALTER TABLE reply_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reply history"
  ON reply_history FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reply history"
  ON reply_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reply history"
  ON reply_history FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reply history"
  ON reply_history FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reply_history_user_created_at
  ON reply_history (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reply_history_user_original_created_at
  ON reply_history (user_id, original_tweet_id, created_at DESC);

-- Prevent duplicate reply to the same original tweet within a rolling 24-hour window.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reply_history
  ADD CONSTRAINT reply_history_no_duplicate_24h
  EXCLUDE USING gist (
    user_id WITH =,
    original_tweet_id WITH =,
    tstzrange(created_at, created_at + INTERVAL '24 hours', '[)') WITH &&
  );
