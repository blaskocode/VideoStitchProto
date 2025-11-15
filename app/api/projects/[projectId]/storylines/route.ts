import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { createClient } from "@/lib/supabaseClient";
import { generateStorylines } from "@/lib/llmClient";
import type { StorylineOption } from "@/lib/llmClient";

/**
 * Generates storyline options for a project
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const sessionToken = await getSessionToken();

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Session token not found" },
        { status: 401 }
      );
    }

    const supabase = createClient();

    // Fetch project and validate session
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("session_token", sessionToken)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Generate storylines
    const storylines = await generateStorylines({
      productPrompt: project.product_prompt,
      moodPrompt: project.mood_prompt ?? undefined,
      likedMoodboards: (project.liked_moodboards as string[]) ?? [],
    });

    // Store storyline options in project (using a temporary field or existing JSONB)
    // For MVP, we'll store in a storyline_options JSONB field
    // Note: This field may need to be added to the schema
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        storyline_options: storylines,
      })
      .eq("id", projectId);

    if (updateError) {
      console.error("Error saving storyline options:", updateError);
      // Continue even if save fails - we still return the storylines
    }

    return NextResponse.json({ storylines });
  } catch (error) {
    console.error("Error in POST /api/projects/[projectId]/storylines:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Gets existing storyline options for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const sessionToken = await getSessionToken();

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Session token not found" },
        { status: 401 }
      );
    }

    const supabase = createClient();

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("storyline_options")
      .eq("id", projectId)
      .eq("session_token", sessionToken)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      storylines: (project.storyline_options as StorylineOption[]) ?? [],
    });
  } catch (error) {
    console.error("Error in GET /api/projects/[projectId]/storylines:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

