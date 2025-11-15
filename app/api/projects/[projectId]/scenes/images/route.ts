import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { createClient } from "@/lib/supabaseClient";
import { generateSceneImage } from "@/lib/replicateClient";
import type { Scene } from "@/types/domain";

/**
 * Generates images for all scenes in a project
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
      .select("scenes")
      .eq("id", projectId)
      .eq("session_token", sessionToken)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    const scenes = (project.scenes as Scene[]) ?? [];

    if (scenes.length === 0) {
      return NextResponse.json(
        { error: "No scenes found for this project" },
        { status: 400 }
      );
    }

    // Generate images for each scene
    const updatedScenes: Scene[] = [];

    for (const scene of scenes) {
      try {
        // Skip if image already exists
        if (scene.imageUrl) {
          updatedScenes.push(scene);
          continue;
        }

        // Generate and upload image
        const imageUrl = await generateSceneImage(scene.blurb, scene.id);
        updatedScenes.push({
          ...scene,
          imageUrl,
        });
      } catch (error) {
        console.error(`Error generating image for scene ${scene.id}:`, error);
        // Continue with other scenes even if one fails
        updatedScenes.push(scene);
      }
    }

    // Save updated scenes to database
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        scenes: updatedScenes,
      })
      .eq("id", projectId);

    if (updateError) {
      console.error("Error saving scene images:", updateError);
      return NextResponse.json(
        { error: "Failed to save scene images" },
        { status: 500 }
      );
    }

    return NextResponse.json({ scenes: updatedScenes });
  } catch (error) {
    console.error("Error in POST /api/projects/[projectId]/scenes/images:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

