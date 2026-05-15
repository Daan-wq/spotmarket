"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
}

interface QuizRunnerProps {
  questions: QuizQuestion[];
  accent: string;
  onSubmit: (answers: number[]) => Promise<{
    ok: boolean;
    correctIndices?: number[];
    message?: string;
  }>;
  onCancel: () => void;
}

export function QuizRunner({
  questions,
  accent,
  onSubmit,
  onCancel,
}: QuizRunnerProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"idle" | "wrong">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const total = questions.length;
  const q = questions[step];

  async function handleNext() {
    if (selected === null) return;
    const nextAnswers = [...answers, selected];

    if (step + 1 < total) {
      setAnswers(nextAnswers);
      setStep(step + 1);
      setSelected(null);
      setFeedback("idle");
      setErrorMsg(null);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    const result = await onSubmit(nextAnswers);
    setIsSubmitting(false);

    if (!result.ok) {
      setFeedback("wrong");
      setErrorMsg(result.message ?? "Some answers were incorrect. Try again.");
    }
  }

  function handleRetake() {
    setStep(0);
    setAnswers([]);
    setSelected(null);
    setFeedback("idle");
    setErrorMsg(null);
  }

  if (!q) return null;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <span className="font-semibold text-neutral-900">
          Question {step + 1} of {total}
        </span>
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-200">
          <span
            className="block h-full transition-all"
            style={{
              width: `${((step + 1) / total) * 100}%`,
              background: accent,
            }}
          />
        </span>
      </div>

      <h2 className="text-lg font-semibold leading-snug text-neutral-950">
        {q.prompt}
      </h2>

      <div className="flex-1 space-y-2">
        {q.options.map((opt, i) => {
          const isSelected = selected === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              disabled={isSubmitting}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition",
                isSelected
                  ? "border-current bg-neutral-50"
                  : "border-neutral-200 hover:border-neutral-400",
              )}
              style={isSelected ? { color: accent } : { color: "#0a0a0a" }}
            >
              <span>{opt}</span>
              {isSelected && <Check className="h-4 w-4" />}
            </button>
          );
        })}
      </div>

      {feedback === "wrong" && errorMsg && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <X className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t pt-3">
        <Button variant="ghost" onClick={onCancel} size="sm">
          Cancel
        </Button>
        {feedback === "wrong" ? (
          <Button onClick={handleRetake}>Try again</Button>
        ) : (
          <Button onClick={handleNext} isPending={isSubmitting} disabled={selected === null}>
            {step + 1 === total ? "Submit" : "Next"}
          </Button>
        )}
      </div>
    </div>
  );
}
