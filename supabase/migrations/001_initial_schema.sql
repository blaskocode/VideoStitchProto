-- Initial schema for Video Stitching MVP
-- Creates projects and jobs tables

-- Projects table: tracks video creation sessions
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL,
  mood_prompt TEXT,
  product_prompt TEXT,
  moodboards JSONB,              -- array of moodboard metadata
  liked_moodboards JSONB,        -- ids or keys of liked boards
  storyline_option TEXT,         -- selected storyline text
  scenes JSONB,                  -- array of scene objects
  status TEXT NOT NULL DEFAULT 'inspire', -- 'inspire' | 'story' | 'rendering' | 'complete' | 'error'
  final_video_url TEXT,
  music_track_id TEXT,
  total_cost NUMERIC,
  total_generation_ms BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Jobs table: tracks async operations (image-gen, video-gen, compose)
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,           -- 'image-gen' | 'video-gen' | 'compose'
  status TEXT NOT NULL,         -- 'queued' | 'running' | 'success' | 'error'
  replicate_run_id TEXT,
  output_urls JSONB,            -- array of URLs if multiple
  cost NUMERIC,
  duration_ms BIGINT,
  error_message TEXT,
  retries INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_projects_session_token ON projects(session_token);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_jobs_project_id ON jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_replicate_run_id ON jobs(replicate_run_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

