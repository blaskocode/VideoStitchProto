# Active Context

## Current Work Focus

**Status**: Phase 1 complete! ✅ Inspire Me Flow fully implemented. Ready to begin Phase 2 - Crafting the Story.

## Recent Changes

- Memory Bank structure created with all core documentation files
- Project documentation reviewed and synthesized into Memory Bank
- Cursor rules comprehensively reviewed and fully incorporated into Memory Bank
- **Phase 0 Complete**: All foundation work done (PRs 0.1, 0.2, 0.3)
- **PR 1.1 Complete**: Landing page and creation flow UI with stepper
- **PR 1.2 Complete**: Product and mood prompts with project creation API
- **PR 1.3 Complete**: Moodboard generation via Replicate with gallery UI
- **Phase 1 Complete**: Inspire Me Flow fully implemented! Ready for Phase 2 - Crafting the Story

## Next Steps

### Phase 0 - ✅ COMPLETE
All foundation work completed:
- ✅ PR 0.1: Next.js App & Basic Structure
- ✅ PR 0.2: Supabase Integration & Schema
- ✅ PR 0.3: Session Token & Basic Middleware

### Phase 1 - ✅ COMPLETE
All Inspire Me Flow work completed:
- ✅ PR 1.1: Landing Page & Start Flow UI
- ✅ PR 1.2: Product & Mood Prompt + Project Creation
- ✅ PR 1.3: Moodboard Generation via Replicate

### Immediate (Phase 2 - Crafting the Story)
1. **PR 2.1**: Storyline Generation (Text-Only Tiles)
   - LLM selection and helper
   - Prompt template for storylines
   - API to generate storyline options
   - UI for storyline selection

2. **PR 2.2**: Scene Tile Expansion (Detailed Blurbs)
   - Prompt template for scenes
   - LLM helper for scene generation
   - API to generate scenes
   - UI for scene flow review

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

