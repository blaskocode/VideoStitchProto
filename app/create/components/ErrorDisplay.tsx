"use client";

import { useRouter } from "next/navigation";

interface ErrorDisplayProps {
  errorMessage?: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ errorMessage, onRetry }: ErrorDisplayProps) {
  const router = useRouter();

  const handleRestart = () => {
    router.push("/");
  };

  return (
    <div
      style={{
        textAlign: "center",
        padding: "3rem 2rem",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          fontSize: "3rem",
          marginBottom: "1rem",
        }}
      >
        ⚠️
      </div>
      <h2
        style={{
          fontSize: "1.5rem",
          fontWeight: "600",
          marginBottom: "1rem",
          color: "#333",
        }}
      >
        Something went wrong
      </h2>
      {errorMessage && (
        <p
          style={{
            color: "#666",
            marginBottom: "2rem",
            lineHeight: "1.6",
          }}
        >
          {errorMessage}
        </p>
      )}
      <p
        style={{
          color: "#666",
          marginBottom: "2rem",
          lineHeight: "1.6",
        }}
      >
        Don't worry - you can start over and create a new video.
      </p>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "0.25rem",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Try Again
          </button>
        )}
        <button
          onClick={handleRestart}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            backgroundColor: "transparent",
            color: "#0070f3",
            border: "1px solid #0070f3",
            borderRadius: "0.25rem",
            cursor: "pointer",
            fontWeight: "500",
          }}
        >
          Start Over
        </button>
      </div>
    </div>
  );
}

