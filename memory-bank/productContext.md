# Product Context

## Why This Project Exists

The Video Stitching App addresses the need for rapid, high-quality video ad creation without requiring video editing expertise or expensive production resources. It democratizes professional video creation by combining AI-powered generation with an intuitive, guided workflow.

## Problems It Solves

1. **Time to market**: Traditional video production takes days/weeks; this reduces it to minutes
2. **Skill barrier**: No video editing knowledge required
3. **Cost efficiency**: Avoids expensive production teams and equipment
4. **Creative discovery**: Helps users discover and refine their vision through guided prompts
5. **Consistency**: Ensures cohesive style across all scenes in a video

## How It Should Work

### User Experience Flow

1. **Inspire Me Phase**
   - User describes what they're trying to create (e.g., "A TikTok-style ad for new running shoes")
   - System asks about mood (Exciting, Reflective, Intense, Mysterious, etc.)
   - System generates 6–10 moodboards
   - User likes/skips moodboards to refine style direction

2. **Crafting the Story Phase**
   - System generates 3 text-only storyline options based on product + mood + liked moodboards
   - User selects preferred storyline
   - System expands storyline into 3–5 detailed scene tiles (text descriptions)
   - User approves full scene flow
   - System generates one cinematic realism image per scene (for video generation guidance)

3. **Generate the Video Phase**
   - System generates video clips (5–10 seconds each) via Replicate for each scene
   - Clips are stored in Supabase
   - User chooses from 3 music options
   - FFmpeg worker stitches clips, adds transitions, overlays music
   - Final video rendered and available for download

## User Experience Goals

- **Simplicity**: Linear, step-by-step flow with minimal decisions
- **Speed**: Complete process in 10–15 minutes including rendering
- **Quality**: Professional-looking output that meets commercial standards
- **Discovery**: Help users who don't know exactly what they want
- **Confidence**: Clear progress indicators and status updates throughout

## Target Users

- Content creators needing quick ad videos
- Small businesses creating marketing materials
- Social media managers producing campaign content
- Anyone wanting professional video without production expertise

