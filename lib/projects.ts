import { createClient } from "@/lib/supabaseClient";
import type { Project } from "@/types/domain";

/**
 * Fetches the latest active (in-progress) project for a given session token.
 * Returns null if no active project exists.
 *
 * @param sessionToken - The session token to look up
 * @returns The active project or null
 */
export async function getActiveProject(
  sessionToken: string
): Promise<Project | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("session_token", sessionToken)
    .neq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // If no rows found, return null (not an error)
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch active project: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  // Map database fields to domain types
  return {
    id: data.id,
    sessionToken: data.session_token,
    productPrompt: data.product_prompt,
    moodPrompt: data.mood_prompt ?? undefined,
    moodboards: data.moodboards ?? undefined,
    likedMoodboards: data.liked_moodboards as string[] | undefined,
    storylineOption: data.storyline_option ?? undefined,
    scenes: data.scenes as Project["scenes"],
    status: data.status as Project["status"],
    finalVideoUrl: data.final_video_url ?? undefined,
    musicTrackId: data.music_track_id ?? undefined,
    totalCost: data.total_cost ? Number(data.total_cost) : undefined,
    totalGenerationMs: data.total_generation_ms
      ? Number(data.total_generation_ms)
      : undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

