-- Add storyline_options field to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS storyline_options JSONB;

