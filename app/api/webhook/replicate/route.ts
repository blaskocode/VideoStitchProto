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
    const { id: replicateRunId, status, output, error: replicateError } = body;

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

      // Update job status
      await supabase
        .from("jobs")
        .update({
          status: "success",
          output_urls: videoUrl ? [videoUrl] : (Array.isArray(output) ? output : [output]),
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

      await supabase
        .from("jobs")
        .update({
          status: "error",
          error_message: errorMessage,
        })
        .eq("id", job.id);

      // Optionally trigger retry if below max attempts
      const retries = (job.retries || 0) + 1;
      const maxRetries = 3;

      if (retries < maxRetries) {
        // TODO: Implement retry logic if needed
        console.log(`Job ${job.id} failed, retry ${retries}/${maxRetries}`);
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

