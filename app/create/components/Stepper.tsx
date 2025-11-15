import type { ProjectStatus } from "@/types/domain";

interface StepperProps {
  currentStep: ProjectStatus | "start";
}

const steps = [
  { id: "start", label: "Inspire Me", status: "start" as const },
  { id: "story", label: "Crafting the Story", status: "story" as const },
  { id: "rendering", label: "Generate the Video", status: "rendering" as const },
];

export function Stepper({ currentStep }: StepperProps) {
  // Map project status to step index
  const getStepIndex = (step: ProjectStatus | "start"): number => {
    if (step === "start" || step === "inspire") return 0;
    if (step === "story") return 1;
    if (step === "rendering" || step === "complete") return 2;
    return 0; // error or unknown
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "3rem",
        maxWidth: "600px",
        margin: "0 auto 3rem",
        position: "relative",
      }}
    >
      {/* Connecting line */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          right: "20px",
          height: "2px",
          backgroundColor: "#e0e0e0",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          width: `${(currentIndex / (steps.length - 1)) * 100}%`,
          height: "2px",
          backgroundColor: "#0070f3",
          zIndex: 1,
        }}
      />
      {steps.map((step, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;

        return (
          <div
            key={step.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: 1,
              position: "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: isCompleted
                  ? "#0070f3"
                  : isActive
                    ? "#0070f3"
                    : "#e0e0e0",
                color: isActive || isCompleted ? "white" : "#999",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                marginBottom: "0.5rem",
              }}
            >
              {isCompleted ? "✓" : index + 1}
            </div>
            <span
              style={{
                fontSize: "0.875rem",
                color: isActive ? "#0070f3" : "#999",
                fontWeight: isActive ? "600" : "normal",
                textAlign: "center",
              }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

