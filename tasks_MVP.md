Awesome, let’s go full nerd.
Below is a **single, comprehensive document** with:

* Phases (0–7)
* Pull Requests per phase
* Detailed tasks under each PR

I’ll write it so an LLM could pick up any PR and just start building.

---

# 🔧 Video Stitching / Ad Creative MVP – Phase → PR → Task Breakdown

**Stack assumptions:**

* **Frontend**: Next.js (App Router, TypeScript, React)
* **Backend**: Next.js API routes / server actions + small Node worker (can live in same repo initially)
* **DB & Storage**: Supabase (Postgres + Storage)
* **Gen Models**: Replicate (image + video + maybe simple audio if needed)
* **Media**: FFmpeg for stitching / audio overlay
* **Auth**: Anonymous session via cookie (no login for MVP)

**Product assumptions (MVP):**

* Category: **Ad Creative Pipeline**
* Flow: **Inspire Me → Crafting the Story → Generate the Video**
* Final output: 15–30s ad, 1080p, 30+ FPS, stitched from 3–5 clips with background music.

---

## Phase 0 – Project Setup & Foundations

### PR 0.1 – Initialize Next.js App & Basic Structure

**Goal:** Scaffold the Next.js app, TypeScript, basic layout, and routing.

**Tasks:**

- [x] 1. **Create Next.js project**

   * Use `npx create-next-app@latest` with:

     * TypeScript enabled
     * App Router enabled (`app/` directory)
     * ESLint & Prettier
   * Project name: `video-stitching-mvp` (or similar).

- [x] 2. **Set up basic app layout**

   * Create `app/layout.tsx` with:

     * Global `<html lang="en">`
     * `<body>` that wraps children in a basic layout component.
   * Add global CSS file `app/globals.css` with a very minimal base (we can add Tailwind later if desired, but not required for MVP).

- [x] 3. **Create root page**

   * `app/page.tsx`:

     * Basic hero section placeholder.
     * Placeholder text: "AI Video Ad Generator – MVP".
     * Button: "Start creating".

- [x] 4. **Set up TypeScript strict mode**

   * Update `tsconfig.json`:

     * `"strict": true`
     * `"noImplicitAny": true`
     * Ensure proper module resolution.

- [x] 5. **Set up environment config scaffolding**

   * Create `env.d.ts` with types for environment variables:

     ```ts
     declare namespace NodeJS {
       interface ProcessEnv {
         NEXT_PUBLIC_SUPABASE_URL: string;
         NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
         SUPABASE_SERVICE_ROLE_KEY?: string;
         REPLICATE_API_TOKEN: string;
         APP_BASE_URL: string;
       }
     }
     ```
   * Add `.env.example` with placeholder values for required env vars.

**Relevant Files:**
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration with strict mode
- `app/layout.tsx` - Root layout with HTML structure
- `app/globals.css` - Minimal base styles
- `app/page.tsx` - Homepage with hero section and "Start creating" button
- `env.d.ts` - TypeScript definitions for environment variables
- `.env.example` - Template for environment variables
- `next.config.ts` - Next.js configuration
- `eslint.config.mjs` - ESLint configuration

---

### PR 0.2 – Supabase Integration & Schema

**Goal:** Wire up Supabase client and define basic DB schema.

**Tasks:**

- [ ] 1. **Install Supabase client**

   * Add dependency: `@supabase/supabase-js`.

- [ ] 2. **Create Supabase client utility**

   * File: `lib/supabaseClient.ts`:

     * Export a `createClient()` function for server side (using `createClient`).
     * Export a client factory for browser if needed later.

- [ ] 3. **Define initial DB schema (SQL or migration file)**

   * Tables:

     **`projects`**

     ```sql
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
     created_at TIMESTAMPTZ DEFAULT now(),
     updated_at TIMESTAMPTZ DEFAULT now()
     ```

     **`jobs`**

     ```sql
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
     type TEXT NOT NULL,           -- 'image-gen' | 'video-gen' | 'compose'
     status TEXT NOT NULL,         -- 'queued' | 'running' | 'success' | 'error'
     replicate_run_id TEXT,
     output_urls JSONB,            -- array of URLs if multiple
     cost NUMERIC,
     error_message TEXT,
     created_at TIMESTAMPTZ DEFAULT now(),
     updated_at TIMESTAMPTZ DEFAULT now()
     ```

