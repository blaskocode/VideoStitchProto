"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface VideoCompositionProgressProps {
  projectId: string;
}

export function VideoCompositionProgress({
  projectId,
}: VideoCompositionProgressProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "composing" | "complete" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Auto-trigger composition on mount
    if (status === "idle") {
      triggerComposition();
    }
  }, []);

  const triggerComposition = async () => {
    setStatus("composing");
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/compose`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to start composition");
      }

      const data = await response.json();
      
      if (data.success) {
        setStatus("complete");
        // Refresh to show final video
        setTimeout(() => {
          router.refresh();
        }, 1000);
      } else {
        throw new Error(data.message || "Composition failed");
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  if (status === "idle") {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <p style={{ color: "#666" }}>Preparing to compose video...</p>
      </div>
    );
  }

  if (status === "composing") {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div
          style={{
            marginBottom: "1rem",
            fontSize: "1.125rem",
            color: "#333",
          }}
        >
          🎬 Composing your final video...
        </div>
        <p style={{ color: "#666", marginBottom: "1rem" }}>
          Stitching scenes together and adding music. This may take a minute.
        </p>
        <div
          style={{
            width: "100%",
            height: "8px",
            backgroundColor: "#e0e0e0",
            borderRadius: "4px",
            overflow: "hidden",
            marginTop: "2rem",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "#0070f3",
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    );
  }

  if (status === "complete") {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div
          style={{
            marginBottom: "1rem",
            fontSize: "1.125rem",
            color: "#0070f3",
          }}
        >
          ✅ Video composition complete!
        </div>
        <p style={{ color: "#666" }}>Redirecting to final video...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div
          style={{
            marginBottom: "1rem",
            fontSize: "1.125rem",
            color: "#d32f2f",
          }}
        >
          ❌ Composition failed
        </div>
        <p style={{ color: "#666", marginBottom: "1rem" }}>{error}</p>
        <button
          onClick={triggerComposition}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "0.25rem",
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return null;
}

