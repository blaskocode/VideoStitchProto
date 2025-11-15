import { getSessionToken } from "@/lib/session";
import { getActiveProject } from "@/lib/projects";
import { redirect } from "next/navigation";
import { Stepper } from "./components/Stepper";
import { InspireStepOne } from "./components/InspireStepOne";
import { MoodboardSelector } from "./components/MoodboardSelector";

/**
 * Creation flow page - routes users to the correct step based on project status
 */
export default async function CreatePage() {
  const sessionToken = await getSessionToken();

  if (!sessionToken) {
    // Should not happen as layout ensures token exists, but handle gracefully
    redirect("/");
  }

  const activeProject = await getActiveProject(sessionToken);

  // Determine current step for stepper
  const currentStep = activeProject ? activeProject.status : "start";

  // If no active project, show Step 1: What are you trying to create?
  if (!activeProject) {
    return (
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "2rem",
        }}
      >
        <Stepper currentStep={currentStep} />
        <h1 style={{ fontSize: "2rem", marginBottom: "2rem" }}>
          Step 1: What are you trying to create?
        </h1>
        <InspireStepOne />
      </div>
    );
  }

  // If project exists but no moodboards yet, show product/mood prompt
  if (activeProject.status === "inspire" && !activeProject.moodboards) {
    return (
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "2rem",
        }}
      >
        <Stepper currentStep={currentStep} />
        <h1 style={{ fontSize: "2rem", marginBottom: "2rem" }}>
          Step 1: What are you trying to create?
        </h1>
        <InspireStepOne />
      </div>
    );
  }

  // If project has moodboards, show moodboard selector
  if (activeProject.status === "inspire" && activeProject.moodboards) {
    return (
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "2rem",
        }}
      >
        <Stepper currentStep={currentStep} />
        <h1 style={{ fontSize: "2rem", marginBottom: "2rem" }}>
          Select your favorite moodboards
        </h1>
        <MoodboardSelector
          projectId={activeProject.id}
          initialMoodboards={activeProject.moodboards}
        />
      </div>
    );
  }

  // Route to correct step based on project status
  // For now, show a placeholder that indicates which step they're on
  const statusMessages: Record<string, string> = {
    inspire: "Step 1: What are you trying to create?",
    story: "Step 2: Crafting the Story",
    rendering: "Step 3: Generating your video",
    complete: "Your video is ready!",
    error: "Something went wrong. Please try again.",
  };

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "2rem",
      }}
    >
      <Stepper currentStep={currentStep} />
      <h1 style={{ fontSize: "2rem", marginBottom: "2rem" }}>
        {statusMessages[activeProject.status] || "Continue your project"}
      </h1>
      <p style={{ color: "#666" }}>
        Project status: {activeProject.status}
      </p>
      {/* TODO: Add step-specific UI in subsequent PRs */}
    </div>
  );
}