- [ ] 4. **Create TypeScript types matching schema**

   * File: `types/domain.ts`:

     ```ts
     export type ProjectStatus = 'inspire' | 'story' | 'rendering' | 'complete' | 'error';

     export interface Scene {
       id: string;
       title?: string;
       blurb: string;
       imageUrl?: string;
       videoUrl?: string;
       videoJobId?: string;
     }

     export interface Project {
       id: string;
       sessionToken: string;
       productPrompt: string;
       moodPrompt?: string;
       moodboards?: any;        // refine later
       likedMoodboards?: string[];
       storylineOption?: string;
       scenes?: Scene[];
       status: ProjectStatus;
       finalVideoUrl?: string;
       createdAt: string;
       updatedAt: string;
     }

     export type JobType = 'image-gen' | 'video-gen' | 'compose';
     export type JobStatus = 'queued' | 'running' | 'success' | 'error';

     export interface Job {
       id: string;
       projectId: string;
       type: JobType;
       status: JobStatus;
       replicateRunId?: string;
       outputUrls?: string[];
       cost?: number;
       errorMessage?: string;
       createdAt: string;
       updatedAt: string;
     }
     ```

**Relevant Files:**
- (To be updated as tasks are completed)

---

### PR 0.3 – Session Token & Basic Middleware

**Goal:** Give each visitor an anonymous session token via cookie.

**Tasks:**

- [ ] 1. **Add cookie helper**

   * File: `lib/session.ts`:

     * Function `getOrCreateSessionToken()`:

       * If `session_token` cookie exists → return it.
       * Otherwise:

         * Generate UUID.
         * Set cookie (HttpOnly, path `/`, long expiry).
         * Return new UUID.

- [ ] 2. **Use session token in root layout or entry point**

   * In `app/layout.tsx` or a server component wrapper:

     * Call `getOrCreateSessionToken()` to ensure every visitor has a token.
     * Store it in a React Context provider if needed on client.

- [ ] 3. **Add utility to fetch project by session token**

   * File: `lib/projects.ts`:

     * `getActiveProject(sessionToken: string)`: returns latest "in-progress" project (status != 'complete') or `null`.

**Relevant Files:**
- (To be updated as tasks are completed)

---

## Phase 1 – Inspire Me Flow (Product + Mood + Moodboards)

### PR 1.1 – Landing Page & Start Flow UI

**Goal:** Implement the top-level “Inspire Me” UI and hook into project creation.

**Tasks:**

- [ ] 1. **Update `app/page.tsx`**

   * Hero section with:

     * Mission statement text:
       *“For creators who know the vision, and dreamers still discovering it — we turn ideas into beautiful videos in minutes.”*
     * A prominent “Start creating” button.

- [ ] 2. **Route for the creation flow**

   * Create `app/create/page.tsx`:

     * Server component that:

       * Gets `sessionToken`.
       * Fetches active project for this session.
       * If none, shows the “Step 1: What are you trying to create?” view.
       * If exists, routes them to correct step based on `project.status`.

- [ ] 3. **Basic layout for multi-step creation**

   * Create a simple stepper UI:

     * “Inspire Me” → “Crafting the Story” → “Generate the Video” indicators.
   * Provide minimal styling.


**Relevant Files:**
- (To be updated as tasks are completed)
---

### PR 1.2 – Product & Mood Prompt + Project Creation

**Goal:** Capture the product description + mood and create a project.

**Tasks:**

- [ ] 1. **Create UI for product prompt**

   * In `app/create/page.tsx` (or child component `InspireStepOne`):

     * Textarea for product description (e.g., “A TikTok-style ad for…”).
     * Helper text with examples.
     * “Next” button, disabled if empty.

- [ ] 2. **Create UI for mood prompt**

   * After product description submission:

     * Show mood prompt input (free text).
     * Provide mood chips as quick pick options:

       * Exciting, Reflective, Intense, Mysterious, Inspirational, Dreamy, Nostalgic.

