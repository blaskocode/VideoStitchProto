"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StartOverButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleStartOver = async () => {
    if (!confirm("Are you sure you want to start a new video? This will delete the current project.")) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch("/api/projects/start", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete project");
      }

      // Navigate to create page which will show the form
      router.push("/create");
      router.refresh();
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to start over. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleStartOver}
      disabled={isDeleting}
      style={{
        padding: "0.75rem 1.5rem",
        backgroundColor: "transparent",
        color: "#0070f3",
        borderRadius: "0.25rem",
        fontSize: "1rem",
        border: "1px solid #0070f3",
        fontWeight: "500",
        cursor: isDeleting ? "not-allowed" : "pointer",
        opacity: isDeleting ? 0.6 : 1,
      }}
    >
      {isDeleting ? "Starting over..." : "Create Another Video"}
    </button>
  );
}

