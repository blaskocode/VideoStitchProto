"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Moodboard } from "@/types/domain";

interface MoodboardSelectorProps {
  projectId: string;
  initialMoodboards?: Moodboard[];
  onLikesChange?: (likedIds: string[]) => void;
  onContinue?: () => void;
}

export function MoodboardSelector({
  projectId,
  initialMoodboards = [],
  onLikesChange,
  onContinue,
}: MoodboardSelectorProps) {
  const router = useRouter();
  const [moodboards, setMoodboards] = useState<Moodboard[]>(initialMoodboards);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(initialMoodboards.length === 0);

  // Generate moodboards if none exist
  useEffect(() => {
    if (moodboards.length === 0 && !isGenerating && !isLoading) {
      generateMoodboards();
    }
  }, []);

  const generateMoodboards = async () => {
    setIsGenerating(true);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/moodboards`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate moodboards");
      }

      const data = await response.json();
      setMoodboards(data.moodboards || []);
    } catch (error) {
      console.error("Error generating moodboards:", error);
      alert("Failed to generate moodboards. Please try again.");
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  };

  const toggleLike = (moodboardId: string) => {
    const newLikedIds = likedIds.includes(moodboardId)
      ? likedIds.filter((id) => id !== moodboardId)
      : [...likedIds, moodboardId];

    setLikedIds(newLikedIds);
    onLikesChange?.(newLikedIds);
  };

  const handleContinue = async () => {
    try {
      // Save liked moodboards
      const response = await fetch(
        `/api/projects/${projectId}/moodboards/like`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            likedMoodboardIds: likedIds,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save liked moodboards");
      }

      // Refresh page to show next step (status will be updated in Phase 2)
      router.refresh();
      onContinue?.();
    } catch (error) {
      console.error("Error saving liked moodboards:", error);
      alert("Failed to save selections. Please try again.");
    }
  };

  if (isLoading || isGenerating) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "3rem",
          color: "#666",
        }}
      >
        <p>{isGenerating ? "Generating moodboards..." : "Loading..."}</p>
        <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
          This may take a minute or two.
        </p>
      </div>
    );
  }

  if (moodboards.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <p style={{ marginBottom: "1rem", color: "#666" }}>
          No moodboards generated yet.
        </p>
        <button
          onClick={generateMoodboards}
          disabled={isGenerating}
          style={{
            padding: "0.75rem 2rem",
            fontSize: "1rem",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            cursor: isGenerating ? "not-allowed" : "pointer",
          }}
        >
          {isGenerating ? "Generating..." : "Generate Moodboards"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        {moodboards.map((moodboard) => {
          const isLiked = likedIds.includes(moodboard.id);

          return (
            <div
              key={moodboard.id}
              style={{
                border: `2px solid ${isLiked ? "#0070f3" : "#e0e0e0"}`,
                borderRadius: "0.5rem",
                padding: "1rem",
                backgroundColor: "white",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                }}
              >
                {moodboard.images.slice(0, 4).map((image) => (
                  <img
                    key={image.id}
                    src={image.url}
                    alt="Moodboard"
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      objectFit: "cover",
                      borderRadius: "0.25rem",
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={() => toggleLike(moodboard.id)}
                  style={{
                    padding: "0.5rem 1rem",
                    fontSize: "0.875rem",
                    backgroundColor: isLiked ? "#0070f3" : "transparent",
                    color: isLiked ? "white" : "#0070f3",
                    border: `1px solid ${isLiked ? "#0070f3" : "#0070f3"}`,
                    borderRadius: "0.25rem",
                    cursor: "pointer",
                  }}
                >
                  ❤️ {isLiked ? "Liked" : "Like"}
                </button>
                <button
                  onClick={() => toggleLike(moodboard.id)}
                  style={{
                    padding: "0.5rem 1rem",
                    fontSize: "0.875rem",
                    backgroundColor: "transparent",
                    color: "#666",
                    border: "1px solid #ddd",
                    borderRadius: "0.25rem",
                    cursor: "pointer",
                  }}
                >
                  Skip
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {moodboards.length > 0 && (
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <button
            onClick={handleContinue}
            style={{
              padding: "0.75rem 2rem",
              fontSize: "1.125rem",
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Continue → Craft the Story
          </button>
        </div>
      )}
    </div>
  );
}