- [ ] 3. **API route: create project**

   * `app/api/projects/start/route.ts`:

     * `POST` body: `{ productPrompt: string, moodPrompt?: string }`.
     * Reads session token from cookies.
     * Inserts row into `projects` with:

       * `sessionToken`
       * `productPrompt`
       * `moodPrompt`
       * `status = 'inspire'`
     * Returns `{ projectId }`.

- [ ] 4. **Wire frontend to API**

   * On “Next” after mood:

     * Call `POST /api/projects/start`.
     * Save `projectId` in local state (and optionally use router to push to `/create?projectId=...`).


**Relevant Files:**
- (To be updated as tasks are completed)
---

### PR 1.3 – Moodboard Generation via Replicate

**Goal:** Generate 6–10 moodboards from product + mood, allow like/skip.

**Tasks:**

- [ ] 1. **Design moodboard data structure**

   * In `types/domain.ts`:

     ```ts
     export interface MoodboardImage {
       id: string;
       url: string;
     }

     export interface Moodboard {
       id: string;
       images: MoodboardImage[];
       label?: string;
     }
     ```

- [ ] 2. **Implement Replicate client helper**

   * File: `lib/replicateClient.ts`:

     * Wraps Replicate SDK or `fetch` calls.
     * Function `generateMoodboardImages(prompt: string, count: number)` returning array of URLs.
     * For MVP, use a simple image model (e.g., SDXL-like) with cinematic style prompts.

- [ ] 3. **Backend: API to generate moodboards**

   * Route: `app/api/projects/[projectId]/moodboards/route.ts`
   * `POST`:

     * Validates session token matches project session.
     * Reads project `productPrompt` + `moodPrompt`.
     * Builds 6–10 slightly varied prompts (e.g., different adjectives, angles).
     * Calls Replicate to generate 4 images per moodboard.
     * Uploads resulting images to Supabase Storage.
     * Saves moodboards JSON on the project.
     * Returns `{ moodboards }`.

- [ ] 4. **Front-end UI: Moodboard gallery**

   * Component: `MoodboardSelector`.
   * Displays 6–10 cards:

     * Each card shows a 2x2 grid of images.
     * Buttons:

       * ❤️ “Like”
       * “Skip”
   * Track liked moodboard IDs in local state.

- [ ] 5. **API: save moodboard likes**

   * Route: `app/api/projects/[projectId]/moodboards/like/route.ts`
   * `POST` body: `{ likedMoodboardIds: string[] }`.
   * Writes to `projects.liked_moodboards`.
   * Sets `status` remains `'inspire'` (we move to `'story'` later).

- [ ] 6. **Button: Proceed to Story**

   * “Continue → Craft the Story” button.
   * Calls the like API, then navigates user to `Crafting the Story` step (same page but `status` updated later).


**Relevant Files:**
- (To be updated as tasks are completed)
---

## Phase 2 – Crafting the Story (Storylines & Scenes)

### PR 2.1 – Storyline Generation (Text-Only Tiles)

**Goal:** Generate 3 storyline options using LLM based on product, mood, and liked moodboards.

**Tasks:**

- [ ] 1. **LLM selection & helper**

   * Decide: use OpenAI or another LLM provider (this wasn’t specified, but we can assume something like OpenAI or Replicate’s LLMs).
   * Create `lib/llmClient.ts` with:

     * `generateStorylines({ productPrompt, moodPrompt, likedMoodboards }): Promise<string[]>`.

- [ ] 2. **Prompt template for storylines**

   * Create `prompts/storylinePrompt.ts` exporting a function returning a prompt like:

     * “You are an expert ad creative director. Given PRODUCT and MOOD and STYLE NOTES, propose 3 distinct 15–30 second ad concepts, each in this format: Title, 2-3 sentence overview, then bullet list of 3-5 scenes.”

- [ ] 3. **API: generate storyline options**

   * Route: `app/api/projects/[projectId]/storylines/route.ts`
   * `POST`:

     * Fetch project from DB.
     * Call `generateStorylines`.
     * Store storyline options temporarily in project row (e.g., in a `storyline_options` JSONB field or a separate in-memory cache if you add that).
     * Return serialized options.

- [ ] 4. **UI: Storyline selection screen**

   * Component: `StorylineSelector`.
   * Display 3 tiles, each:

     * Title
     * 2–3 sentence description
     * Bulleted list of scenes (text).
   * Include:

     * “Select this storyline” button.
   * On selection:

     * Call API to save chosen storyline.

