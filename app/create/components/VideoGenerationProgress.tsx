"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface VideoGenerationProgressProps {
  projectId: string;
}

interface ProgressData {
  projectId: string;
  status: string;
  progress: {
    total: number;
    completed: number;
    inProgress: number;
    current: number;
  };
  jobs: Array<{
    id: string;
    status: string;
    type: string;
  }>;
}

export function VideoGenerationProgress({
  projectId,
}: VideoGenerationProgressProps) {
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/status`);
        if (!response.ok) {
          throw new Error("Failed to fetch status");
        }

        const data = await response.json();
        setProgress(data);

        // If all videos are complete, refresh to show next step
        if (
          data.progress.completed === data.progress.total &&
          data.progress.total > 0
        ) {
          setTimeout(() => {
            router.refresh();
          }, 2000); // Wait 2 seconds then refresh
        }
      } catch (error) {
        console.error("Error polling status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Poll immediately, then every 5 seconds
    pollStatus();
    const interval = setInterval(pollStatus, 5000);

    return () => clearInterval(interval);
  }, [projectId, router]);

  if (isLoading || !progress) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "3rem",
          color: "#666",
        }}
      >
        <p>Loading progress...</p>
      </div>
    );
  }

  const { total, completed, inProgress, current } = progress.progress;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allComplete = completed === total && total > 0;

  const handleStartOver = async () => {
    if (!confirm("Are you sure you want to start over? This will delete the current project.")) {
      return;
    }

    setIsResetting(true);
    try {
      // Delete the current project by updating session
      const response = await fetch("/api/projects/start", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error("Failed to reset project");
      }

      // Redirect to home to start fresh
      router.push("/");
    } catch (error) {
      console.error("Error resetting project:", error);
      alert("Failed to reset project. Please refresh the page and try again.");
      setIsResetting(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "2rem",
      }}
    >
      <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
        Generating Your Video
      </h2>

      {allComplete ? (
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            backgroundColor: "#f0f9ff",
            borderRadius: "0.5rem",
            border: "1px solid #0070f3",
          }}
        >
          <p style={{ fontSize: "1.125rem", color: "#0070f3", marginBottom: "0.5rem" }}>
            ✅ All scenes complete!
          </p>
          <p style={{ color: "#666" }}>Preparing your final video...</p>
        </div>
      ) : (
        <>
          <div
            style={{
              marginBottom: "2rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.5rem",
              }}
            >
              <span style={{ fontSize: "0.875rem", color: "#666" }}>
                Scene {current} of {total}
              </span>
              <span style={{ fontSize: "0.875rem", color: "#666" }}>
                {percentage}%
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: "8px",
                backgroundColor: "#e0e0e0",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${percentage}%`,
                  height: "100%",
                  backgroundColor: "#0070f3",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>

          <div
            style={{
              textAlign: "center",
              color: "#666",
            }}
          >
            <p style={{ marginBottom: "0.5rem" }}>
              {inProgress > 0
                ? `Generating ${inProgress} scene${inProgress > 1 ? "s" : ""}...`
                : "Preparing generation..."}
            </p>
            <p style={{ fontSize: "0.875rem" }}>
              This may take a few minutes. Please keep this page open.
            </p>
          </div>
        </>
      )}

      <div
        style={{
          marginTop: "2rem",
          textAlign: "center",
        }}
      >
        <button
          onClick={handleStartOver}
          disabled={isResetting}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: isResetting ? "#ccc" : "transparent",
            color: isResetting ? "#666" : "#dc2626",
            border: `1px solid ${isResetting ? "#ccc" : "#dc2626"}`,
            borderRadius: "0.25rem",
            fontSize: "0.875rem",
            cursor: isResetting ? "not-allowed" : "pointer",
            fontWeight: "500",
          }}
        >
          {isResetting ? "Resetting..." : "Start Over"}
        </button>
      </div>
    </div>
  );
}

