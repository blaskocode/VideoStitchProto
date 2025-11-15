import Replicate from "replicate";
import { uploadImageFromUrl } from "@/lib/storage";
import { v4 as uuidv4 } from "uuid";
import { buildVideoPrompt } from "@/prompts/videoPrompt";
import type { Scene } from "@/types/domain";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

/**
 * Generates moodboard images using Replicate.
 * For MVP, uses a stable diffusion model with cinematic style prompts.
 *
 * @param prompt - The image generation prompt
 * @param count - Number of images to generate
 * @returns Array of image URLs
 */
export async function generateMoodboardImages(
  prompt: string,
  count: number = 1
): Promise<string[]> {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN is not set");
  }

  // Enhance prompt with cinematic style modifiers
  const enhancedPrompt = `${prompt}, cinematic, realistic commercial, professional lighting, high production value, 16:9 aspect ratio, commercial photography style`;

  try {
    // Use stable-diffusion-xl model for image generation
    // Model: stability-ai/sdxl
    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt: enhancedPrompt,
          num_outputs: count,
          aspect_ratio: "16:9",
          output_format: "url",
        },
      }
    );

    // Handle different output formats
    if (Array.isArray(output)) {
      return output.filter((url): url is string => typeof url === "string");
    }

    // If single output, wrap in array
    if (typeof output === "string") {
      return [output];
    }

    return [];
  } catch (error) {
    console.error("Error generating images with Replicate:", error);
    throw new Error(`Failed to generate images: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Generates a single scene image for video generation guidance.
 * Uploads the image to Supabase Storage and returns the public URL.
 *
 * @param blurb - Scene description
 * @param sceneId - Scene ID for organizing storage paths
 * @returns Public URL of the uploaded image in Supabase Storage
 */
export async function generateSceneImage(
  blurb: string,
  sceneId: string
): Promise<string> {
  // Enhance prompt with cinematic style modifiers
  const enhancedPrompt = `${blurb}, Cinematic, realistic commercial, 35mm lens, soft depth of field, professional lighting, high production value, 16:9 frame`;

  // Generate image using Replicate
  const urls = await generateMoodboardImages(enhancedPrompt, 1);
  if (urls.length === 0) {
    throw new Error("No image generated");
  }

  const replicateImageUrl = urls[0];

  // Upload to Supabase Storage
  const imageId = uuidv4();
  const path = `scenes/${sceneId}/${imageId}.jpg`;
  const publicUrl = await uploadImageFromUrl(
    replicateImageUrl,
    "scenes", // We'll need to create this bucket
    path
  );

  return publicUrl;
}

/**
 * Starts video generation for a scene using Replicate.
 * Supports image-to-video models if imageUrl is provided.
 *
 * @param scene - The scene object with blurb and optional imageUrl
 * @param options - Video generation options
 * @returns Replicate run ID for tracking the async job
 */
export async function startVideoGeneration(
  scene: Scene,
  options: {
    durationSec?: number;
    productPrompt: string;
    moodPrompt?: string;
  }
): Promise<{ replicateRunId: string }> {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN is not set");
  }

  const durationSec = options.durationSec || 5;

  // Build video prompt
  const prompt = buildVideoPrompt({
    sceneBlurb: scene.blurb,
    productPrompt: options.productPrompt,
    moodPrompt: options.moodPrompt,
    imageUrl: scene.imageUrl,
  });

  try {
    // Choose model based on whether we have an image
    // For image-to-video: stability-ai/stable-video-diffusion
    // For text-to-video: anotherjesse/zeroscope-v2-xl
    const videoModel = scene.imageUrl
      ? "stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb47dc5d5506c288ab" // Image-to-video
      : "anotherjesse/zeroscope-v2-xl:71996d33189a2a87f7d8c779b317d0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0"; // Text-to-video

    const input: any = {
      prompt: prompt,
    };

    // If image URL exists, use image-to-video model
    if (scene.imageUrl && videoModel.includes("stable-video-diffusion")) {
      input.image = scene.imageUrl;
      // Stable Video Diffusion doesn't use duration parameter
    } else {
      // Text-to-video models may support duration
      input.num_frames = Math.floor(durationSec * 8); // ~8 fps for zeroscope
    }

    // Create async prediction (returns immediately with run ID)
    const prediction = await replicate.predictions.create({
      model: videoModel,
      input: input,
      webhook: `${process.env.APP_BASE_URL}/api/webhook/replicate`,
      webhook_events_filter: ["completed", "failed"],
    });

    return { replicateRunId: prediction.id };
  } catch (error) {
    console.error("Error starting video generation:", error);
    throw new Error(
      `Failed to start video generation: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

