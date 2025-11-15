"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Scene } from "@/types/domain";

interface VisualStoryboardProps {
  projectId: string;
  initialScenes?: Scene[];
}

export function VisualStoryboard({
  projectId,
  initialScenes = [],
}: VisualStoryboardProps) {
  const router = useRouter();
  const [scenes, setScenes] = useState<Scene[]>(initialScenes);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(
    initialScenes.length === 0 || !initialScenes.some((s) => s.imageUrl)
  );
  const [isApproving, setIsApproving] = useState(false);

  const generateImages = useCallback(async () => {
    setIsGenerating(true);
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/scenes/images`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error("Error generating scene images:", errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (!data.scenes || data.scenes.length === 0) {
        throw new Error("No scenes were returned");
      }
      setScenes(data.scenes || []);
    } catch (error) {
      console.error("Error generating scene images:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate scene images. Please try again.";
      alert(`Failed to generate scene images: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  }, [projectId]);

  // Generate images if scenes don't have images yet
  useEffect(() => {
    const hasImages = scenes.some((scene) => scene.imageUrl);
    // If scenes exist but no images, trigger generation
    // Note: isLoading might be true initially, but we still want to generate
    if (scenes.length > 0 && !hasImages && !isGenerating) {
      generateImages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - we intentionally only check initial state

  const handleApprove = async () => {
    setIsApproving(true);
    console.log(`[VisualStoryboard] Starting video generation for project ${projectId}`);

    try {
      // Start video generation for all scenes
      console.log(`[VisualStoryboard] Calling /api/projects/${projectId}/videos/start`);
      const response = await fetch(
        `/api/projects/${projectId}/videos/start`,
        {
          method: "POST",
        }
      );

      console.log(`[VisualStoryboard] Response status:`, response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error(`[VisualStoryboard] Error response:`, errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log(`[VisualStoryboard] Video generation started:`, data);

      // Refresh to show progress
      router.refresh();
    } catch (error) {
      console.error("[VisualStoryboard] Error starting video generation:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to start video generation. Please try again.";
      alert(`Failed to start video generation: ${errorMessage}`);
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
            ? "Generating scene images..."
            : "Loading storyboard..."}
        </p>
        <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
          This may take a few minutes.
        </p>
      </div>
    );
  }

  if (scenes.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <p style={{ marginBottom: "1rem", color: "#666" }}>
          No scenes found.
        </p>
      </div>
    );
  }

  const allScenesHaveImages = scenes.every((scene) => scene.imageUrl);

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
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
              display: "flex",
              gap: "1.5rem",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                flex: "0 0 200px",
                aspectRatio: "16/9",
                backgroundColor: "#f0f0f0",
                borderRadius: "0.5rem",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {scene.imageUrl ? (
                <img
                  src={scene.imageUrl}
                  alt={scene.title || `Scene ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    color: "#999",
                    fontSize: "0.875rem",
                    textAlign: "center",
                    padding: "1rem",
                  }}
                >
                  Image generating...
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
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
          </div>
        ))}
      </div>
      {!allScenesHaveImages && (
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <button
            onClick={generateImages}
            disabled={isGenerating}
            style={{
              padding: "0.75rem 2rem",
              fontSize: "1rem",
              backgroundColor: isGenerating ? "#a0c8f9" : "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: isGenerating ? "not-allowed" : "pointer",
            }}
          >
            {isGenerating ? "Generating..." : "Generate Images"}
          </button>
        </div>
      )}
      {allScenesHaveImages && (
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
              ? "Processing..."
              : "Looks good → Generate my video"}
          </button>
        </div>
      )}
    </div>
  );
}

