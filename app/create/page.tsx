import { getSessionToken } from "@/lib/session";
import { getActiveProject } from "@/lib/projects";
import { redirect } from "next/navigation";
import { Stepper } from "./components/Stepper";
import { InspireStepOne } from "./components/InspireStepOne";
import { MoodboardSelector } from "./components/MoodboardSelector";
import { StorylineSelector } from "./components/StorylineSelector";
import { SceneFlowViewer } from "./components/SceneFlowViewer";
import { VisualStoryboard } from "./components/VisualStoryboard";
import { VideoGenerationProgress } from "./components/VideoGenerationProgress";
import { createClient } from "@/lib/supabaseClient";
import type { StorylineOption } from "@/lib/llmClient";

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

  // If project has moodboards but no liked moodboards yet, show moodboard selector
  if (
    activeProject.status === "inspire" &&
    activeProject.moodboards &&
    (!activeProject.likedMoodboards || activeProject.likedMoodboards.length === 0)
  ) {
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

  // If project has liked moodboards but no storyline selected yet, show storyline selector
  if (
    activeProject.status === "inspire" &&
    activeProject.likedMoodboards &&
    activeProject.likedMoodboards.length > 0 &&
    !activeProject.storylineOption
  ) {
    // Fetch storyline options from database
    const supabase = createClient();
    const { data: projectData } = await supabase
      .from("projects")
      .select("storyline_options")
      .eq("id", activeProject.id)
      .single();

    const storylineOptions =
      (projectData?.storyline_options as StorylineOption[]) ?? [];

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
          Choose your storyline
        </h1>
        <p style={{ color: "#666", marginBottom: "2rem" }}>
          Select the storyline that best matches your vision.
        </p>
        <StorylineSelector
          projectId={activeProject.id}
          initialStorylines={storylineOptions}
        />
      </div>
    );
  }

  // If status is 'story', show scene expansion or visual storyboard
  if (activeProject.status === "story") {
    const scenes = activeProject.scenes || [];
    const hasImages = scenes.some((scene) => scene.imageUrl);

    // If scenes have images, show visual storyboard
    if (hasImages) {
      return (
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "2rem",
          }}
        >
          <Stepper currentStep={currentStep} />
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
            Step 2: Visual Storyboard
          </h1>
          <p style={{ color: "#666", marginBottom: "2rem" }}>
            Review your visual storyboard. Each scene will become a video clip.
          </p>
          <VisualStoryboard
            projectId={activeProject.id}
            initialScenes={scenes}
          />
        </div>
      );
    }

    // Otherwise, show text-only scene flow
    return (
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "2rem",
        }}
      >
        <Stepper currentStep={currentStep} />
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
          Step 2: Crafting the Story
        </h1>
        <p style={{ color: "#666", marginBottom: "2rem" }}>
          Review your scene flow. Each scene will be turned into a video clip.
        </p>
        <SceneFlowViewer
          projectId={activeProject.id}
          initialScenes={scenes}
        />
      </div>
    );
  }

  // If status is 'rendering', show video generation progress
  if (activeProject.status === "rendering") {
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
          Step 3: Generating your video
        </h1>
        <VideoGenerationProgress projectId={activeProject.id} />
      </div>
    );
  }

  // Route to correct step based on project status
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
    </div>
  );
}

