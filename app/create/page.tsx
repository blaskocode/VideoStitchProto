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
import { MusicSelector } from "./components/MusicSelector";
import { VideoCompositionProgress } from "./components/VideoCompositionProgress";
import { ErrorDisplay } from "./components/ErrorDisplay";
import { MoodboardGenerationProgress } from "./components/MoodboardGenerationProgress";
import { StartOverButton } from "./components/StartOverButton";
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

  // If project exists but no moodboards yet, show the form
  // The form will trigger moodboard generation and navigate to progress screen
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

  // If status is 'rendering', check if videos are complete and music is selected
  if (activeProject.status === "rendering") {
    const scenes = activeProject.scenes || [];
    const allVideosComplete = scenes.length > 0 && scenes.every((scene) => scene.videoUrl);
    const hasMusic = !!activeProject.musicTrackId;
    const hasFinalVideo = !!activeProject.finalVideoUrl;

    // If final video exists, show it (status should be 'complete' but handle edge case)
    if (hasFinalVideo) {
      return (
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "2rem",
          }}
        >
          <Stepper currentStep="complete" />
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
            Your video is ready! 🎬
          </h1>
          <div style={{ marginBottom: "2rem" }}>
            <video
              controls
              src={activeProject.finalVideoUrl}
              style={{
                width: "100%",
                maxWidth: "800px",
                borderRadius: "0.5rem",
                margin: "0 auto",
                display: "block",
              }}
            />
          </div>
          <a
            href={activeProject.finalVideoUrl}
            download
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
            Download Video
          </a>
        </div>
      );
    }

    // If all videos are complete and music is selected, show composition progress
    if (allVideosComplete && hasMusic) {
      return (
        <div
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            padding: "2rem",
          }}
        >
          <Stepper currentStep={currentStep} />
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
            Step 4: Finalizing your video
          </h1>
          <VideoCompositionProgress projectId={activeProject.id} />
        </div>
      );
    }

    // If all videos are complete but no music selected, show music selector
    if (allVideosComplete && !hasMusic) {
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
            Step 4: Choose your music
          </h1>
          <p style={{ color: "#666", marginBottom: "2rem" }}>
            Select a music track that matches the mood of your video.
          </p>
          <MusicSelector projectId={activeProject.id} />
        </div>
      );
    }

    // Otherwise, show video generation progress
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

  // If status is 'complete', show final video
  if (activeProject.status === "complete" && activeProject.finalVideoUrl) {
    return (
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "2rem",
        }}
      >
        <Stepper currentStep="complete" />
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
          Your video is ready! 🎬
        </h1>
        <div style={{ marginBottom: "2rem" }}>
          <video
            controls
            src={activeProject.finalVideoUrl}
            style={{
              width: "100%",
              maxWidth: "800px",
              borderRadius: "0.5rem",
              margin: "0 auto",
              display: "block",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <a
            href={activeProject.finalVideoUrl}
            download
            style={{
              display: "inline-block",
              padding: "0.75rem 1.5rem",
              backgroundColor: "#0070f3",
              color: "white",
              textDecoration: "none",
              borderRadius: "0.25rem",
              fontSize: "1rem",
              fontWeight: "500",
            }}
          >
            Download Video
          </a>
          <StartOverButton projectId={activeProject.id} />
        </div>
      </div>
    );
  }

  // If status is 'error', show error display
  if (activeProject.status === "error") {
    // Try to get error message from jobs
    const supabase = createClient();
    const { data: errorJob } = await supabase
      .from("jobs")
      .select("error_message")
      .eq("project_id", activeProject.id)
      .eq("status", "error")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    const errorMessage = errorJob?.error_message
      ? `Error: ${errorJob.error_message}`
      : "An error occurred during video generation. Please try creating a new video.";

    return (
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "2rem",
        }}
      >
        <Stepper currentStep={currentStep} />
        <ErrorDisplay errorMessage={errorMessage} />
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

