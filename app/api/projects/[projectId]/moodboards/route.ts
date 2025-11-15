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

    // TEST MODE: Return mock moodboards immediately for testing
    // In development, use mock data to skip slow image generation
    const useMockData = process.env.NODE_ENV === "development";
    
    if (useMockData) {
      console.log("🧪 TEST MODE: Using mock moodboards");
      
      // Helper function to create data URI placeholders
      const createPlaceholder = (color: string, text: string) => {
        // Create a simple SVG as data URI
        // Escape the text for XML
        const escapedText = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
        const svg = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="300" fill="${color}"/>
          <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle" dominant-baseline="middle">${escapedText}</text>
        </svg>`;
        return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
      };
      
      const mockMoodboards: Moodboard[] = [
        {
          id: "mock-1",
          images: [
            { id: "img-1", url: createPlaceholder("#FF6B6B", "Moodboard 1 Image 1") },
            { id: "img-2", url: createPlaceholder("#4ECDC4", "Moodboard 1 Image 2") },
            { id: "img-3", url: createPlaceholder("#45B7D1", "Moodboard 1 Image 3") },
            { id: "img-4", url: createPlaceholder("#FFA07A", "Moodboard 1 Image 4") },
          ],
        },
        {
          id: "mock-2",
          images: [
            { id: "img-5", url: createPlaceholder("#98D8C8", "Moodboard 2 Image 1") },
            { id: "img-6", url: createPlaceholder("#F7DC6F", "Moodboard 2 Image 2") },
            { id: "img-7", url: createPlaceholder("#BB8FCE", "Moodboard 2 Image 3") },
            { id: "img-8", url: createPlaceholder("#85C1E2", "Moodboard 2 Image 4") },
          ],
        },
        {
          id: "mock-3",
          images: [
            { id: "img-9", url: createPlaceholder("#F1948A", "Moodboard 3 Image 1") },
            { id: "img-10", url: createPlaceholder("#52BE80", "Moodboard 3 Image 2") },
            { id: "img-11", url: createPlaceholder("#5DADE2", "Moodboard 3 Image 3") },
            { id: "img-12", url: createPlaceholder("#F4D03F", "Moodboard 3 Image 4") },
          ],
        },
        {
          id: "mock-4",
          images: [
            { id: "img-13", url: createPlaceholder("#EC7063", "Moodboard 4 Image 1") },
            { id: "img-14", url: createPlaceholder("#58D68D", "Moodboard 4 Image 2") },
            { id: "img-15", url: createPlaceholder("#5499C7", "Moodboard 4 Image 3") },
            { id: "img-16", url: createPlaceholder("#F7DC6F", "Moodboard 4 Image 4") },
          ],
        },
        {
          id: "mock-5",
          images: [
            { id: "img-17", url: createPlaceholder("#E74C3C", "Moodboard 5 Image 1") },
            { id: "img-18", url: createPlaceholder("#27AE60", "Moodboard 5 Image 2") },
            { id: "img-19", url: createPlaceholder("#3498DB", "Moodboard 5 Image 3") },
            { id: "img-20", url: createPlaceholder("#F39C12", "Moodboard 5 Image 4") },
          ],
        },
        {
          id: "mock-6",
          images: [
            { id: "img-21", url: createPlaceholder("#C0392B", "Moodboard 6 Image 1") },
            { id: "img-22", url: createPlaceholder("#229954", "Moodboard 6 Image 2") },
            { id: "img-23", url: createPlaceholder("#2980B9", "Moodboard 6 Image 3") },
            { id: "img-24", url: createPlaceholder("#E67E22", "Moodboard 6 Image 4") },
          ],
        },
      ];

      // Save mock moodboards to project
      const { error: updateError } = await supabase
        .from("projects")
        .update({
          moodboards: mockMoodboards,
        })
        .eq("id", projectId);

      if (updateError) {
        console.error("Error saving mock moodboards:", updateError);
        return NextResponse.json(
          { error: "Failed to save moodboards" },
          { status: 500 }
        );
      }

      return NextResponse.json({ moodboards: mockMoodboards });
    }

    // PRODUCTION MODE: Generate real moodboards
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

