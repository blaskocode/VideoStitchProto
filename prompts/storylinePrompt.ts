/**
 * Builds a prompt for generating storyline options based on product, mood, and style preferences.
 */
export function buildStorylinePrompt({
  productPrompt,
  moodPrompt,
  likedMoodboards = [],
}: {
  productPrompt: string;
  moodPrompt?: string;
  styleNotes?: string;
  likedMoodboards?: string[];
}): string {
  let prompt = `You are an expert ad creative director. Given the following information, propose 3 distinct 15–30 second ad concepts.

PRODUCT: ${productPrompt}`;

  if (moodPrompt) {
    prompt += `\n\nMOOD: ${moodPrompt}`;
  }

  if (likedMoodboards.length > 0) {
    prompt += `\n\nSTYLE NOTES: The user has selected ${likedMoodboards.length} moodboard(s) that reflect their preferred visual style. Use these style preferences to inform the concepts.`;
  }

  prompt += `\n\nFor each of the 3 concepts, provide:
1. A compelling TITLE (one line)
2. A 2-3 sentence OVERVIEW describing the concept
3. A bulleted list of 3-5 SCENES that would appear in the ad

Format each storyline clearly, separated by blank lines. Make each concept distinct and engaging, suitable for a 15-30 second commercial video.`;

  return prompt;
}

