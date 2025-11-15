/**
 * Builds a prompt for generating detailed scene blurbs from a selected storyline.
 */
export function buildScenePrompt({
  storylineText,
  productPrompt,
  moodPrompt,
}: {
  storylineText: string;
  productPrompt: string;
  moodPrompt?: string;
}): string {
  let prompt = `You are an expert video director and cinematographer. Given the following storyline, break it down into 3-5 distinct scenes for a 15-30 second commercial video.

STORYLINE:
${storylineText}

PRODUCT: ${productPrompt}`;

  if (moodPrompt) {
    prompt += `\n\nMOOD: ${moodPrompt}`;
  }

  prompt += `\n\nFor each scene, provide:
1. **Setting**: Where the scene takes place (e.g., "Urban street at sunset", "Modern kitchen", "Mountain trail")
2. **Action**: What happens in the scene (e.g., "Person running", "Product being used", "Close-up of hands")
3. **Camera Motion**: How the camera moves (e.g., "Slow push-in", "Tracking shot", "Static wide", "Drone overhead")
4. **Emotion**: The feeling or mood conveyed (e.g., "Energetic", "Contemplative", "Triumphant", "Intimate")
5. **Transition**: How it connects to the next scene (e.g., "Cut to", "Fade through", "Whip pan", "Match cut")

Format each scene as a detailed blurb that combines all these elements into a cohesive description. Each scene should be 2-4 sentences that paint a clear visual picture.

Return the scenes in JSON format:
{
  "scenes": [
    {
      "title": "Scene 1: [Brief title]",
      "blurb": "[Detailed 2-4 sentence description combining setting, action, camera motion, emotion, and transition]"
    },
    ...
  ]
}`;

  return prompt;
}