- [ ] 5. **API: save chosen storyline**

   * Route: `app/api/projects/[projectId]/storylines/select/route.ts`
   * `POST` body: `{ selectedStorylineIndex: number }` or direct text.
   * Store final selected storyline in `projects.storyline_option`.
   * Update `status` to `'story'`.


**Relevant Files:**
- (To be updated as tasks are completed)
---

### PR 2.2 – Scene Tile Expansion (Detailed Blurbs, Still Text-Only)

**Goal:** Take selected storyline and produce 3–5 detailed scene blurbs.

**Tasks:**

- [ ] 1. **Prompt template for scenes**

   * File: `prompts/scenePrompt.ts`:

     * Takes:

       * Selected storyline text
       * Product prompt
       * Mood
     * Asks the LLM to:

       * Break into 3–5 distinct scenes.
       * For each: setting, action, camera motion, emotion, transitions.

- [ ] 2. **LLM helper function**

   * In `lib/llmClient.ts`:

     * `generateScenesForStoryline(...)` returning an array of `Scene` objects with only text fields.

- [ ] 3. **API: generate scenes**

   * Route: `app/api/projects/[projectId]/scenes/route.ts`
   * `POST`:

     * Load project.
     * Get selected storyline text.
     * Call `generateScenesForStoryline`.
     * Save scenes into `projects.scenes` as JSONB.
     * Return scenes data.

- [ ] 4. **UI: Scene flow review**

   * Component: `SceneFlowViewer`.
   * show 3–5 cards in order:

     * Scene number
     * Blurb (multi-line)
   * Buttons:

     * “Looks good → Continue to visual generation”.
   * For MVP: no edit / no reordering.

- [ ] 5. **State update**

   * On approve:

     * Option A: immediately call an API to mark project status as ready for visual generation.
     * Option B: treat approval implicitly via next step call.


**Relevant Files:**
- (To be updated as tasks are completed)
---

## Phase 3 – Scene Image Generation (Cinematic Realism)

### PR 3.1 – Image Gen for Scenes

**Goal:** Generate one cinematic realism image per scene via Replicate.

**Tasks:**

- [ ] 1. **Prompt refinement for scene images**

   * Extend `scene.blurb` before sending to Replicate by appending:

     * “Cinematic, realistic commercial, 35mm lens, soft depth of field, professional lighting, high production value, 16:9 (or 9:16) frame.”

- [ ] 2. **Replicate helper function**

   * In `lib/replicateClient.ts`:

     * `generateSceneImage(blurb: string): Promise<string>`:

       * Calls appropriate image model.
       * Uploads image to Supabase Storage.
       * Returns public URL.

- [ ] 3. **API: generate images for all scenes**

   * Route: `app/api/projects/[projectId]/scenes/images/route.ts`
   * `POST`:

     * Fetch project & scenes from DB.
     * For each scene, call `generateSceneImage`.
     * Update `scene.imageUrl` for each scene.
     * Save updated scenes JSON to DB.
     * Return scenes with image URLs.

- [ ] 4. **UI: visual storyboard preview**

   * Component: `VisualStoryboard`.
   * Displays:

     * Scene image
     * Scene blurb
   * Button:

     * “Looks good → Generate my video”.


**Relevant Files:**
- (To be updated as tasks are completed)
---

## Phase 4 – Video Generation (Scene Clips)

### PR 4.1 – Video Job Creation & Replicate Calls

**Goal:** For each scene, create an async video generation job via Replicate.

**Tasks:**

- [ ] 1. **Video prompt builder**

   * File: `prompts/videoPrompt.ts`:

     * Take scene blurb, product prompt, mood, and optionally the image.
     * Build a text prompt suitable for video model.
     * Example extras: “5 seconds, smooth camera motion, product hero shot, cinematic, ad style.”

- [ ] 2. **Replicate video helper**

   * In `lib/replicateClient.ts`:

     * `startVideoGeneration(scene: Scene, options: { durationSec: number }): Promise<{ replicateRunId: string }>`:

       * Calls a video model (e.g., CogVideo, etc.).
       * Uses `imageUrl` as input if model supports it (image-to-video).
       * Returns `replicateRunId`.

