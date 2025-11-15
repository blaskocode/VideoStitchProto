import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { createClient } from "@/lib/supabaseClient";
import { composeProjectVideo } from "@/lib/composeVideo";
import type { Scene } from "@/types/domain";

/**
 * POST /api/projects/[projectId]/compose
 * Triggers video composition: stitches scene clips + music into final video
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
        { error: "Session token required" },
        { status: 401 }
      );
    }

    const supabase = createClient();

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("session_token", sessionToken)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Validate project state
    const scenes = (project.scenes as Scene[]) ?? [];
    const scenesWithVideos = scenes.filter((scene) => scene.videoUrl);

    if (scenesWithVideos.length === 0) {
      return NextResponse.json(
        { error: "No scenes have video URLs" },
        { status: 400 }
      );
    }

    if (!project.music_track_id) {
      return NextResponse.json(
        { error: "No music track selected" },
        { status: 400 }
      );
    }

    // Create compose job
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .insert({
        project_id: projectId,
        type: "compose",
        status: "running",
      })
      .select()
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: "Failed to create compose job" },
        { status: 500 }
      );
    }

    try {
      // Track composition start time
      const composeStartTime = Date.now();

      // Compose the video
      const finalVideoUrl = await composeProjectVideo(
        projectId,
        scenes,
        project.music_track_id
      );

      // Calculate composition duration
      const composeDurationMs = Date.now() - composeStartTime;
      const composeCost = 0.0; // FFmpeg composition is free (just compute time)

      // Update job status with duration and cost
      await supabase
        .from("jobs")
        .update({
          status: "success",
          output_urls: [finalVideoUrl],
          duration_ms: composeDurationMs,
          cost: composeCost,
        })
        .eq("id", job.id);

      // Roll up total cost and generation time from all jobs
      const { data: allJobs } = await supabase
        .from("jobs")
        .select("cost, duration_ms")
        .eq("project_id", projectId)
        .in("status", ["success"]);

      const totalCost = allJobs?.reduce((sum, j) => sum + (Number(j.cost) || 0), 0) || 0;
      const totalGenerationMs = allJobs?.reduce((sum, j) => sum + (Number(j.duration_ms) || 0), 0) || 0;

      // Update project with final video URL, status, and rollup metrics
      await supabase
        .from("projects")
        .update({
          final_video_url: finalVideoUrl,
          status: "complete",
          total_cost: totalCost,
          total_generation_ms: totalGenerationMs,
        })
        .eq("id", projectId);

      return NextResponse.json({
        success: true,
        finalVideoUrl,
        jobId: job.id,
      });
    } catch (composeError) {
      // Update job with error
      await supabase
        .from("jobs")
        .update({
          status: "error",
          error_message:
            composeError instanceof Error
              ? composeError.message
              : "Unknown error",
        })
        .eq("id", job.id);

      // Update project status to error
      await supabase
        .from("projects")
        .update({
          status: "error",
        })
        .eq("id", projectId);

      return NextResponse.json(
        {
          error: "Composition failed",
          message:
            composeError instanceof Error
              ? composeError.message
              : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in compose route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

