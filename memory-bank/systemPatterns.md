# System Patterns

## Architecture Overview

The system follows a three-stage workflow with clear separation between frontend, backend API routes, and async job processing.

## Key Technical Decisions

### 1. State Management
- **Server-side primary state**: Project state stored in Supabase Postgres
- **Minimal global state**: Frontend uses minimal React state, primarily for UI interactions
- **Session-based**: Anonymous session tokens via cookies (no authentication for MVP)

### 2. Async Job Orchestration
- **Jobs table**: Postgres `jobs` table tracks all async operations
- **Replicate integration**: Uses Replicate async runs with webhook callbacks
- **FFmpeg worker**: Separate worker process for video composition (can live in same repo initially)

### 3. Generation Strategy
- **Cost optimization**: Images generated early, videos only after approval
- **Parallel processing**: All video generation jobs run in parallel
- **Progressive enhancement**: Text → Images → Videos (each stage builds on previous)

## Component Relationships

### Data Flow
```
User Input → API Route → Database Update → Async Job → Webhook → Database Update → UI Poll → Display
```

### Key Entities

**Project**
- Central entity tracking entire video creation session
- Status transitions: `inspire` → `story` → `rendering` → `complete` | `error`
- Contains: prompts, moodboards, storyline, scenes, final video URL

**Scene**
- Part of Project's scenes array (JSONB)
- Contains: blurb, imageUrl, videoUrl, videoJobId
- Generated sequentially: text → image → video

**Job**
- Tracks async operations (image-gen, video-gen, compose)
- Status: `queued` → `running` → `success` | `error`
- Links to Replicate via `replicateRunId`

## Design Patterns

### 1. Progressive Generation Pattern
- Start with text/ideas (cheap, fast)
- Generate images for visual confirmation (moderate cost)
- Generate videos only after full approval (expensive, slow)

### 2. Webhook-Based Async Processing
- API routes initiate jobs, return immediately
- Replicate webhooks update job status
- Frontend polls for completion

### 3. Session-Based Anonymous Access
- Cookie-based session tokens
- No user accounts required
- Projects tied to session tokens

### 4. Job Queue Pattern
- All async work tracked in `jobs` table
- Status transitions managed centrally
- Retry logic built into job processing

## API Route Structure

```
/api/projects/start                    - Create new project
/api/projects/[projectId]/moodboards   - Generate moodboards
/api/projects/[projectId]/storylines   - Generate storyline options
/api/projects/[projectId]/scenes       - Generate scene details
/api/projects/[projectId]/scenes/images - Generate scene images
/api/projects/[projectId]/videos/start - Start video generation
/api/projects/[projectId]/compose     - Trigger final composition
/api/webhook/replicate                 - Replicate callback handler
/api/music/options                     - Get music options
```

## Error Handling Strategy

- **API-level**: Consistent JSON error responses `{ error: string }`
- **Job-level**: Retry logic (max 2 retries) before marking as error
- **Project-level**: Status can be set to `error` with user-facing messages
- **UI-level**: Friendly error messages with "Try again" or "Restart flow" options

## Coding Standards & Project Rules

### File Size Limit (Hard Requirement)
**Rule Source**: `.cursor/rules/file-size-limit.mdc`  
**Applies to**: `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`, `.java`, `.kt`, `.swift`

- **ALL code files MUST be under 500 lines** - This is a non-negotiable requirement
- **When this rule applies**:
  1. Before creating any new file: Plan implementation to stay under 500 lines
  2. Before adding new code: Check current line count and ensure additions won't exceed limit
  3. During refactoring: If file has exceeded 500 lines, MUST be split immediately
  4. During code review: Flag any file approaching or exceeding 500 lines

- **How to count lines**: Count ALL lines including:
  - Code
  - Comments
  - Blank lines
  - Imports/dependencies
- **Exclusions**: Only auto-generated files (explicitly marked) and configuration files (JSON, YAML, etc.)

- **Enforcement**:
  1. Check line count before committing any file
  2. Flag files that are over 450 lines (approaching limit)
  3. Immediately refactor files over 500 lines
  4. Plan ahead when adding features to prevent exceeding limits

