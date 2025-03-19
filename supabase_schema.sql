-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    wave INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add constraints and indexes
ALTER TABLE leaderboard ADD CONSTRAINT player_name_length CHECK (length(player_name) <= 30);
ALTER TABLE leaderboard ADD CONSTRAINT score_positive CHECK (score >= 0);
ALTER TABLE leaderboard ADD CONSTRAINT wave_positive CHECK (wave >= 1);

CREATE INDEX leaderboard_score_idx ON leaderboard (score DESC);
CREATE INDEX leaderboard_created_at_idx ON leaderboard (created_at DESC);

-- Enable Row Level Security
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow anyone to select/read from the leaderboard
CREATE POLICY "Public can view leaderboard" 
    ON leaderboard FOR SELECT 
    USING (true);

-- Allow anyone to insert into the leaderboard (with validation)
CREATE POLICY "Public can insert scores" 
    ON leaderboard FOR INSERT 
    WITH CHECK (
        player_name IS NOT NULL AND 
        length(player_name) <= 30 AND
        score >= 0 AND
        wave >= 1
    );

-- Prevent updates and deletes from public users
CREATE POLICY "No public updates" 
    ON leaderboard FOR UPDATE 
    USING (false);

CREATE POLICY "No public deletes" 
    ON leaderboard FOR DELETE 
    USING (false);

-- Optional: Create a function to get top scores
CREATE OR REPLACE FUNCTION get_top_scores(limit_count INTEGER DEFAULT 20)
RETURNS SETOF leaderboard AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM leaderboard
    ORDER BY score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 

-- Add a gun column to the leaderboard table
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS gun TEXT DEFAULT 'Unknown';