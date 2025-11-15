# Supabase Setup Guide

This guide will walk you through setting up your Supabase project for the Video Stitching MVP.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click **"New Project"**
4. Fill in the project details:
   - **Name**: `video-stitching-mvp` (or your preferred name)
   - **Database Password**: Choose a strong password (save this somewhere safe!)
   - **Region**: Choose the region closest to you
   - **Pricing Plan**: Free tier is fine for MVP
5. Click **"Create new project"**
6. Wait 2-3 minutes for the project to be provisioned

## Step 2: Get Your API Keys

### Finding Your Project URL

The Project URL can be found in a few places:

**Option 1: General Settings**
1. Go to **Settings** → **General**
2. Look for **Reference ID** or **Project URL**
3. The URL format is: `https://[your-reference-id].supabase.co`

**Option 2: API Keys Page (at the top)**
1. Go to **Settings** → **API Keys**
2. The Project URL might be displayed at the very top of the page, above the keys

**Option 3: Project Overview**
- Sometimes visible in the project dashboard overview/home page

### Getting Your API Keys

1. Go to **Settings** → **API Keys**
2. You should see tabs for "API Keys" or "Legacy API Keys" - use **"API Keys"** (the newer one)
3. You'll find two important keys:
   - **anon public** key (labeled as "anon public" or "anon key") - this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - A long string starting with `eyJ...`
   - **service_role** key (labeled as "service_role" or "service_role key") - this is your `SUPABASE_SERVICE_ROLE_KEY`
     - **⚠️ Keep this secret!** Never expose this in client-side code
     - Also a long string starting with `eyJ...`

4. Copy all three values (Project URL + both keys) - you'll need them for your `.env` file

**If you still can't find the Project URL:** It's in the format `https://[reference-id].supabase.co` where `[reference-id]` is your project's reference ID. You can find the reference ID in Settings → General.

## Step 3: Set Up the Database Schema

**Note:** Even though you have no data yet, you need to create the database structure (tables, indexes, etc.) first. These "migrations" are really schema initialization scripts that create the tables your app needs.

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`:
   ```sql
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
   ```

4. Click **"Run"** (or press Cmd/Ctrl + Enter)
5. You should see "Success. No rows returned"

6. **Important:** Close the current query tab or click "New query" to start fresh
7. Now run the second migration. Copy and paste the contents of `supabase/migrations/002_add_storyline_options.sql`:
   ```sql
   -- Add storyline_options field to projects table
   ALTER TABLE projects
   ADD COLUMN IF NOT EXISTS storyline_options JSONB;
   ```

8. Click **"Run"** again

## Step 4: Create Storage Buckets

You need to create three storage buckets for the app to work:

### Bucket 1: moodboards

1. In your Supabase dashboard, go to **Storage**
2. Click **"Create a new bucket"**
3. Fill in the details:
   - **Name**: `moodboards` (must be exactly this name)
   - **Public bucket**: ✅ **Enable this** (check the box)
   - **File size limit**: 50 MB (or leave default)
   - **Allowed MIME types**: Leave empty (allows all types)
4. Click **"Create bucket"**

### Bucket 2: scenes

1. Click **"Create a new bucket"** again
2. Fill in the details:
   - **Name**: `scenes` (must be exactly this name)
   - **Public bucket**: ✅ **Enable this** (check the box)
   - **File size limit**: 50 MB (or leave default)
   - **Allowed MIME types**: Leave empty (allows all types)
3. Click **"Create bucket"**

### Bucket 3: videos

1. Click **"Create a new bucket"** again
2. Fill in the details:
   - **Name**: `videos` (must be exactly this name)
   - **Public bucket**: ✅ **Enable this** (check the box)
   - **File size limit**: 100 MB (or leave default - videos are larger)
   - **Allowed MIME types**: Leave empty (allows all types)
3. Click **"Create bucket"**

## Step 5: Configure Your .env File

1. Open the `.env` file in your project root
2. Replace the placeholder values with your actual Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Replicate API
REPLICATE_API_TOKEN=your_replicate_api_token

# Application
APP_BASE_URL=http://localhost:3000

# OpenAI API (for storyline generation)
OPENAI_API_KEY=your_openai_api_key
```

3. Save the file

## Step 6: Verify Setup

1. Restart your Next.js dev server:
   ```bash
   npm run dev
   ```

2. Try accessing the app - the Supabase connection error should be gone!

## Troubleshooting

### "trigger already exists" error when running second migration

If you see an error like `ERROR: 42710: trigger "update_projects_updated_at" for relation "projects" already exists`:

**This means:** You likely ran the first migration twice, or ran both migrations in the same query window.

**Solution:** The second migration (002) only adds a column and should work fine. Just run this single line in a new query:

```sql
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS storyline_options JSONB;
```

The error is harmless - your database is already set up correctly. The second migration just adds one more column that might be missing.

### "Missing Supabase environment variables" error
- Make sure your `.env` file is in the project root (same directory as `package.json`)
- Restart your dev server after creating/updating `.env`
- Check that there are no typos in the variable names

### Database connection issues
- Verify your `NEXT_PUBLIC_SUPABASE_URL` is correct (should start with `https://`)
- Check that your database password is set correctly
- Make sure you ran both migration files

### Storage upload errors
- Verify the `moodboards` bucket exists and is set to **Public**
- Check that your `SUPABASE_SERVICE_ROLE_KEY` is correct (not the anon key)

## Next Steps

Once Supabase is set up, you'll also need:
- **Replicate API Token**: Get from [https://replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)
- **OpenAI API Key**: Get from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

Add these to your `.env` file as well.

