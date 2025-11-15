"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface MoodboardGenerationProgressProps {
  projectId: string;
}

export function MoodboardGenerationProgress({
  projectId,
}: MoodboardGenerationProgressProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    // Poll for moodboards to be ready
    const checkMoodboards = async () => {
      const maxAttempts = 60; // 2 minutes max (2s * 60)
      let attempts = 0;

      const poll = async () => {
        try {
          const response = await fetch(`/api/projects/${projectId}/status`);
          if (response.ok) {
            const data = await response.json();
            const project = data.project;

            if (project?.moodboards && project.moodboards.length > 0) {
              setIsGenerating(false);
              // Refresh to show moodboard selector
              router.refresh();
              return;
            }
          }
        } catch (error) {
          console.error("Error checking moodboard status:", error);
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); // Check every 2 seconds
        } else {
          setIsGenerating(false);
          // Show error or timeout message
          console.error("Moodboard generation timed out");
        }
      };

      poll();
    };

    checkMoodboards();
  }, [projectId, router]);

  return (
    <div
      style={{
        textAlign: "center",
        padding: "3rem 2rem",
      }}
    >
      <div
        style={{
          fontSize: "3rem",
          marginBottom: "1rem",
          animation: "spin 2s linear infinite",
        }}
      >
        🎨
      </div>
      <h2
        style={{
          fontSize: "1.5rem",
          fontWeight: "600",
          marginBottom: "1rem",
          color: "#333",
        }}
      >
        Generating your moodboards...
      </h2>
      <p
        style={{
          color: "#666",
          marginBottom: "2rem",
          lineHeight: "1.6",
        }}
      >
        We're creating 6-10 unique moodboards based on your vision.
        <br />
        This usually takes 30-60 seconds.
      </p>
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          margin: "0 auto",
          height: "8px",
          backgroundColor: "#e0e0e0",
          borderRadius: "4px",
          overflow: "hidden",
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

