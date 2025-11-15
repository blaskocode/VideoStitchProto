import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        textAlign: "center",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", marginBottom: "2rem", fontWeight: "bold" }}>
        AI Video Ad Generator – MVP
      </h1>
      <p
        style={{
          fontSize: "1.25rem",
          lineHeight: "1.6",
          marginBottom: "3rem",
          color: "#666",
        }}
      >
        For creators who know the vision, and dreamers still discovering it — we
        turn ideas into beautiful videos in minutes.
      </p>
      <Link
        href="/create"
        style={{
          padding: "0.75rem 2rem",
          fontSize: "1.125rem",
          backgroundColor: "#0070f3",
          color: "white",
          border: "none",
          borderRadius: "0.5rem",
          cursor: "pointer",
          textDecoration: "none",
          display: "inline-block",
          fontWeight: "500",
        }}
      >
        Start creating
      </Link>
    </main>
  );
}
