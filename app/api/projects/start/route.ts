import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { createClient } from "@/lib/supabaseClient";

export async function POST(request: NextRequest) {
  try {
    const sessionToken = await getSessionToken();

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Session token not found" },
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

