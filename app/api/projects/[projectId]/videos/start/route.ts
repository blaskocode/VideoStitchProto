import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { createClient } from "@/lib/supabaseClient";
import { startVideoGeneration } from "@/lib/replicateClient";
import { v4 as uuidv4 } from "uuid";
import type { Scene } from "@/types/domain";

/**
 * Starts video generation for all scenes in a project
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

    const scenes = (project.scenes as Scene[]) ?? [];

    if (scenes.length === 0) {
      return NextResponse.json(
        { error: "No scenes found for this project" },
        { status: 400 }
      );
    }

    // Check if all scenes have images
    const allScenesHaveImages = scenes.every((scene) => scene.imageUrl);
    if (!allScenesHaveImages) {
      return NextResponse.json(
        { error: "Not all scenes have images yet" },
        { status: 400 }
      );
    }

    const jobIds: string[] = [];

    // Create video generation jobs for each scene
    for (const scene of scenes) {
      try {
        // Skip if video already exists
        if (scene.videoUrl) {
          continue;
        }

        // Create job record
        const jobId = uuidv4();
        const { error: jobError } = await supabase.from("jobs").insert({
          id: jobId,
          project_id: projectId,
          type: "video-gen",
          status: "queued",
        });

        if (jobError) {
          console.error(`Error creating job for scene ${scene.id}:`, jobError);
          continue;
        }

        // Start video generation
        const { replicateRunId } = await startVideoGeneration(scene, {
          durationSec: 5,
          productPrompt: project.product_prompt,
          moodPrompt: project.mood_prompt ?? undefined,
        });

        // Update job with replicate run ID
        await supabase
          .from("jobs")
          .update({
            replicate_run_id: replicateRunId,
            status: "running",
          })
          .eq("id", jobId);

        // Update scene with job ID
        const updatedScenes = scenes.map((s) =>
          s.id === scene.id ? { ...s, videoJobId: jobId } : s
        );

        await supabase
          .from("projects")
          .update({ scenes: updatedScenes })
          .eq("id", projectId);

        jobIds.push(jobId);
      } catch (error) {
        console.error(`Error starting video generation for scene ${scene.id}:`, error);
        // Continue with other scenes even if one fails
      }
    }

    // Update project status to 'rendering'
    await supabase
      .from("projects")
      .update({ status: "rendering" })
      .eq("id", projectId);

    return NextResponse.json({ jobIds });
  } catch (error) {
    console.error("Error in POST /api/projects/[projectId]/videos/start:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

