import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { createClient } from "@/lib/supabaseClient";

/**
 * Gets the current status of a project including video generation progress
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

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, status, scenes")
      .eq("id", projectId)
      .eq("session_token", sessionToken)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Fetch all video generation jobs for this project
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("id, status, type")
      .eq("project_id", projectId)
      .eq("type", "video-gen");

    if (jobsError) {
      console.error("Error fetching jobs:", jobsError);
    }

    const scenes = (project.scenes as any[]) ?? [];
    const totalScenes = scenes.length;
    const completedScenes = scenes.filter((scene: any) => scene.videoUrl).length;
    const inProgressScenes = (jobs || []).filter(
      (job) => job.status === "running" || job.status === "queued"
    ).length;

    return NextResponse.json({
      projectId,
      status: project.status,
      progress: {
        total: totalScenes,
        completed: completedScenes,
        inProgress: inProgressScenes,
        current: completedScenes + 1, // Current scene being processed
      },
      jobs: jobs || [],
    });
  } catch (error) {
    console.error("Error in GET /api/projects/[projectId]/status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