### File Splitting Strategies
When a file exceeds or is about to exceed 500 lines, split using these strategies:

1. **By Responsibility (Single Responsibility Principle)**
   - Split based on distinct responsibilities
   - Example: UserViewModel → UserAuthViewModel, UserProfileViewModel, etc.

2. **By Feature or Domain**
   - Split based on feature boundaries
   - Example: FirebaseService → FirebaseAuthService, FirestoreService, etc.

3. **Extract Helper/Utility Classes**
   - Move supporting logic to separate files
   - Example: ChatView → ChatView + ChatMessageFormatter + ChatInputValidator

4. **Separate Data Models from Logic**
   - Keep models in separate files
   - Example: User → User (model) + UserValidation + User+Extensions

5. **Protocol + Implementation Separation**
   - Separate interfaces from implementations
   - Example: MessagingManager → MessagingProtocols + MessagingManager

6. **Group Related Extensions**
   - Create dedicated extension files
   - Example: ConversationListView → Core UI + Actions + Formatting + Navigation

**Naming Conventions for Split Files**:
- Feature-based: `[BaseName][Feature].ts` (e.g., `UserAuthService.ts`)
- Extension-based: `[BaseName]+[Extension].ts` (e.g., `User+Validation.ts`)
- Protocol-based: `[BaseName]Protocol.ts` or `[BaseName]Protocols.ts`
- Category-based: `[BaseName][Category].ts` (e.g., `ChatViewActions.ts`)

**Best Practices**:
- ✅ Split by logical boundaries (features, responsibilities, domains)
- ✅ Create meaningful file names that reflect their purpose
- ✅ Keep related code close together in the same directory
- ✅ Use extensions to logically group related functionality
- ✅ Document why files were split in comments if not obvious
- ❌ Don't split arbitrarily just to meet line count
- ❌ Don't create vague names like `Helpers.ts` or `Utils.ts`
- ❌ Don't scatter related functionality across distant directories

**Benefits**: Improved readability, better modularity, easier testing, reduced merge conflicts, enhanced maintainability, faster code reviews

### Task List Management
**Rule Source**: `.cursor/rules/process-task-list.mdc` (alwaysApply: true)  
**Applies to**: Task files matching `**/tasks/**/*.md` or `**/tasks-*.md`

**Task Implementation Protocol**:
- **One sub-task at a time**: Do NOT start the next sub-task until you ask the user for permission and they say "yes" or "y"
- **Completion protocol**:
  1. When you finish a **sub-task**, immediately mark it as completed by changing `[ ]` to `[x]`
  2. If **all** subtasks underneath a parent task are now `[x]`, also mark the **parent task** as completed
- **Stop after each sub-task** and wait for the user's go-ahead

**Task List Maintenance**:
1. **Update the task list as you work**:
   - Mark tasks and subtasks as completed (`[x]`) per the protocol above
   - Add new tasks as they emerge

2. **Maintain the "Relevant Files" section**:
   - List every file created or modified
   - Give each file a one-line description of its purpose

**AI Instructions** (for AI agents working on this project):
1. Regularly update the task list file after finishing any significant work
2. Follow the completion protocol (mark sub-tasks `[x]`, mark parent `[x]` when all subtasks complete)
3. Add newly discovered tasks
4. Keep "Relevant Files" accurate and up to date
5. Before starting work, check which sub-task is next
6. After implementing a sub-task, update the file and then pause for user approval

### Communication Style
**Rule Source**: `.cursor/rules/yoda-quotes.mdc` (alwaysApply: true)

- **End each Cursor chat** with a wise, Yoda-style inspirational quote
- **Format**:
  - Add a line break after the last technical response
  - Start with `---`
  - Add `➡️ ` before the quote
  - Add the quote in Yoda's distinctive speech pattern
  - Keep it short and meaningful
- **Guidelines**: Keep quotes programming or learning related, maintain Yoda's inverted speech pattern, focus on wisdom and encouragement, keep it light and fun

