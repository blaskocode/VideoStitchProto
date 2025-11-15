import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { createClient } from "@/lib/supabaseClient";

/**
 * Approves the visual storyboard and marks project as ready for video generation
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

    // Validate session matches project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, scenes, status")
      .eq("id", projectId)
      .eq("session_token", sessionToken)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Check if all scenes have images
    const scenes = (project.scenes as any[]) ?? [];
    const allScenesHaveImages = scenes.every(
      (scene: any) => scene.imageUrl
    );

    if (!allScenesHaveImages) {
      return NextResponse.json(
        { error: "Not all scenes have images yet" },
        { status: 400 }
      );
    }

    // Update project status to 'rendering' (ready for video generation)
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        status: "rendering",
      })
      .eq("id", projectId);

    if (updateError) {
      console.error("Error approving storyboard:", updateError);
      return NextResponse.json(
        { error: "Failed to approve storyboard" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "Error in POST /api/projects/[projectId]/scenes/images/approve:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

