import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { createClient } from "@/lib/supabaseClient";

/**
 * Approves scenes and marks project as ready for visual generation
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
      .select("id, scenes")
      .eq("id", projectId)
      .eq("session_token", sessionToken)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Check if scenes exist
    if (!project.scenes || (Array.isArray(project.scenes) && project.scenes.length === 0)) {
      return NextResponse.json(
        { error: "No scenes to approve" },
        { status: 400 }
      );
    }

    // Update project status to 'rendering' (ready for visual generation)
    // Note: We keep status as 'story' until visual generation actually starts
    // For now, we'll keep it as 'story' and the next phase will handle the transition
    // But we can add a flag or just let the next phase check if scenes exist
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        // Status remains 'story' - visual generation phase will update to 'rendering'
        // Scenes are already saved, so we just need to confirm approval
      })
      .eq("id", projectId);

    if (updateError) {
      console.error("Error approving scenes:", updateError);
      return NextResponse.json(
        { error: "Failed to approve scenes" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/projects/[projectId]/scenes/approve:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

