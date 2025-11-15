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
    console.log(`[VideoStart] POST /api/projects/${projectId}/videos/start`);
    const sessionToken = await getSessionToken();

    if (!sessionToken) {
      console.error(`[VideoStart] No session token found`);
      return NextResponse.json(
        { error: "Session token not found" },
        { status: 401 }
      );
    }

    const supabase = createClient();
    console.log(`[VideoStart] Session token validated, fetching project...`);

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
    console.log(`[VideoStart] Project status: ${project.status}, Scenes: ${scenes.length}`);

    if (scenes.length === 0) {
      console.error(`[VideoStart] No scenes found`);
      return NextResponse.json(
        { error: "No scenes found for this project" },
        { status: 400 }
      );
    }

    // Check if all scenes have images
    const allScenesHaveImages = scenes.every((scene) => scene.imageUrl);
    console.log(`[VideoStart] All scenes have images: ${allScenesHaveImages}`);
    if (!allScenesHaveImages) {
      const scenesWithoutImages = scenes.filter((scene) => !scene.imageUrl);
      console.error(`[VideoStart] Scenes without images:`, scenesWithoutImages.map(s => s.id));
      return NextResponse.json(
        { error: "Not all scenes have images yet" },
        { status: 400 }
      );
    }

    const jobIds: string[] = [];

    // First, check for existing jobs without replicate_run_id and retry them
    const { data: existingJobs } = await supabase
      .from("jobs")
      .select("id, project_id")
      .eq("project_id", projectId)
      .eq("type", "video-gen")
      .is("replicate_run_id", null)
      .in("status", ["queued", "running"]);

    if (existingJobs && existingJobs.length > 0) {
      console.log(`[VideoStart] Found ${existingJobs.length} existing jobs without replicate_run_id. Retrying...`);
      
      // Find scenes associated with these jobs
      for (const job of existingJobs) {
        const scene = scenes.find((s: any) => s.videoJobId === job.id);
        if (!scene || scene.videoUrl) {
          continue; // Skip if scene not found or already has video
        }

        try {
          console.log(`[VideoStart] Retrying video generation for scene ${scene.id} (job ${job.id})`);
          const { replicateRunId } = await startVideoGeneration(scene, {
            durationSec: 5,
            productPrompt: project.product_prompt,
            moodPrompt: project.mood_prompt ?? undefined,
          });

          const { error: updateJobError } = await supabase
            .from("jobs")
            .update({
              replicate_run_id: replicateRunId,
              status: "running",
            })
            .eq("id", job.id);

          if (updateJobError) {
            console.error(`[VideoStart] Error updating job ${job.id}:`, updateJobError);
          } else {
            console.log(`[VideoStart] Successfully retried job ${job.id} with Replicate ID: ${replicateRunId}`);
            jobIds.push(job.id);
          }
        } catch (error) {
          console.error(`[VideoStart] Error retrying video generation for job ${job.id}:`, error);
        }
      }
    }

    const { data: projectJobs, error: projectJobsError } = await supabase
      .from("jobs")
      .select("id, status, replicate_run_id, retries")
      .eq("project_id", projectId)
      .eq("type", "video-gen");

    if (projectJobsError) {
      console.error(`[VideoStart] Error fetching existing jobs:`, projectJobsError);
    }

    const jobsById = new Map<string, { id: string; status: string; replicate_run_id: string | null; retries?: number }>();
    for (const job of projectJobs || []) {
      jobsById.set(job.id, job as any);
    }

    // Create video generation jobs for scenes that don't have jobs yet
    for (const scene of scenes) {
      try {
        // Skip if video already exists
        if (scene.videoUrl) {
          continue;
        }

        const sceneJobId = (scene as any).videoJobId as string | undefined;
        if (sceneJobId) {
          const linkedJob = jobsById.get(sceneJobId);
          if (linkedJob) {
            if (linkedJob.status === "success") {
              continue;
            }
            if (linkedJob.status === "running" || linkedJob.status === "queued") {
              console.log(`[VideoStart] Scene ${scene.id} already has active job ${sceneJobId} (${linkedJob.status}). Skipping.`);
              jobIds.push(sceneJobId);
              continue;
            }
            console.log(`[VideoStart] Existing job ${sceneJobId} for scene ${scene.id} is in status ${linkedJob.status}. Creating a fresh job.`);
          } else {
            console.log(`[VideoStart] Scene ${scene.id} references missing job ${sceneJobId}. Creating a fresh job.`);
          }
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
        console.log(`[VideoStart] Starting video generation for scene ${scene.id}`);
        const { replicateRunId } = await startVideoGeneration(scene, {
          durationSec: 5,
          productPrompt: project.product_prompt,
          moodPrompt: project.mood_prompt ?? undefined,
        });

        console.log(`[VideoStart] Video generation started. Replicate Run ID: ${replicateRunId}, Job ID: ${jobId}`);

        // Update job with replicate run ID
        const { error: updateJobError } = await supabase
          .from("jobs")
          .update({
            replicate_run_id: replicateRunId,
            status: "running",
          })
          .eq("id", jobId);

        if (updateJobError) {
          console.error(`[VideoStart] Error updating job ${jobId}:`, updateJobError);
        }

        // Update scene with job ID
        const updatedScenes = scenes.map((s) =>
          s.id === scene.id ? { ...s, videoJobId: jobId } : s
        );

        const { error: updateScenesError } = await supabase
          .from("projects")
          .update({ scenes: updatedScenes })
          .eq("id", projectId);

        if (updateScenesError) {
          console.error(`[VideoStart] Error updating scenes:`, updateScenesError);
        }

        jobIds.push(jobId);
        console.log(`[VideoStart] Successfully started video generation for scene ${scene.id}. Job: ${jobId}, Replicate: ${replicateRunId}`);
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

