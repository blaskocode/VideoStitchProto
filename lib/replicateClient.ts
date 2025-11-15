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
    console.log(`[Replicate] Generating ${count} image(s) with prompt: ${enhancedPrompt.substring(0, 100)}...`);
    
    // Use predictions API with polling to get better control and see actual output
    const modelIdentifier = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";
    
    const prediction = await replicate.predictions.create({
      version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      input: {
        prompt: enhancedPrompt,
        num_outputs: count,
        aspect_ratio: "16:9",
        output_format: "url",
      },
    });

    console.log(`[Replicate] Prediction created:`, prediction.id, `Status:`, prediction.status);
    console.log(`[Replicate] Initial output:`, prediction.output);

    // Poll for completion (max 5 minutes)
    let currentPrediction = prediction;
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes
    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds

    while (
      (currentPrediction.status === "starting" || currentPrediction.status === "processing") &&
      (Date.now() - startTime) < maxWaitTime
    ) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      currentPrediction = await replicate.predictions.get(currentPrediction.id);
      console.log(`[Replicate] Polling... Status:`, currentPrediction.status, `Output:`, currentPrediction.output);
    }

    if (currentPrediction.status === "failed" || currentPrediction.status === "canceled") {
      const errorMsg = currentPrediction.error || "Unknown error";
      console.error(`[Replicate] Prediction failed:`, errorMsg);
      throw new Error(`Prediction ${currentPrediction.status}: ${errorMsg}`);
    }

    if (currentPrediction.status !== "succeeded") {
      throw new Error(`Prediction did not complete. Status: ${currentPrediction.status}`);
    }

    const output = currentPrediction.output;


    console.log(`[Replicate] Raw output:`, JSON.stringify(output, null, 2));
    console.log(`[Replicate] Output type:`, typeof output, Array.isArray(output) ? 'array' : 'not array');
    
    // Handle different output formats
    if (Array.isArray(output)) {
      // Check if array contains objects that might have URL properties
      const urls: string[] = [];
      for (const item of output) {
        if (typeof item === "string" && item.length > 0) {
          urls.push(item);
        } else if (typeof item === "object" && item !== null) {
          // Inspect object properties
          console.log(`[Replicate] Inspecting object item:`, Object.keys(item), Object.values(item));
          // Try to find URL in object
          const itemStr = JSON.stringify(item);
          console.log(`[Replicate] Object stringified:`, itemStr);
          
          // Check for URL-like strings in the object
          const urlMatch = itemStr.match(/https?:\/\/[^\s"']+/);
          if (urlMatch) {
            urls.push(urlMatch[0]);
            console.log(`[Replicate] Found URL in object:`, urlMatch[0]);
          }
          
          // Also check common properties
          for (const key of ['url', 'image', 'output', 'image_url', 'output_url', 'file', 'path']) {
            if (key in item && typeof (item as any)[key] === 'string' && (item as any)[key].length > 0) {
              urls.push((item as any)[key]);
              console.log(`[Replicate] Found URL in property '${key}':`, (item as any)[key]);
            }
          }
        }
      }
      console.log(`[Replicate] Extracted ${urls.length} URL(s) from array output`);
      return urls;
    }

    // If single output, wrap in array
    if (typeof output === "string" && output.length > 0) {
      console.log(`[Replicate] Single URL output: ${output}`);
      return [output];
    }

    // Check if output is an object with URL fields
    if (typeof output === "object" && output !== null) {
      // Try common URL field names
      const possibleUrlFields = ['url', 'image', 'output', 'image_url', 'output_url'];
      for (const field of possibleUrlFields) {
        if (field in output && typeof (output as any)[field] === 'string') {
          const url = (output as any)[field];
          console.log(`[Replicate] Found URL in field '${field}': ${url}`);
          return [url];
        }
      }
      
      // If it's an array-like object, try to extract URLs
      if (Array.isArray((output as any).outputs)) {
        const urls = (output as any).outputs.filter((url: any): url is string => typeof url === "string" && url.length > 0);
        console.log(`[Replicate] Extracted ${urls.length} URL(s) from outputs array`);
        return urls;
      }
    }

    console.warn(`[Replicate] Unexpected output format:`, typeof output, output);
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

  const imageId = uuidv4();
  const storageBucket =
    process.env.NEXT_PUBLIC_SUPABASE_SCENES_BUCKET || "scenes";
  const path = `scenes/${sceneId}/${imageId}.jpg`;

  try {
    const publicUrl = await uploadImageFromUrl(
      replicateImageUrl,
      storageBucket,
      path
    );
    return publicUrl;
  } catch (error) {
    console.warn(
      `[SceneImage] Failed to upload image to bucket "${storageBucket}". Falling back to Replicate URL.`,
      error
    );
    return replicateImageUrl;
  }
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
    const defaultImageToVideoModel = "stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb47dc5d5506c288ab";
    const defaultTextToVideoModel = "lucataco/hotshot-xl:78b3a6257e16e4b241245d65c8b2b81ea2e1ff7ed4c55306b511509ddbfd327a";

    const configuredModel = process.env.REPLICATE_VIDEO_MODEL?.trim();

    let videoModel = configuredModel && configuredModel.length > 0
      ? configuredModel
      : scene.imageUrl
        ? defaultImageToVideoModel
        : defaultTextToVideoModel;

    // Determine whether to send the image URL based on model capabilities
    const modelLower = videoModel.toLowerCase();
    const supportsImageToVideo = !!scene.imageUrl && !modelLower.includes("zeroscope") && !modelLower.includes("hotshot");

    const input: Record<string, unknown> = {
      prompt: prompt,
    };

    if (supportsImageToVideo) {
      // stable-video-diffusion uses input_image, not image
      if (modelLower.includes("stable-video-diffusion")) {
        input.input_image = scene.imageUrl;
      } else {
        input.image = scene.imageUrl;
      }
    } else {
      // For text-to-video models like hotshot-xl, use video_length
      if (modelLower.includes("hotshot")) {
        input.video_length = "8_frames"; // Hotshot-XL only supports 8 frames
      } else {
        // For other text-to-video models, approximate duration via num_frames
        input.num_frames = Math.max(24, Math.floor(durationSec * 8));
      }
    }

    console.log(`[VideoGeneration] Starting video generation for scene ${scene.id}`);
    console.log(`[VideoGeneration] Model: ${videoModel}`);
    console.log(`[VideoGeneration] Input keys:`, Object.keys(input));
    console.log(`[VideoGeneration] Has image:`, !!scene.imageUrl);

    // Extract model owner/name and version
    const [modelOwnerName, requestedVersion] = videoModel.includes(":")
      ? [videoModel.split(":")[0], videoModel.split(":")[1]]
      : [videoModel, undefined];

    console.log(`[VideoGeneration] Model owner/name: ${modelOwnerName}, Requested version: ${requestedVersion || "latest"}`);

    let resolvedVersion: string | undefined = requestedVersion;
    let availableVersions: string[] = [];

    const [modelOwner, modelName] = modelOwnerName.includes("/")
      ? modelOwnerName.split("/", 2)
      : [undefined, undefined];

    if (!modelOwner || !modelName) {
      throw new Error(`Invalid model identifier: ${modelOwnerName}`);
    }

    if (process.env.REPLICATE_API_TOKEN) {
      try {
        const response = await fetch(`https://api.replicate.com/v1/models/${modelOwner}/${modelName}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          console.warn(
            `[VideoGeneration] Failed to fetch model info for ${modelOwnerName}: HTTP ${response.status}`
          );
          resolvedVersion = undefined;
        } else {
          const info = await response.json();
          availableVersions = (info?.versions || []).map((v: any) => v.id).filter(Boolean);

          const latestVersion: string | undefined =
            info?.latest_version?.id || info?.default_version?.id || availableVersions[0];

          const hasRequestedVersion = requestedVersion && availableVersions.includes(requestedVersion);
          if (!hasRequestedVersion) {
            console.warn(
              `[VideoGeneration] Requested version ${requestedVersion} not available. Falling back to ${latestVersion || "latest"}.`
            );
            resolvedVersion = latestVersion;
          }

          if (!resolvedVersion) {
            resolvedVersion = latestVersion;
          }
        }
      } catch (modelError) {
        console.error(`[VideoGeneration] Error fetching model info for ${modelOwnerName}:`, modelError);
        resolvedVersion = undefined;
        availableVersions = [];
      }
    } else {
      console.warn("[VideoGeneration] REPLICATE_API_TOKEN is not set. Skipping model version lookup.");
    }

    if (availableVersions.length > 0) {
      console.log(`[VideoGeneration] Available versions: ${availableVersions.join(", ")}`);
    }
    console.log(`[VideoGeneration] Using version: ${resolvedVersion || "none"}`);

    if (!resolvedVersion) {
      throw new Error(
        `Unable to resolve Replicate model version for ${modelOwnerName}. Verify model access or update configuration.`
      );
    }

    const predictionPayload: Record<string, unknown> = {
      version: resolvedVersion,
      input,
    };

    // Only add webhook if we have a valid HTTPS URL
    const baseUrl = process.env.APP_BASE_URL?.trim();
    if (baseUrl && baseUrl.startsWith("https://")) {
      const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
      predictionPayload.webhook = `${normalizedBaseUrl}/api/webhook/replicate`;
      predictionPayload.webhook_events_filter = ["completed"];
      console.log(`[VideoGeneration] Webhook configured: ${predictionPayload.webhook}`);
    } else {
      console.warn(
        `[VideoGeneration] APP_BASE_URL (${baseUrl || "not set"}) is not a valid HTTPS URL. Skipping webhook registration.`
      );
    }

    console.log(`[VideoGeneration] Creating prediction with payload:`, {
      ...predictionPayload,
      input: {
        ...predictionPayload.input,
        image: (predictionPayload.input as any)?.image ? "[present]" : "[absent]",
      },
    });

    const prediction = await replicate.predictions.create(predictionPayload as any);

    console.log(`[VideoGeneration] Prediction created:`, prediction.id, `Status:`, prediction.status);
    return { replicateRunId: prediction.id };
  } catch (error) {
    console.error("Error starting video generation:", error);
    throw new Error(
      `Failed to start video generation: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

