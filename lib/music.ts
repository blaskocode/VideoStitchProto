/**
 * Static music options for MVP
 * Maps mood tags to music tracks
 */

export interface MusicTrack {
  id: string;
  name: string;
  url: string;
  moodTag: string;
}

// Static music tracks mapped to moods
// For MVP, using placeholder URLs - in production these would be actual music files
const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: "upbeat-1",
    name: "Energetic Upbeat",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", // Placeholder - replace with actual track
    moodTag: "upbeat",
  },
  {
    id: "ambient-1",
    name: "Calm Ambient",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", // Placeholder - replace with actual track
    moodTag: "ambient",
  },
  {
    id: "dramatic-1",
    name: "Dramatic Cinematic",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", // Placeholder - replace with actual track
    moodTag: "dramatic",
  },
];

/**
 * Maps mood prompt to mood tags
 */
function mapMoodToTag(moodPrompt?: string): string {
  if (!moodPrompt) return "ambient";

  const lowerMood = moodPrompt.toLowerCase();

  if (
    lowerMood.includes("exciting") ||
    lowerMood.includes("energetic") ||
    lowerMood.includes("upbeat") ||
    lowerMood.includes("intense")
  ) {
    return "upbeat";
  }

  if (
    lowerMood.includes("dramatic") ||
    lowerMood.includes("intense") ||
    lowerMood.includes("mysterious")
  ) {
    return "dramatic";
  }

  // Default to ambient for reflective, dreamy, nostalgic, inspirational
  return "ambient";
}

/**
 * Gets music options based on project mood
 */
export function getMusicOptions(moodPrompt?: string): MusicTrack[] {
  const moodTag = mapMoodToTag(moodPrompt);

  // Return tracks that match the mood, or all tracks if no specific match
  const matchingTracks = MUSIC_TRACKS.filter(
    (track) => track.moodTag === moodTag
  );

  // If we have matching tracks, return them (up to 3)
  // Otherwise return all tracks
  return matchingTracks.length > 0
    ? matchingTracks.slice(0, 3)
    : MUSIC_TRACKS.slice(0, 3);
}

/**
 * Gets a music track by ID
 */
export function getMusicTrackById(trackId: string): MusicTrack | undefined {
  return MUSIC_TRACKS.find((track) => track.id === trackId);
}


