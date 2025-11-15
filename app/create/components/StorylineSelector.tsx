"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { StorylineOption } from "@/lib/llmClient";

interface StorylineSelectorProps {
  projectId: string;
  initialStorylines?: StorylineOption[];
}

export function StorylineSelector({
  projectId,
  initialStorylines = [],
}: StorylineSelectorProps) {
  const router = useRouter();
  const [storylines, setStorylines] = useState<StorylineOption[]>(
    initialStorylines
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(initialStorylines.length === 0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const generateStorylines = useCallback(async () => {
    setIsGenerating(true);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/storylines`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate storylines");
      }

      const data = await response.json();
      setStorylines(data.storylines || []);
    } catch (error) {
      console.error("Error generating storylines:", error);
      alert("Failed to generate storylines. Please try again.");
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  }, [projectId]);

  // Generate storylines if none exist on mount
  useEffect(() => {
    // If no storylines exist and we're not already generating, trigger generation
    // Note: isLoading might be true initially, but we still want to generate
    if (storylines.length === 0 && !isGenerating) {
      generateStorylines();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - we intentionally only check initial state

  const handleSelect = async (index: number) => {
    if (isSaving) return;

    setIsSaving(true);
    setSelectedIndex(index);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/storylines/select`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            selectedStorylineIndex: index,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save selected storyline");
      }

      // Refresh to show next step
      router.refresh();
    } catch (error) {
      console.error("Error saving storyline:", error);
      alert("Failed to save selection. Please try again.");
      setSelectedIndex(null);
    } finally {
      setIsSaving(false);
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
        <p>{isGenerating ? "Generating storyline options..." : "Loading..."}</p>
        <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
          This may take a moment.
        </p>
      </div>
    );
  }

  if (storylines.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <p style={{ marginBottom: "1rem", color: "#666" }}>
          No storylines generated yet.
        </p>
        <button
          onClick={generateStorylines}
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
          {isGenerating ? "Generating..." : "Generate Storylines"}
        </button>
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
        {storylines.map((storyline, index) => {
          const isSelected = selectedIndex === index;

          return (
            <div
              key={index}
              style={{
                border: `2px solid ${isSelected ? "#0070f3" : "#e0e0e0"}`,
                borderRadius: "0.5rem",
                padding: "1.5rem",
                backgroundColor: "white",
                cursor: isSaving ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "bold",
                  marginBottom: "1rem",
                  color: isSelected ? "#0070f3" : "#333",
                }}
              >
                {storyline.title}
              </h3>
              <p
                style={{
                  fontSize: "0.95rem",
                  lineHeight: "1.6",
                  marginBottom: "1rem",
                  color: "#666",
                }}
              >
                {storyline.overview}
              </p>
              <ul
                style={{
                  listStyle: "disc",
                  paddingLeft: "1.5rem",
                  marginBottom: "1rem",
                  color: "#666",
                }}
              >
                {storyline.scenes.map((scene, sceneIndex) => (
                  <li key={sceneIndex} style={{ marginBottom: "0.5rem" }}>
                    {scene}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSelect(index)}
                disabled={isSaving}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  fontSize: "1rem",
                  backgroundColor: isSelected
                    ? "#0070f3"
                    : isSaving
                      ? "#ccc"
                      : "transparent",
                  color: isSelected ? "white" : "#0070f3",
                  border: `1px solid ${isSelected ? "#0070f3" : "#0070f3"}`,
                  borderRadius: "0.5rem",
                  cursor: isSaving ? "not-allowed" : "pointer",
                  fontWeight: "500",
                }}
              >
                {isSaving && selectedIndex === index
                  ? "Saving..."
                  : isSelected
                    ? "Selected"
                    : "Select this storyline"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

