import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { createClient } from "@/lib/supabaseClient";
import { generateMoodboardImages } from "@/lib/replicateClient";
import { uploadImageFromUrl } from "@/lib/storage";
import { v4 as uuidv4 } from "uuid";
import type { Moodboard } from "@/types/domain";

/**
 * Generates moodboards for a project
 */
export async function POST(
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

    // Fetch project and validate session
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("session_token", sessionToken)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Build 6-10 varied prompts based on product and mood
    const basePrompt = `${project.product_prompt}${project.mood_prompt ? `, ${project.mood_prompt} mood` : ""}`;
    const variations = [
      `${basePrompt}, dynamic angle, vibrant colors`,
      `${basePrompt}, close-up detail, dramatic lighting`,
      `${basePrompt}, wide shot, atmospheric`,
      `${basePrompt}, product focus, clean composition`,
      `${basePrompt}, lifestyle context, natural lighting`,
      `${basePrompt}, abstract interpretation, artistic`,
      `${basePrompt}, urban setting, modern aesthetic`,
      `${basePrompt}, minimalist style, elegant`,
      `${basePrompt}, action-oriented, energetic`,
      `${basePrompt}, contemplative mood, soft tones`,
    ].slice(0, 8); // Generate 8 moodboards

    const moodboards: Moodboard[] = [];

    // Generate 4 images per moodboard
    for (const prompt of variations) {
      try {
        const imageUrls = await generateMoodboardImages(prompt, 4);
        const moodboardId = uuidv4();

        // Upload images to Supabase Storage
        const uploadedImages = await Promise.all(
          imageUrls.map(async (url, index) => {
            const imageId = uuidv4();
            const path = `moodboards/${moodboardId}/${imageId}.jpg`;
            const publicUrl = await uploadImageFromUrl(
              url,
              "moodboards",
              path
            );
            return {
              id: imageId,
              url: publicUrl,
            };
          })
        );

        moodboards.push({
          id: moodboardId,
          images: uploadedImages,
        });
      } catch (error) {
        console.error(`Error generating moodboard for prompt "${prompt}":`, error);
        // Continue with other moodboards even if one fails
      }
    }

    // Save moodboards to project
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        moodboards: moodboards,
      })
      .eq("id", projectId);

    if (updateError) {
      console.error("Error saving moodboards:", updateError);
      return NextResponse.json(
        { error: "Failed to save moodboards" },
        { status: 500 }
      );
    }

    return NextResponse.json({ moodboards });
  } catch (error) {
    console.error("Error in POST /api/projects/[projectId]/moodboards:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

