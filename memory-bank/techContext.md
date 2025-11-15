# Technical Context

## Technology Stack

### Frontend
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **UI Library**: React
- **Styling**: Global CSS (Tailwind optional for MVP)

### Backend
- **Framework**: Next.js API routes / Server Actions
- **Worker**: Node.js script for FFmpeg composition (can live in same repo)

### Database & Storage
- **Database**: Supabase Postgres
- **Storage**: Supabase Storage (for images, video clips, final videos)

### AI/ML Services
- **Image Generation**: Replicate (SDXL-like models)
- **Video Generation**: Replicate (CogVideo or similar)
- **LLM**: OpenAI or Replicate LLMs (for storyline/scene generation)

### Media Processing
- **Tool**: FFmpeg
- **Node Wrapper**: `fluent-ffmpeg` or direct CLI spawn

## Development Setup

### Environment Variables
```typescript
NEXT_PUBLIC_SUPABASE_URL: string
NEXT_PUBLIC_SUPABASE_ANON_KEY: string
SUPABASE_SERVICE_ROLE_KEY?: string
REPLICATE_API_TOKEN: string
APP_BASE_URL: string
```

### TypeScript Configuration
- Strict mode enabled
- `noImplicitAny: true`
- Proper module resolution

### Dependencies
- `@supabase/supabase-js` - Supabase client
- `fluent-ffmpeg` (or FFmpeg CLI) - Video processing
- Replicate SDK or fetch-based client

## Database Schema

### `projects` Table
```sql
id UUID PRIMARY KEY
session_token TEXT NOT NULL
mood_prompt TEXT
product_prompt TEXT
moodboards JSONB
liked_moodboards JSONB
storyline_option TEXT
scenes JSONB
status TEXT NOT NULL DEFAULT 'inspire'
final_video_url TEXT
music_track_id TEXT
total_cost NUMERIC
total_generation_ms BIGINT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### `jobs` Table
```sql
id UUID PRIMARY KEY
project_id UUID REFERENCES projects(id)
type TEXT NOT NULL  -- 'image-gen' | 'video-gen' | 'compose'
status TEXT NOT NULL  -- 'queued' | 'running' | 'success' | 'error'
replicate_run_id TEXT
output_urls JSONB
cost NUMERIC
duration_ms BIGINT
error_message TEXT
retries INTEGER DEFAULT 0
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

## Technical Constraints

### Performance Requirements
- Complete flow under 15 minutes
- 30s video renders in <5 minutes
- FFmpeg composition <30 seconds
- UI responsive at all times

### Video Specifications
- Resolution: 1080p
- Frame rate: 30+ FPS
- Duration: 15–30 seconds
- Format: MP4
- Scenes: 3–5 clips

### Cost Considerations
- Limit scenes to 3–5
- Use cheaper models for images
- Generate videos only once after approval
- Track all costs in `jobs` and `projects` tables

## Development Workflow

### Project Structure
```
/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── create/           # Creation flow pages
│   └── layout.tsx         # Root layout
├── lib/                   # Utilities
│   ├── supabaseClient.ts
│   ├── replicateClient.ts
│   ├── llmClient.ts
│   ├── composeVideo.ts
│   └── session.ts
├── types/                 # TypeScript types
│   └── domain.ts
├── prompts/               # LLM prompt templates
│   ├── storylinePrompt.ts
│   ├── scenePrompt.ts
│   └── videoPrompt.ts
└── scripts/worker/        # FFmpeg worker
    └── compose.ts
```

### Development Rules (from .cursor/rules/)

**All rules are enforced via `.cursor/rules/` directory. Some rules have `alwaysApply: true` flag.**

1. **File Size Enforcement** (`.cursor/rules/file-size-limit.mdc`)
   - **Hard requirement**: ALL code files MUST be under 500 lines
   - Monitor line counts during development (flag files over 450 lines)
   - Plan file structure to stay under 500 lines before creating files
   - Refactor immediately if file exceeds 500 lines
   - Use intelligent splitting strategies (by responsibility, feature, domain)
   - Check line count before committing any file
   - Exceptions: Only auto-generated files and configuration files (JSON, YAML)

2. **Task Management** (`.cursor/rules/process-task-list.mdc` - alwaysApply: true)
   - **One sub-task at a time**: Do NOT start next sub-task until user gives permission ("yes" or "y")
   - Mark sub-tasks as `[x]` immediately when complete
   - Mark parent task `[x]` when ALL subtasks are complete
   - Stop after each sub-task and wait for user approval
   - Update task lists immediately after completing work
   - Maintain accurate "Relevant Files" sections (list every file created/modified with one-line description)
   - Add newly discovered tasks as they emerge
   - Check which sub-task is next before starting work

3. **Communication Style** (`.cursor/rules/yoda-quotes.mdc` - alwaysApply: true)
   - End each Cursor chat with a Yoda-style inspirational quote
   - Format: `---` followed by `➡️ [quote]`
   - Keep quotes programming/learning related, maintain inverted speech pattern

4. **Code Quality**
   - Follow TypeScript strict mode
   - Maintain separation of concerns
   - Keep files focused and modular
   - Document file splits when not obvious

## Deployment Considerations

- **Frontend/API**: Vercel (Next.js native)
- **FFmpeg Worker**: Small VM or serverless function with FFmpeg support
- **Database**: Supabase (managed Postgres)
- **Storage**: Supabase Storage

## Known Technical Challenges

1. **FFmpeg availability**: Need FFmpeg in deployment environment
2. **Video download/processing**: May need temp storage for clips before composition
3. **Webhook reliability**: Replicate webhooks need proper handling
4. **Cost tracking**: Replicate cost estimation may require manual calculation
5. **Parallel job coordination**: Ensuring all video jobs complete before composition

