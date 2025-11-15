# Active Context

## Current Work Focus

**Status**: Phase 0 in progress - PR 0.1 complete, ready for PR 0.2 (Supabase Integration & Schema).

## Recent Changes

- Memory Bank structure created with all core documentation files
- Project documentation reviewed and synthesized into Memory Bank
- Cursor rules comprehensively reviewed and fully incorporated into Memory Bank
- **PR 0.1 Complete**: Next.js project initialized with:
  - TypeScript, App Router, ESLint configured
  - Basic layout and root page created
  - TypeScript strict mode enabled
  - Environment variable scaffolding (env.d.ts, .env.example)
- Ready to proceed with PR 0.2: Supabase Integration & Schema

## Next Steps

### Immediate (Phase 0)
1. ✅ **PR 0.1**: Initialize Next.js App & Basic Structure - **COMPLETE**

2. **PR 0.2**: Supabase Integration & Schema
   - Install Supabase client
   - Create Supabase client utilities
   - Define database schema (projects, jobs tables)
   - Create TypeScript types matching schema

3. **PR 0.3**: Session Token & Basic Middleware
   - Implement cookie-based session token system
   - Create session helper functions
   - Add project fetching by session token

## Active Decisions and Considerations

### Architecture Decisions Made
- ✅ Next.js App Router (not Pages Router)
- ✅ Server-side primary state (Supabase Postgres)
- ✅ Anonymous session tokens (no auth for MVP)
- ✅ Async job orchestration via Postgres jobs table
- ✅ Replicate for all AI generation
- ✅ FFmpeg worker for final composition

### Decisions Pending
- LLM provider selection (OpenAI vs Replicate LLMs) - needs decision
- FFmpeg worker deployment strategy (same repo vs separate)
- Styling approach (plain CSS vs Tailwind) - MVP can start with plain CSS
- Music source (static files vs AI-generated) - MVP uses static files

### Project Rules Enforced
- ✅ **File size limit**: 500 lines maximum per code file (hard requirement from `.cursor/rules/file-size-limit.mdc`)
  - Applies to: `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`, `.java`, `.kt`, `.swift`
  - Must check before creating/committing files
  - Must refactor immediately if exceeded
  - 6 splitting strategies documented
- ✅ **Task management**: One sub-task at a time, wait for approval (`.cursor/rules/process-task-list.mdc` - alwaysApply: true)
  - Must mark tasks `[x]` when complete
  - Must maintain "Relevant Files" section
  - Must pause after each sub-task for user approval
- ✅ **Communication style**: Yoda-style quotes at end of chats (`.cursor/rules/yoda-quotes.mdc` - alwaysApply: true)
- ✅ **Code modularity**: Files must be split intelligently when approaching limits

## Current Blockers

None - ready to begin implementation.

## Workflow State

- Documentation: ✅ Complete
- Memory Bank: ✅ Initialized
- Codebase: ⏳ Not started
- Database: ⏳ Not created
- Environment: ⏳ Not configured

