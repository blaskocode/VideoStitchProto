import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { createClient } from "@/lib/supabaseClient";

/**
 * Saves liked moodboard IDs for a project
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
    const { likedMoodboardIds } = body;

    if (!Array.isArray(likedMoodboardIds)) {
      return NextResponse.json(
        { error: "likedMoodboardIds must be an array" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Validate session matches project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("session_token", sessionToken)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Update liked moodboards (status remains 'inspire')
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        liked_moodboards: likedMoodboardIds,
      })
      .eq("id", projectId);

    if (updateError) {
      console.error("Error saving liked moodboards:", updateError);
      return NextResponse.json(
        { error: "Failed to save liked moodboards" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/projects/[projectId]/moodboards/like:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

