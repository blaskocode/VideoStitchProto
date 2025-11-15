"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Scene } from "@/types/domain";

interface SceneFlowViewerProps {
  projectId: string;
  initialScenes?: Scene[];
}

export function SceneFlowViewer({
  projectId,
  initialScenes = [],
}: SceneFlowViewerProps) {
  const router = useRouter();
  const [scenes, setScenes] = useState<Scene[]>(initialScenes);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(initialScenes.length === 0);
  const [isApproving, setIsApproving] = useState(false);

  const generateScenes = useCallback(async () => {
    setIsGenerating(true);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/scenes`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error("Error generating scenes:", errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (!data.scenes || data.scenes.length === 0) {
        throw new Error("No scenes were generated");
      }
      setScenes(data.scenes || []);
    } catch (error) {
      console.error("Error generating scenes:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate scenes. Please try again.";
      alert(`Failed to generate scenes: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  }, [projectId]);

  // Generate scenes if none exist on mount
  useEffect(() => {
    // If no scenes exist and we're not already generating, trigger generation
    // Note: isLoading might be true initially, but we still want to generate
    if (scenes.length === 0 && !isGenerating) {
      generateScenes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - we intentionally only check initial state

  const handleApprove = async () => {
    setIsApproving(true);

    try {
      // Generate images for all scenes
      const imageResponse = await fetch(
        `/api/projects/${projectId}/scenes/images`,
        {
          method: "POST",
        }
      );

      if (!imageResponse.ok) {
        throw new Error("Failed to generate scene images");
      }

      // Refresh to show visual storyboard
      router.refresh();
    } catch (error) {
      console.error("Error generating scene images:", error);
      alert("Failed to generate scene images. Please try again.");
    } finally {
      setIsApproving(false);
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
        <p>
          {isGenerating
            ? "Generating detailed scenes..."
            : "Loading scenes..."}
        </p>
        <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
          This may take a moment.
        </p>
      </div>
    );
  }

  if (scenes.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <p style={{ marginBottom: "1rem", color: "#666" }}>
          No scenes generated yet.
        </p>
        <button
          onClick={generateScenes}
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
          {isGenerating ? "Generating..." : "Generate Scenes"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        {scenes.map((scene, index) => (
          <div
            key={scene.id}
            style={{
              border: "1px solid #e0e0e0",
              borderRadius: "0.5rem",
              padding: "1.5rem",
              backgroundColor: "white",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#0070f3",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  marginRight: "1rem",
                }}
              >
                {index + 1}
              </div>
              <h3
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "600",
                  color: "#333",
                }}
              >
                {scene.title || `Scene ${index + 1}`}
              </h3>
            </div>
            <p
              style={{
                fontSize: "0.95rem",
                lineHeight: "1.6",
                color: "#666",
                whiteSpace: "pre-line",
              }}
            >
              {scene.blurb}
            </p>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <button
          onClick={handleApprove}
          disabled={isApproving}
          style={{
            padding: "0.75rem 2rem",
            fontSize: "1.125rem",
            backgroundColor: isApproving ? "#a0c8f9" : "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            cursor: isApproving ? "not-allowed" : "pointer",
            fontWeight: "500",
          }}
        >
          {isApproving
            ? "Generating images..."
            : "Looks good → Continue to visual generation"}
        </button>
      </div>
    </div>
  );
}

