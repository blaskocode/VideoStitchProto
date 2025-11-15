"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { MusicTrack } from "@/lib/music";

interface MusicSelectorProps {
  projectId: string;
}

export function MusicSelector({ projectId }: MusicSelectorProps) {
  const router = useRouter();
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    fetchMusicOptions();
  }, []);

  const fetchMusicOptions = async () => {
    try {
      const response = await fetch(`/api/music/options?projectId=${projectId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch music options");
      }

      const data = await response.json();
      setTracks(data.tracks || []);
    } catch (error) {
      console.error("Error fetching music options:", error);
      alert("Failed to load music options. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = (trackId: string) => {
    // Stop all other tracks
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio && !audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    });

    // Play selected track
    const audio = audioRefs.current[trackId];
    if (audio) {
      if (playingTrackId === trackId) {
        // If already playing, pause it
        audio.pause();
        setPlayingTrackId(null);
      } else {
        // Play the track
        audio.play();
        setPlayingTrackId(trackId);
      }
    }
  };

  const handleSelect = async (trackId: string) => {
    if (isSaving) return;

    setIsSaving(true);
    setSelectedTrackId(trackId);

    try {
      const response = await fetch(`/api/projects/${projectId}/music/select`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          musicTrackId: trackId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save music selection");
      }

      // Refresh to show next step
      router.refresh();
    } catch (error) {
      console.error("Error saving music selection:", error);
      alert("Failed to save selection. Please try again.");
      setSelectedTrackId(null);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "3rem",
          color: "#666",
        }}
      >
        <p>Loading music options...</p>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <p style={{ color: "#666" }}>No music options available.</p>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        {tracks.map((track) => {
          const isSelected = selectedTrackId === track.id;
          const isPlaying = playingTrackId === track.id;

          return (
            <div
              key={track.id}
              style={{
                border: `2px solid ${isSelected ? "#0070f3" : "#e0e0e0"}`,
                borderRadius: "0.5rem",
                padding: "1.5rem",
                backgroundColor: "white",
              }}
            >
              <h3
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                  color: isSelected ? "#0070f3" : "#333",
                }}
              >
                {track.name}
              </h3>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#666",
                  marginBottom: "1rem",
                  textTransform: "capitalize",
                }}
              >
                {track.moodTag} mood
              </p>

              {/* Hidden audio element */}
              <audio
                ref={(el) => {
                  if (el) audioRefs.current[track.id] = el;
                }}
                src={track.url}
                onEnded={() => setPlayingTrackId(null)}
              />

              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginTop: "1rem",
                }}
              >
                <button
                  onClick={() => handlePlay(track.id)}
                  style={{
                    flex: 1,
                    padding: "0.5rem 1rem",
                    fontSize: "0.875rem",
                    backgroundColor: isPlaying ? "#0070f3" : "transparent",
                    color: isPlaying ? "white" : "#0070f3",
                    border: `1px solid ${isPlaying ? "#0070f3" : "#0070f3"}`,
                    borderRadius: "0.25rem",
                    cursor: "pointer",
                  }}
                >
                  {isPlaying ? "⏸ Pause" : "▶ Play"}
                </button>
                <button
                  onClick={() => handleSelect(track.id)}
                  disabled={isSaving}
                  style={{
                    flex: 1,
                    padding: "0.5rem 1rem",
                    fontSize: "0.875rem",
                    backgroundColor: isSelected
                      ? "#0070f3"
                      : isSaving
                        ? "#ccc"
                        : "transparent",
                    color: isSelected ? "white" : "#0070f3",
                    border: `1px solid ${isSelected ? "#0070f3" : "#0070f3"}`,
                    borderRadius: "0.25rem",
                    cursor: isSaving ? "not-allowed" : "pointer",
                    fontWeight: "500",
                  }}
                >
                  {isSaving && selectedTrackId === track.id
                    ? "Saving..."
                    : isSelected
                      ? "Selected"
                      : "Select this track"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


