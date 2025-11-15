/**
 * Builds a prompt for generating video from a scene.
 */
export function buildVideoPrompt({
  sceneBlurb,
  productPrompt,
  moodPrompt,
  imageUrl,
}: {
  sceneBlurb: string;
  productPrompt: string;
  moodPrompt?: string;
  imageUrl?: string;
}): string {
  let prompt = `${sceneBlurb}`;

  // Add product context
  prompt += `\n\nProduct: ${productPrompt}`;

  if (moodPrompt) {
    prompt += `\n\nMood: ${moodPrompt}`;
  }

  // Add video-specific instructions
  prompt += `\n\n5 seconds, smooth camera motion, product hero shot, cinematic, ad style, professional commercial video, high production value, 16:9 aspect ratio`;

  return prompt;
}

