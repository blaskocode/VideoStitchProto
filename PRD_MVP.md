# Product Requirements Document (PRD)

## Video Stitching App – MVP

## 1. Overview

The MVP enables a user to generate a short, cohesive, stylized advertisement-style video within 10–15 minutes, from landing on the website to receiving a downloadable final video. The workflow focuses on simplicity, rapid iteration, and generating high-quality results with minimal user input. The MVP is structured around three stages: **Inspire Me → Crafting the Story → Generate the Video**.

The system uses Replicate for all image and video generation, Supabase for session state and asset storage, and a small FFmpeg worker to perform final stitching, transitions, and audio overlay.

---

## 2. Goals

### Primary Goals (MVP)

* Enable a user to create a stylized multi-clip video (15–30 seconds).
* Keep the entire process under 10–15 minutes including rendering.
* Provide intuitive UX for both users who know their vision and users discovering it.
* Minimize unnecessary generation costs by:

  * Generating images only in early phases.
  * Generating videos only once, after storyboard confirmation.
* Produce a final video meeting quality requirements:

  * 1080p resolution.
  * 30+ FPS.
  * 3–5 scenes.
  * Audio included.
* Architect the system so an AI agent can generate or modify the code safely.

### Non-Goals (MVP)

* User accounts, authentication, or history saving.
* Full editing of scenes.
* Regenerating individual scenes.
* Multi-aspect-ratio outputs.
* Full-featured music generation or selection.
* Lip-sync, actor tracking, or long-form storylines.

---

## 3. User Flow

### 3.1 Inspire Me

1. User lands on the homepage.
2. Mission statement displayed.
3. Chatbot asks: **“What are you trying to create?”**

   * Example answers: “A TikTok-style ad for new running shoes,” “A cinematic TV commercial for an electric car,” “A moody music video for an indie song.”
   * System derives: orienta## 3.2 Crafting the Story
4. System generates **3 text-only storyline tiles**, each with:

   * A title
   * A 2–3 sentence high-level concept
   * A rough outline of **3–5 scenes** (still text-only)
5. User selects one storyline.
6. System expands the chosen storyline into **detailed scene tiles**, each containing:

   * Scene setting
   * What happens in the scene
   * Camera motion
   * Emotional tone
   * Product focus or CTA (if applicable)
   * Transition cues
7. User approves the full scene flow.
8. *Only after approval*, the system generates **one cinematic-realism image per scene**, used for guiding video generation.
9. Blurbs are updated to include video motion and cinematography details.

## 3.3 Generate the Videond music suggestions.

5. System generates **6–10 moodboards** based on product intent + mood.
6. User can: ❤️ Like a moodboard or ❌ Skip it.
7. (No image starring in MVP.)

## 3.2 Crafting the Story Crafting the Story

7. Based on likes/starred images, the system generates 3 storyline options.
8. User selects one.
9. System produces storyboard with 3–5 scenes:

   * Each scene displays an image + a generated blurb describing the video motion.
10. User confirms storyboard.

### 3.3 Generate the Video

11. System generates each video clip (5–10 seconds) via Replicate.
12. System stitches clips in FFmpeg worker.
13. User chooses from 3 music options.
14. System overlays selected audio.
15. The final video is rendered and displayed.
16. User downloads the final video.

---

## 4. Technical Architecture

### 4.1 Frontend

* Next.js App Router.
* React components for all screens.
* Minimal global state; primary state stored server-side.
* Anonymous session token in cookie.

### 4.2 Backend

* Next.js API routes / Server Actions.
* Async job orchestration through:

  * Postgres `jobs` table.
  * Replicate async runs + webhook callbacks.
  * FFmpeg worker for assembly.

### 4.3 Storage

* Supabase Postgres:

  * Sessions
  * Projects
  * Scenes
  * Job metadata
  * Costs
* Supabase Storage:

  * Moodboard images
  * Video clip outputs
  * Final stitched videos

### 4.4 Video Generation

* Replicate models for:

  * Image generation
  * Video clip generation
  * Optional: upscaling
* FFmpeg worker for:

  * Concatenation
  * Transitions
  * Audio merging

---

## 5. Data Models

```ts
export interface Project {
  id: string;
  sessionToken: string;
  moodPrompt: string;
  likedMoodboards: string[];
  starredImages: string[];
  storylineOption: string;
  scenes: Scene[];
  status: "inspire" | "story" | "rendering" | "complete" | "error";
  finalVideoUrl?: string;
}

export interface Scene {
  id: string;
  imageUrl: string;
  blurb: string;
  videoJobId?: string;
  videoUrl?: string;
}

export interface Job {
  id: string;
  projectId: string;
  type: "image-gen" | "video-gen" | "compose";
  status: "queued" | "running" | "success" | "error";
  replicateRunId?: string;
  outputUrl?: string;
  cost?: number;
}
```

---

## 6. API Endpoints

### POST /api/start

Creates a new project and returns project ID.

### POST /api/moodboards

Input: mood prompt
Output: list of moodboards

### POST /api/storyline

Input: liked + starred images
Output: 3 storyline options

### POST /api/storyboard

Input: selected storyline
Output: generated storyboard scenes

### POST /api/generate

Input: project ID
Action: starts Replicate jobs for all scenes

### POST /api/webhook/replicate

Input: Replicate output
Action: updates job/status

### POST /api/compose

Input: project ID
Action: triggers FFmpeg composition

---

## 7. Prompting Pipeline

### Mood → Images

"Generate a moodboard reflecting: {USER_MOOD}." + style modifiers.

### Images → Storyline

"Given these images, propose 3 short ad-style narrative concepts."

### Storyline → Scene Blurbs

"Break this concept into 3–5 scenes and describe what dynamically happens in each one."

### Scene → Video Prompt

"Generate a {duration}s video based on the scene description: {BLURB}."

---

## 8. Performance Requirements

* Complete flow under 15 minutes.
* 30s video renders in <5 min.
* Replicate calls are parallelized.
* FFmpeg composition <30 sec.
* UI responsive at all times.

---

## 9. Risks & Mitigations

* **Latency** → parallelize all video generation.
* **Costs** → limit scenes to 3–5; use cheap models for images.
* **Incoherence** → use starred images to anchor styles.
* **Failures** → retry failed Replicate jobs.
* **User confusion** → keep UX extremely linear.

---

## 10. Success Criteria

* A user with no technical skill can produce a 15–30 second ad video.
* Final video meets quality specs.
* Entire flow < 15 minutes.
* Costs are logged.
* Pipeline is stable and observable.

---

This document defines the MVP scope. Future phases will be documented separately.
