"use client";

export function StepIndicator({
  currentStep,
  totalSteps,
  labels,
}: {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;
        return (
          <div key={step} className="flex items-center gap-2 flex-1">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div
                className="w-full h-1 rounded-full transition-colors"
                style={{
                  background: isActive || isCompleted ? "var(--accent)" : "#e2e8f0",
                }}
              />
              {labels?.[i] && (
                <span
                  className="text-[10px] font-medium"
                  style={{ color: isActive ? "var(--accent)" : "#94a3b8" }}
                >
                  {labels[i]}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
