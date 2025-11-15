import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { createClient } from "@/lib/supabaseClient";

/**
 * Saves the selected music track for a project
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
    const { musicTrackId } = body;

    if (!musicTrackId || typeof musicTrackId !== "string") {
      return NextResponse.json(
        { error: "musicTrackId is required" },
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

    // Update project with selected music track
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        music_track_id: musicTrackId,
      })
      .eq("id", projectId);

    if (updateError) {
      console.error("Error saving music track:", updateError);
      return NextResponse.json(
        { error: "Failed to save music track" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/projects/[projectId]/music/select:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


