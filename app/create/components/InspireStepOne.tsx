"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoodboardGenerationProgress } from "./MoodboardGenerationProgress";

const MOOD_OPTIONS = [
  "Exciting",
  "Reflective",
  "Intense",
  "Mysterious",
  "Inspirational",
  "Dreamy",
  "Nostalgic",
];

export function InspireStepOne() {
  const router = useRouter();
  const [productPrompt, setProductPrompt] = useState("");
  const [moodPrompt, setMoodPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productPrompt.trim()) return;

    setIsSubmitting(true);

    try {
      console.log("Submitting project creation...");
      const response = await fetch("/api/projects/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productPrompt: productPrompt.trim(),
          moodPrompt: moodPrompt.trim() || undefined,
        }),
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("API error:", errorData);
        throw new Error(errorData.error || "Failed to create project");
      }

      const data = await response.json();
      console.log("✅ Project created successfully:", data);
      
      // Set project ID and show progress screen
      setProjectId(data.projectId);
      setShowProgress(true);
      
      // Automatically trigger moodboard generation (this is async and will take time)
      console.log("🎨 Triggering moodboard generation...");
      
      // Start moodboard generation in the background
      fetch(`/api/projects/${data.projectId}/moodboards`, {
        method: "POST",
      })
        .then((response) => {
          if (response.ok) {
            console.log("✅ Moodboards generation completed");
            // The progress component will detect moodboards and refresh
          } else {
            console.error("❌ Failed to generate moodboards");
            setShowProgress(false);
            setSuccessMessage("Failed to generate moodboards. Please try again.");
          }
        })
        .catch((error) => {
          console.error("❌ Error triggering moodboard generation:", error);
          setShowProgress(false);
          setSuccessMessage("Error generating moodboards. Please refresh and try again.");
        });
    } catch (error) {
      console.error("Error creating project:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create project. Please try again.";
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show progress screen if moodboards are being generated
  if (showProgress && projectId) {
    return <MoodboardGenerationProgress projectId={projectId} />;
  }

  return (
    <div>
      {successMessage && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1.5rem",
            backgroundColor: "#d4edda",
            border: "1px solid #c3e6cb",
            borderRadius: "0.5rem",
            color: "#155724",
          }}
        >
          {successMessage}
        </div>
      )}
      <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: "2rem" }}>
        <label
          htmlFor="product-prompt"
          style={{
            display: "block",
            fontSize: "1.125rem",
            fontWeight: "600",
            marginBottom: "0.5rem",
          }}
        >
          What are you trying to create?
        </label>
        <textarea
          id="product-prompt"
          value={productPrompt}
          onChange={(e) => setProductPrompt(e.target.value)}
          placeholder='For example: "A TikTok-style ad for new running shoes" or "A cinematic TV commercial for an electric car"'
          required
          rows={4}
          style={{
            width: "100%",
            padding: "0.75rem",
            fontSize: "1rem",
            border: "1px solid #ddd",
            borderRadius: "0.5rem",
            fontFamily: "inherit",
            resize: "vertical",
          }}
        />
        <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}>
          Describe your video idea in detail. The more specific, the better!
        </p>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <label
          htmlFor="mood-prompt"
          style={{
            display: "block",
            fontSize: "1.125rem",
            fontWeight: "600",
            marginBottom: "0.5rem",
          }}
        >
          What mood should the video convey? (Optional)
        </label>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          {MOOD_OPTIONS.map((mood) => (
            <button
              key={mood}
              type="button"
              onClick={() =>
                setMoodPrompt(moodPrompt === mood ? "" : mood)
              }
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                border: `1px solid ${
                  moodPrompt === mood ? "#0070f3" : "#ddd"
                }`,
                borderRadius: "1.5rem",
                backgroundColor: moodPrompt === mood ? "#0070f3" : "white",
                color: moodPrompt === mood ? "white" : "#333",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {mood}
            </button>
          ))}
        </div>
        <input
          id="mood-prompt"
          type="text"
          value={moodPrompt}
          onChange={(e) => setMoodPrompt(e.target.value)}
          placeholder="Or describe the mood in your own words..."
          style={{
            width: "100%",
            padding: "0.75rem",
            fontSize: "1rem",
            border: "1px solid #ddd",
            borderRadius: "0.5rem",
            fontFamily: "inherit",
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!productPrompt.trim() || isSubmitting}
        style={{
          padding: "0.75rem 2rem",
          fontSize: "1.125rem",
          backgroundColor:
            !productPrompt.trim() || isSubmitting ? "#ccc" : "#0070f3",
          color: "white",
          border: "none",
          borderRadius: "0.5rem",
          cursor:
            !productPrompt.trim() || isSubmitting ? "not-allowed" : "pointer",
          fontWeight: "500",
        }}
      >
        {isSubmitting ? "Creating..." : "Next"}
      </button>
    </form>
    </div>
  );
}