- [ ] 3. **API: start video generation for project**

   * Route: `app/api/projects/[projectId]/videos/start/route.ts`
   * `POST`:

     * Fetch project & scenes.
     * For each scene:

       * Create `jobs` row with `type = 'video-gen'`, `status = 'queued'`.
       * Call `startVideoGeneration`.
       * Update job with `replicateRunId`.
     * Update project `status = 'rendering'`.
     * Return `{ jobIds }`.

- [ ] 4. **Replicate webhook handler**

   * Route: `app/api/webhook/replicate/route.ts`
   * `POST`:

     * Parse body to get `replicateRunId` and output video URL(s).
     * Map to `jobs` row by `replicateRunId`.
     * On success:

       * Upload video output to Supabase Storage if needed.
       * Update `jobs.status = 'success'` and `jobs.output_urls`.
       * Also update related `scene.videoUrl`.
     * On error:

       * Set `jobs.status = 'error'` and `error_message`.
       * Optionally trigger retry if below max attempts.

- [ ] 5. **Poll or live update UI**

   * For MVP:

     * Poll every 5–10 seconds from the client to:

       * GET `/api/projects/[projectId]/status` (new route).
     * Display progress:

       * “Generating scene 1/4”, “2/4”, etc.


**Relevant Files:**
- (To be updated as tasks are completed)
---

## Phase 5 – Music Selection & Final Composition

### PR 5.1 – Music Options & Selection

**Goal:** Provide user with 3 music options aligned to mood.

**Tasks:**

- [ ] 1. **Static music options for MVP**

   * Place 3 stock music files in storage (or referenced external URLs).
   * Map them to simple mood tags like “upbeat”, “ambient”, “dramatic”.

- [ ] 2. **API: get suggested tracks**

   * Route: `app/api/music/options/route.ts`
   * `GET`:

     * Accepts `projectId` & mood.
     * Return 3 track objects: `{ id, name, url, moodTag }`.

- [ ] 3. **UI: Music selection screen**

   * Component: `MusicSelector`.
   * Shows 3 tracks:

     * Play button (basic HTML5 audio).
     * “Select this track” button.
   * On select:

     * Store selected track in `projects` as `musicTrackId` (add column).

- [ ] 4. **DB schema update**

   * Add `music_track_id TEXT` to `projects`.


**Relevant Files:**
- (To be updated as tasks are completed)
---

### PR 5.2 – FFmpeg Composition Worker

**Goal:** Stitch scene clips + apply transitions + overlay music into final 1080p video.

**Tasks:**

- [ ] 1. **Decide worker placement**

   * Option: add a `scripts/worker/compose.ts` file that can run as a Node script (triggered by API route).
   * For MVP, you can implement composition directly in an API route if video durations and sizes are small, but ideally separate.

- [ ] 2. **Install FFmpeg**

   * Add dependency for Node wrapper: `fluent-ffmpeg` or call `ffmpeg` CLI spawn.
   * Ensure FFmpeg is available in runtime environment.

- [ ] 3. **Composition function**

   * File: `lib/composeVideo.ts`:

     * Function `composeProjectVideo(projectId: string): Promise<string>`:

       * Load project scenes with `videoUrl`s and the selected `musicTrack`.
       * Download video clips (if needed) to temp directory.
       * Create FFmpeg filter graph:

         * Concatenate clips in order (3–5).
         * Add simple crossfade between clips.
         * Normalize resolution to 1080p & 30 FPS.
       * Add audio track:

         * Trim/pad music to match total video length.
         * Use `-shortest` to end with video.
       * Output final MP4 file.
       * Upload final MP4 to Supabase Storage.
       * Return final video URL.

- [ ] 4. **API: trigger composition**

   * Route: `app/api/projects/[projectId]/compose/route.ts`
   * `POST`:

     * Verify all scene `videoUrl`s exist.
     * Option A: Call `composeProjectVideo` directly.
     * On success:

       * Save `final_video_url` to project.
       * Set `status = 'complete'`.

- [ ] 5. **UI: Rendering progress**

   * After user selects music and triggers “Generate final video”:

     * Show a “Rendering…” screen.
     * Poll `GET /api/projects/[projectId]/status`:

       * If `status = 'complete'` → show final video player.


