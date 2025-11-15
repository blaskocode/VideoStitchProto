import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { createClient } from "@/lib/supabaseClient";
import { generateScenesForStoryline } from "@/lib/llmClient";
import type { Scene } from "@/types/domain";

/**
 * Generates scenes for a project based on the selected storyline
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

    // Check if storyline is selected
    if (!project.storyline_option) {
      return NextResponse.json(
        { error: "No storyline selected for this project" },
        { status: 400 }
      );
    }

    // Generate scenes
    const scenes = await generateScenesForStoryline({
      storylineText: project.storyline_option,
      productPrompt: project.product_prompt,
      moodPrompt: project.mood_prompt ?? undefined,
    });

    // Save scenes to project
    console.log(`[Scenes] Saving ${scenes.length} scenes to project ${projectId}`);
    console.log(`[Scenes] Scenes data:`, JSON.stringify(scenes, null, 2));
    
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        scenes: scenes,
      })
      .eq("id", projectId);

    if (updateError) {
      console.error("[Scenes] Error saving scenes:", updateError);
      return NextResponse.json(
        { error: "Failed to save scenes" },
        { status: 500 }
      );
    }

    // Verify the update worked
    const { data: updatedProject } = await supabase
      .from("projects")
      .select("scenes")
      .eq("id", projectId)
      .single();
    
    console.log(`[Scenes] Verification - saved scenes count:`, (updatedProject?.scenes as any[])?.length || 0);

    return NextResponse.json({ scenes });
  } catch (error) {
    console.error("Error in POST /api/projects/[projectId]/scenes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Gets existing scenes for a project
 */
export async function GET(
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

    return NextResponse.json({
      scenes: (project.scenes as Scene[]) ?? [],
    });
  } catch (error) {
    console.error("Error in GET /api/projects/[projectId]/scenes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

