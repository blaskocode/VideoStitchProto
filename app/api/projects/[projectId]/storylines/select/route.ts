import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { createClient } from "@/lib/supabaseClient";
import type { StorylineOption } from "@/lib/llmClient";

/**
 * Saves the selected storyline for a project
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

    const body = await request.json();
    const { selectedStorylineIndex } = body;

    if (
      typeof selectedStorylineIndex !== "number" ||
      selectedStorylineIndex < 0
    ) {
      return NextResponse.json(
        { error: "selectedStorylineIndex must be a valid number" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Fetch project and validate session
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

    const storylineOptions =
      (project.storyline_options as StorylineOption[]) ?? [];

    if (selectedStorylineIndex >= storylineOptions.length) {
      return NextResponse.json(
        { error: "Invalid storyline index" },
        { status: 400 }
      );
    }

    const selectedStoryline = storylineOptions[selectedStorylineIndex];

    // Format the selected storyline as text for storage
    const storylineText = `${selectedStoryline.title}\n\n${selectedStoryline.overview}\n\nScenes:\n${selectedStoryline.scenes.map((s) => `- ${s}`).join("\n")}`;

    // Update project with selected storyline and change status to 'story'
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        storyline_option: storylineText,
        status: "story",
      })
      .eq("id", projectId);

    if (updateError) {
      console.error("Error saving selected storyline:", updateError);
      return NextResponse.json(
        { error: "Failed to save selected storyline" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/projects/[projectId]/storylines/select:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