**Relevant Files:**
- (To be updated as tasks are completed)
---

## Phase 6 – Final Output & UX Polish

### PR 6.1 – Final Video Screen

**Goal:** Show the user the finished video and allow download.

**Tasks:**

- [ ] 1. **Result page**

   * In `app/create/page.tsx`, when `status = 'complete'`:

     * Show embedded `<video>` with `src={project.finalVideoUrl}`.
     * Add “Download” button linking directly to MP4 URL.
     * Optionally show:

       * “Restart” / “Create another video”.

- [ ] 2. **Basic styling**

   * Centered layout, simple but clean design.
   * Clear success state text:

     * “Your video is ready 🎬”.


**Relevant Files:**
- (To be updated as tasks are completed)
---

### PR 6.2 – Error Handling & Recovery

**Goal:** Ensure pipeline doesn’t silently fail.

**Tasks:**

- [ ] 1. **API-level error responses**

   * Consistent JSON shape: `{ error: string }` when failure.
   * Handle missing project, missing session token, invalid status transitions.

- [ ] 2. **UI error states**

   * If any API call fails:

     * Show a friendly error message.
     * Provide a “Try again” or “Restart flow” option.

- [ ] 3. **Job retry logic**

   * In webhook handler:

     * If job failed, check a `retries` count (add column).
     * If retries < 2 → requeue run.
     * Else → mark project `status = 'error'`.

- [ ] 4. **Error display**

   * If project `status = 'error'`:

     * Show error explanation.
     * Suggest user restart.


**Relevant Files:**
- (To be updated as tasks are completed)
---

## Phase 7 – Observability, Cost Logging, & Deployment Prep

### PR 7.1 – Cost & Performance Logging

**Goal:** Track cost and latency per project for your deep dive.

**Tasks:**

- [ ] 1. **Add columns**

   * `jobs`:

     * `duration_ms BIGINT`
   * `projects`:

     * `total_cost NUMERIC`
     * `total_generation_ms BIGINT`

- [ ] 2. **Update Replicate helper**

   * When run finishes:

     * Estimate cost if Replicate provides metrics, or store placeholder.
     * Calculate run duration.
     * Update `jobs.cost` and `jobs.duration_ms`.

- [ ] 3. **Project rollup**

   * After final composition:

     * Sum all `jobs.cost` ↦ `projects.total_cost`.
     * Sum all `jobs.duration_ms` ↦ `projects.total_generation_ms`.

- [ ] 4. **Debug dashboard (simple)**

   * Create `app/debug/[projectId]/page.tsx`:

     * Show project JSON.
     * Show jobs list.
     * Show total cost and generation time.


**Relevant Files:**
- (To be updated as tasks are completed)
---

### PR 7.2 – Deployment & README

**Goal:** Make the system deployable and understandable.

**Tasks:**

- [ ] 1. **Deployment configuration**

   * Prepare for deployment on Vercel (for Next.js) + whichever environment for FFmpeg worker (maybe a small VM).
   * Document expected env vars in README.

- [ ] 2. **README content**

   * Sections:

     * Overview
     * Architecture (Inspire Me → Story → Video)
     * Setup:

       * `npm install`
       * env configuration
       * Supabase migrations
     * Running locally
     * Deployment notes
     * Known limitations

- [ ] 3. **Basic API documentation**

   * List all endpoints created:

     * `/api/projects/start`
     * `/api/projects/[projectId]/moodboards`
     * `/api/projects/[projectId]/storylines`
     * `/api/projects/[projectId]/scenes`
     * `/api/projects/[projectId]/scenes/images`
     * `/api/projects/[projectId]/videos/start`
     * `/api/projects/[projectId]/compose`
     * `/api/webhook/replicate`
     * `/api/music/options`
   * Describe method, input, output.


**Relevant Files:**
- (To be updated as tasks are completed)
---

That’s the full **Phase → PR → Task** breakdown in one document.

If you want, next I can:

* Turn this into a **Mermaid diagram** for the pipeline, and/or
* Extract a **checklist version** (flat bullet list) for a project board, and/or
* Generate **prompt templates** for each LLM interaction in more detail.
