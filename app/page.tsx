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
      }}
    >
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
        AI Video Ad Generator – MVP
      </h1>
      <button
        style={{
          padding: "0.75rem 2rem",
          fontSize: "1.125rem",
          backgroundColor: "#0070f3",
          color: "white",
          border: "none",
          borderRadius: "0.5rem",
          cursor: "pointer",
        }}
      >
        Start creating
      </button>
    </main>
  );
}
