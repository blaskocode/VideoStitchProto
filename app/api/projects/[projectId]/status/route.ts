import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { createClient } from "@/lib/supabaseClient";
import { startVideoGeneration } from "@/lib/replicateClient";
import type { Scene } from "@/types/domain";
import Replicate from "replicate";

/**
 * Gets the current status of a project including video generation progress
 * Also automatically retries starting videos for jobs that don't have replicate_run_id
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
      .select("id, status, scenes, moodboards, product_prompt, mood_prompt")
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
    let { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("id, status, type, replicate_run_id, retries")
      .eq("project_id", projectId)
      .eq("type", "video-gen");

    if (jobsError) {
      console.error("Error fetching jobs:", jobsError);
    }

    console.log(`[Status] Found ${jobs?.length || 0} video-gen jobs:`, jobs?.map(j => ({
      id: j.id,
      status: j.status,
      hasReplicateId: !!j.replicate_run_id
    })));

    // Auto-retry: If project is in 'rendering' status but jobs don't have replicate_run_id, start them
    // Include error status jobs for retry, but limit retries to prevent infinite loops
    const scenes = (project.scenes as Scene[]) ?? [];
    const jobsWithoutReplicateId = (jobs || []).filter(job => 
      !job.replicate_run_id && 
      (job.status === "queued" || job.status === "running" || job.status === "error") &&
      (job.retries || 0) < 3 // Max 3 retries per job
    );
    
    console.log(`[Status] Project status: ${project.status}, Jobs without Replicate ID: ${jobsWithoutReplicateId.length}, Scenes: ${scenes.length}`);
    console.log(`[Status] Scenes data:`, JSON.stringify(scenes, null, 2));
    console.log(`[Status] Jobs data:`, JSON.stringify(jobs, null, 2));
    
    // Poll Replicate for jobs that are "running" to check if they're actually complete
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const runningJobs = (jobs || []).filter(job => job.status === "running" && job.replicate_run_id);
    
    for (const job of runningJobs) {
      try {
        const prediction = await replicate.predictions.get(job.replicate_run_id!);
        console.log(`[Status] Polled Replicate for job ${job.id}: ${prediction.status}`);
        
        if (prediction.status === "succeeded" && prediction.output) {
          console.log(`[Status] Job ${job.id} completed! Updating database...`);
          const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
          
          // Update job
          await supabase
            .from("jobs")
            .update({
              status: "success",
              output_urls: [outputUrl],
            })
            .eq("id", job.id);
          
          // Update scene with video URL
          const updatedScenes = scenes.map((scene: any) => {
            if (scene.videoJobId === job.id) {
              return { ...scene, videoUrl: outputUrl };
            }
            return scene;
          });
          
          await supabase
            .from("projects")
            .update({ scenes: updatedScenes })
            .eq("id", projectId);
          
          console.log(`[Status] Updated scene with video URL for job ${job.id}`);
        } else if (prediction.status === "failed" || prediction.status === "canceled") {
          console.log(`[Status] Job ${job.id} failed: ${prediction.error}`);
          await supabase
            .from("jobs")
            .update({
              status: "error",
              error_message: prediction.error || "Prediction failed",
            })
            .eq("id", job.id);
        }
      } catch (pollError) {
        console.error(`[Status] Error polling Replicate for job ${job.id}:`, pollError);
      }
    }
    
    // Re-fetch jobs after polling updates
    if (runningJobs.length > 0) {
      const { data: refreshedJobs } = await supabase
        .from("jobs")
        .select("id, status, type, replicate_run_id, retries")
        .eq("project_id", projectId)
        .eq("type", "video-gen");
      
      if (refreshedJobs) {
        jobs = refreshedJobs;
      }
    }
    
    if (project.status === "rendering" && jobsWithoutReplicateId.length > 0 && scenes.length > 0) {
      console.log(`[Status] Condition met - attempting auto-retry`);
      // Only retry the first job to avoid overwhelming the system
      // The next poll will handle the next job
      const jobToRetry = jobsWithoutReplicateId[0];
      
      // Try to find scene by videoJobId first, then by index if that fails
      let scene = scenes.find((s: any) => s.videoJobId === jobToRetry.id);
      
      // If no scene found by videoJobId, match by index (assuming jobs were created in scene order)
      if (!scene && jobs) {
        const jobIndex = jobs.findIndex(j => j.id === jobToRetry.id);
        if (jobIndex >= 0 && jobIndex < scenes.length) {
          scene = scenes[jobIndex];
          console.log(`[Status] Matched scene by index ${jobIndex} for job ${jobToRetry.id}`);
        }
      }
      
      if (scene && !scene.videoUrl && scene.imageUrl) {
        try {
          console.log(`[Status] Auto-retrying video generation for scene ${scene.id} (job ${jobToRetry.id})`);
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
              retries: ((jobToRetry.retries || 0) + 1),
            })
            .eq("id", jobToRetry.id);

          if (updateJobError) {
            console.error(`[Status] Error updating job ${jobToRetry.id}:`, updateJobError);
          } else {
            console.log(`[Status] Successfully auto-retried job ${jobToRetry.id} with Replicate ID: ${replicateRunId}`);
            // Re-fetch jobs after successful retry
            const { data: updatedJobs } = await supabase
              .from("jobs")
              .select("id, status, type, replicate_run_id, retries")
              .eq("project_id", projectId)
              .eq("type", "video-gen");
            
            if (updatedJobs) {
              jobs = updatedJobs;
            }
          }
        } catch (error) {
          console.error(`[Status] Error auto-retrying video generation for job ${jobToRetry.id}:`, error);
          // Mark job as error to prevent infinite retries
          await supabase
            .from("jobs")
            .update({
              status: "error",
              retries: (jobToRetry.retries || 0) + 1,
              error_message: error instanceof Error ? error.message : "Failed to start video generation",
            })
            .eq("id", jobToRetry.id);
        }
      } else {
        console.log(`[Status] Cannot retry job ${jobToRetry.id}: scene not found or scene missing image/video`);
        console.log(`[Status] Scene found: ${!!scene}, Has videoUrl: ${scene?.videoUrl}, Has imageUrl: ${scene?.imageUrl}`);
      }
    }

    // Check if we have successful jobs but scenes are missing video URLs
    // This happens when webhooks fail (no HTTPS URL) and we need to manually sync
    const successfulJobsWithoutVideoUrls = (jobs || []).filter(job => 
      job.status === "success" && job.replicate_run_id
    );
    
    if (successfulJobsWithoutVideoUrls.length > 0) {
      console.log(`[Status] Found ${successfulJobsWithoutVideoUrls.length} successful jobs, checking if scenes need video URLs...`);
      console.log(`[Status] Successful jobs:`, successfulJobsWithoutVideoUrls.map(j => ({ id: j.id, replicateId: j.replicate_run_id })));
      console.log(`[Status] Scenes status:`, scenes.map((s: any, i: number) => ({ index: i, id: s.id, hasVideoUrl: !!s.videoUrl, videoJobId: s.videoJobId })));
      
      for (const job of successfulJobsWithoutVideoUrls) {
        try {
          // Fetch the prediction to get the input image URL
          const prediction = await replicate.predictions.get(job.replicate_run_id!);
          
          if (prediction.status !== "succeeded" || !prediction.output) {
            console.log(`[Status] Job ${job.id} not succeeded or no output, skipping`);
            continue;
          }
          
          // Extract the input image URL from the prediction
          const inputImageUrl = (prediction.input as any)?.input_image || (prediction.input as any)?.image;
          
          if (!inputImageUrl) {
            console.log(`[Status] Job ${job.id} has no input image URL, skipping`);
            continue;
          }
          
          // Find the scene that matches this input image URL
          let sceneIndex = -1;
          for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            // Match if the scene's imageUrl is in the prediction's input
            if (scene.imageUrl && inputImageUrl.includes(scene.id)) {
              sceneIndex = i;
              console.log(`[Status] Matched job ${job.id} to scene ${scene.id} (index ${i}) by image URL`);
              break;
            }
          }
          
          // Fallback: Try videoJobId if image URL matching failed
          if (sceneIndex === -1) {
            sceneIndex = scenes.findIndex((s: any) => s.videoJobId === job.id);
            if (sceneIndex >= 0) {
              console.log(`[Status] Matched job ${job.id} to scene by videoJobId (index ${sceneIndex})`);
            }
          }
          
          // If we found a scene without a videoUrl, sync it
          if (sceneIndex >= 0 && !scenes[sceneIndex].videoUrl) {
            const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
            console.log(`[Status] Syncing video URL for scene ${scenes[sceneIndex].id}: ${outputUrl}`);
            
            // Update the scene with the video URL
            scenes[sceneIndex].videoUrl = outputUrl;
            
            await supabase
              .from("projects")
              .update({ scenes })
              .eq("id", projectId);
              
            console.log(`[Status] Successfully synced video URL for scene ${scenes[sceneIndex].id}`);
          } else if (sceneIndex >= 0) {
            console.log(`[Status] Scene ${scenes[sceneIndex].id} already has video URL, skipping`);
          } else {
            console.log(`[Status] Could not find matching scene for job ${job.id}`);
          }
        } catch (syncError) {
          console.error(`[Status] Error syncing video for job ${job.id}:`, syncError);
        }
      }
      
      // Re-fetch project to get updated scenes after syncing
      const { data: updatedProject } = await supabase
        .from("projects")
        .select("id, status, scenes, moodboards, product_prompt, mood_prompt")
        .eq("id", projectId)
        .eq("session_token", sessionToken)
        .single();
      
      if (updatedProject) {
        project.scenes = updatedProject.scenes;
        // Update local scenes variable too for progress calculation
        scenes.length = 0;
        scenes.push(...(updatedProject.scenes as Scene[]));
      }
    }
    
    const totalScenes = scenes.length;
    const completedScenes = scenes.filter((scene: any) => scene.videoUrl).length;
    console.log(`[Status] Final count - Total: ${totalScenes}, Completed: ${completedScenes}`);
    const inProgressScenes = (jobs || []).filter(
      (job) => job.status === "running" || job.status === "queued"
    ).length;

    return NextResponse.json({
      project: {
        id: project.id,
        status: project.status,
        moodboards: project.moodboards,
        scenes: project.scenes,
      },
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

