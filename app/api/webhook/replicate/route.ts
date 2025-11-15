import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseClient";
import { uploadVideoFromUrl } from "@/lib/storage";
import { v4 as uuidv4 } from "uuid";

/**
 * Webhook handler for Replicate prediction events
 * Handles both 'completed' and 'failed' events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Replicate webhook payload structure
    const { 
      id: replicateRunId, 
      status, 
      output, 
      error: replicateError,
      metrics,
      created_at,
      completed_at,
      started_at
    } = body;

    if (!replicateRunId) {
      return NextResponse.json(
        { error: "Missing replicateRunId" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Find job by replicate run ID
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*, projects!inner(id, scenes)")
      .eq("replicate_run_id", replicateRunId)
      .single();

    if (jobError || !job) {
      console.error("Job not found for replicateRunId:", replicateRunId);
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    const project = job.projects as any;

    // Calculate duration in milliseconds
    let durationMs: number | null = null;
    if (completed_at && started_at) {
      const startTime = new Date(started_at).getTime();
      const endTime = new Date(completed_at).getTime();
      durationMs = endTime - startTime;
    } else if (completed_at && job.created_at) {
      // Fallback: use job created_at if started_at not available
      const startTime = new Date(job.created_at).getTime();
      const endTime = new Date(completed_at).getTime();
      durationMs = endTime - startTime;
    }

    // Estimate cost based on job type and duration
    // Replicate pricing varies by model, but for MVP we'll use rough estimates
    let estimatedCost: number | null = null;
    if (job.type === "video-gen" && durationMs) {
      // Rough estimate: $0.01 per second of video generation
      // This is a placeholder - actual costs vary by model
      estimatedCost = (durationMs / 1000) * 0.01;
    } else if (job.type === "image-gen") {
      // Rough estimate: $0.001 per image
      estimatedCost = 0.001;
    }

    if (status === "succeeded" && output) {
      // Video generation succeeded
      let videoUrl: string | undefined;

      // Handle different output formats (string URL or array of URLs)
      const outputUrl = Array.isArray(output) ? output[0] : output;

      if (typeof outputUrl === "string") {
        try {
          // Upload video to Supabase Storage
          const videoId = uuidv4();
          const path = `videos/${job.project_id}/${videoId}.mp4`;
          videoUrl = await uploadVideoFromUrl(outputUrl, "videos", path);
        } catch (uploadError) {
          console.error("Error uploading video:", uploadError);
          // Fall back to using Replicate URL directly
          videoUrl = outputUrl;
        }
      }

      // Update job status with duration and cost
      await supabase
        .from("jobs")
        .update({
          status: "success",
          output_urls: videoUrl ? [videoUrl] : (Array.isArray(output) ? output : [output]),
          duration_ms: durationMs,
          cost: estimatedCost,
        })
        .eq("id", job.id);

      // Update scene with video URL
      const scenes = (project.scenes as any[]) ?? [];
      const updatedScenes = scenes.map((scene: any) => {
        if (scene.videoJobId === job.id) {
          return { ...scene, videoUrl };
        }
        return scene;
      });

      await supabase
        .from("projects")
        .update({ scenes: updatedScenes })
        .eq("id", job.project_id);
    } else if (status === "failed" || status === "canceled") {
      // Video generation failed
      const errorMessage =
        replicateError || "Video generation failed or was canceled";

      const currentRetries = (job.retries || 0);
      const maxRetries = 2; // Max 2 retries (3 total attempts)
      const newRetries = currentRetries + 1;

      // Update job with error and retry count
      await supabase
        .from("jobs")
        .update({
          status: "error",
          error_message: errorMessage,
          retries: newRetries,
        })
        .eq("id", job.id);

      // If max retries exceeded, mark project as error
      if (newRetries >= maxRetries) {
        await supabase
          .from("projects")
          .update({
            status: "error",
          })
          .eq("id", job.project_id);
        
        console.log(`Job ${job.id} failed after ${newRetries} retries. Project marked as error.`);
      } else {
        console.log(`Job ${job.id} failed, retry ${newRetries}/${maxRetries}. Manual retry may be needed.`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in webhook handler:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

