import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { createClient } from "@/lib/supabaseClient";

export async function POST(request: NextRequest) {
  try {
    // Try to get session token from cookies (set by proxy/middleware)
    const sessionToken = await getSessionToken();

    if (!sessionToken) {
      console.error("Session token not found in API route");
      return NextResponse.json(
        { error: "Session token not found. Please refresh the page and try again." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productPrompt, moodPrompt } = body;

    if (!productPrompt || typeof productPrompt !== "string") {
      return NextResponse.json(
        { error: "productPrompt is required" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from("projects")
      .insert({
        session_token: sessionToken,
        product_prompt: productPrompt.trim(),
        mood_prompt: moodPrompt?.trim() || null,
        status: "inspire",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating project:", error);
      return NextResponse.json(
        { error: "Failed to create project" },
        { status: 500 }
      );
    }

    return NextResponse.json({ projectId: data.id });
  } catch (error) {
    console.error("Error in POST /api/projects/start:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = await getSessionToken();

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Session token not found" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { projectId } = body;

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Delete the project (cascading deletes will handle jobs)
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("session_token", sessionToken);

    if (error) {
      console.error("Error deleting project:", error);
      return NextResponse.json(
        { error: "Failed to delete project" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/projects/start:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

