import Replicate from "replicate";

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
 *
 * @param blurb - Scene description
 * @returns Image URL
 */
export async function generateSceneImage(blurb: string): Promise<string> {
  const enhancedPrompt = `${blurb}, Cinematic, realistic commercial, 35mm lens, soft depth of field, professional lighting, high production value, 16:9 frame`;

  const urls = await generateMoodboardImages(enhancedPrompt, 1);
  if (urls.length === 0) {
    throw new Error("No image generated");
  }

  return urls[0];
}

