import OpenAI from "openai";
import { buildStorylinePrompt } from "@/prompts/storylinePrompt";
import { buildScenePrompt } from "@/prompts/scenePrompt";
import { v4 as uuidv4 } from "uuid";
import type { Moodboard, Scene } from "@/types/domain";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface StorylineOption {
  title: string;
  overview: string;
  scenes: string[];
}

/**
 * Generates 3 storyline options based on product prompt, mood, and liked moodboards.
 *
 * @param productPrompt - The product description
 * @param moodPrompt - The mood description (optional)
 * @param likedMoodboards - Array of liked moodboard IDs (optional)
 * @returns Array of 3 storyline options
 */
export async function generateStorylines({
  productPrompt,
  moodPrompt,
  likedMoodboards = [],
}: {
  productPrompt: string;
  moodPrompt?: string;
  likedMoodboards?: string[];
}): Promise<StorylineOption[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const prompt = buildStorylinePrompt({
    productPrompt,
    moodPrompt,
    likedMoodboards,
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using mini for cost efficiency in MVP
      messages: [
        {
          role: "system",
          content:
            "You are an expert ad creative director. Generate creative, engaging ad concepts in the exact format requested.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Parse the response into 3 storyline options
    return parseStorylines(content);
  } catch (error) {
    console.error("Error generating storylines:", error);
    throw new Error(
      `Failed to generate storylines: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Parses the LLM response into structured storyline options.
 * Expected format: Each storyline separated by clear markers, with Title, Overview, and Scenes.
 */
function parseStorylines(content: string): StorylineOption[] {
  const storylines: StorylineOption[] = [];
  const sections = content.split(/\n\n+/);

  let currentStoryline: Partial<StorylineOption> | null = null;

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    // Check if this is a new storyline (starts with "Storyline", "Option", or number)
    if (/^(Storyline|Option|\d+)[:\.]/.test(trimmed)) {
      // Save previous storyline if exists
      if (currentStoryline && currentStoryline.title) {
        storylines.push(currentStoryline as StorylineOption);
      }

      // Start new storyline
      const titleMatch = trimmed.match(/^(?:Storyline|Option|\d+)[:\.]\s*(.+?)(?:\n|$)/);
      currentStoryline = {
        title: titleMatch ? titleMatch[1].trim() : trimmed.split("\n")[0],
        overview: "",
        scenes: [],
      };
    } else if (currentStoryline) {
      // Check if this is the overview (usually 2-3 sentences)
      if (!currentStoryline.overview && trimmed.length < 300) {
        currentStoryline.overview = trimmed;
      } else {
        // Extract scenes (bullet points or numbered list)
        const sceneMatches = trimmed.match(/[-•*]\s*(.+)|(\d+)[:\.]\s*(.+)/g);
        if (sceneMatches) {
          currentStoryline.scenes = sceneMatches.map((match) =>
            match.replace(/^[-•*\d:\.]\s*/, "").trim()
          );
        }
      }
    }
  }

  // Save last storyline
  if (currentStoryline && currentStoryline.title) {
    storylines.push(currentStoryline as StorylineOption);
  }

  // Ensure we have exactly 3 storylines
  while (storylines.length < 3) {
    storylines.push({
      title: `Storyline ${storylines.length + 1}`,
      overview: "A creative ad concept for your product.",
      scenes: ["Scene 1", "Scene 2", "Scene 3"],
    });
  }

  return storylines.slice(0, 3);
}

/**
 * Generates detailed scene blurbs from a selected storyline.
 *
 * @param storylineText - The selected storyline text
 * @param productPrompt - The product description
 * @param moodPrompt - The mood description (optional)
 * @returns Array of Scene objects with id, title, and blurb (text-only for now)
 */
export async function generateScenesForStoryline({
  storylineText,
  productPrompt,
  moodPrompt,
}: {
  storylineText: string;
  productPrompt: string;
  moodPrompt?: string;
}): Promise<Scene[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const prompt = buildScenePrompt({
    storylineText,
    productPrompt,
    moodPrompt,
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using mini for cost efficiency in MVP
      messages: [
        {
          role: "system",
          content:
            "You are an expert video director and cinematographer. Generate detailed scene descriptions in the exact JSON format requested.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Parse JSON response
    const parsed = JSON.parse(content);
    const scenesData = parsed.scenes || [];

    // Convert to Scene objects with IDs
    const scenes: Scene[] = scenesData.map((sceneData: any, index: number) => ({
      id: uuidv4(),
      title: sceneData.title || `Scene ${index + 1}`,
      blurb: sceneData.blurb || "",
    }));

    // Ensure we have 3-5 scenes
    if (scenes.length < 3) {
      // Add placeholder scenes if needed
      while (scenes.length < 3) {
        scenes.push({
          id: uuidv4(),
          title: `Scene ${scenes.length + 1}`,
          blurb: "A scene from the commercial.",
        });
      }
    }

    return scenes.slice(0, 5); // Max 5 scenes
  } catch (error) {
    console.error("Error generating scenes:", error);
    throw new Error(
      `Failed to generate scenes: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

