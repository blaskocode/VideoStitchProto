import { getSessionToken } from "@/lib/session";
import { createClient } from "@/lib/supabaseClient";
import { redirect } from "next/navigation";

/**
 * Debug dashboard for viewing project details, jobs, costs, and performance metrics
 */
export default async function DebugPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const sessionToken = await getSessionToken();

  if (!sessionToken) {
    redirect("/");
  }

  const supabase = createClient();

  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("session_token", sessionToken)
    .single();

  if (projectError || !project) {
    return (
      <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
        <h1>Project not found</h1>
        <p>Project ID: {projectId}</p>
      </div>
    );
  }

  // Fetch all jobs for this project
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  const formatDuration = (ms: number | null | undefined): string => {
    if (!ms) return "N/A";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const formatCost = (cost: number | null | undefined): string => {
    if (cost === null || cost === undefined) return "N/A";
    return `$${cost.toFixed(4)}`;
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "2rem" }}>
        Debug Dashboard
      </h1>

      <div style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
          Project Summary
        </h2>
        <div
          style={{
            backgroundColor: "#f5f5f5",
            padding: "1.5rem",
            borderRadius: "0.5rem",
            fontFamily: "monospace",
            fontSize: "0.875rem",
          }}
        >
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>ID:</strong> {project.id}
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>Status:</strong> {project.status}
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>Total Cost:</strong> {formatCost(project.total_cost)}
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>Total Generation Time:</strong>{" "}
            {formatDuration(project.total_generation_ms)}
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>Created:</strong>{" "}
            {new Date(project.created_at).toLocaleString()}
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>Updated:</strong>{" "}
            {new Date(project.updated_at).toLocaleString()}
          </div>
          {project.final_video_url && (
            <div style={{ marginTop: "1rem" }}>
              <strong>Final Video:</strong>{" "}
              <a
                href={project.final_video_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#0070f3" }}
              >
                {project.final_video_url}
              </a>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Jobs</h2>
        {jobsError ? (
          <p style={{ color: "#d32f2f" }}>Error loading jobs: {jobsError.message}</p>
        ) : jobs && jobs.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                backgroundColor: "white",
                borderRadius: "0.5rem",
                overflow: "hidden",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f5f5f5" }}>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "1px solid #e0e0e0" }}>
                    Type
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "1px solid #e0e0e0" }}>
                    Status
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "1px solid #e0e0e0" }}>
                    Duration
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "1px solid #e0e0e0" }}>
                    Cost
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "1px solid #e0e0e0" }}>
                    Created
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "1px solid #e0e0e0" }}>
                    Error
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job: any) => (
                  <tr key={job.id} style={{ borderBottom: "1px solid #e0e0e0" }}>
                    <td style={{ padding: "0.75rem" }}>{job.type}</td>
                    <td style={{ padding: "0.75rem" }}>
                      <span
                        style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "0.25rem",
                          fontSize: "0.875rem",
                          backgroundColor:
                            job.status === "success"
                              ? "#d4edda"
                              : job.status === "error"
                                ? "#f8d7da"
                                : job.status === "running"
                                  ? "#d1ecf1"
                                  : "#fff3cd",
                          color:
                            job.status === "success"
                              ? "#155724"
                              : job.status === "error"
                                ? "#721c24"
                                : job.status === "running"
                                  ? "#0c5460"
                                  : "#856404",
                        }}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      {formatDuration(job.duration_ms)}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      {formatCost(job.cost)}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#d32f2f" }}>
                      {job.error_message || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: "#666" }}>No jobs found for this project.</p>
        )}
      </div>

      <div style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
          Project JSON
        </h2>
        <pre
          style={{
            backgroundColor: "#f5f5f5",
            padding: "1.5rem",
            borderRadius: "0.5rem",
            overflow: "auto",
            fontSize: "0.875rem",
            maxHeight: "600px",
          }}
        >
          {JSON.stringify(project, null, 2)}
        </pre>
      </div>

      <div>
        <a
          href="/create"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            backgroundColor: "#0070f3",
            color: "white",
            textDecoration: "none",
            borderRadius: "0.25rem",
            fontSize: "1rem",
          }}
        >
          Back to Create
        </a>
      </div>
    </div>
  );
}

