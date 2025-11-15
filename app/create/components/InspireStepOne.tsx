"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productPrompt.trim()) return;

    setIsSubmitting(true);

    try {
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

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      const data = await response.json();
      // Refresh to show updated project status
      router.refresh();
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
  );
}

