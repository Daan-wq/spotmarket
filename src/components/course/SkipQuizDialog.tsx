"use client";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SkipQuizDialogProps {
  open: boolean;
  onTakeQuiz: () => void;
  onConfirmSkip: () => void;
  onClose: () => void;
  isPending?: boolean;
}

export function SkipQuizDialog({
  open,
  onTakeQuiz,
  onConfirmSkip,
  onClose,
  isPending,
}: SkipQuizDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Skip the quiz?"
      description="Skipping means no badge for this lesson. You can come back anytime to earn it."
      footer={
        <>
          <Button variant="outline" onClick={onConfirmSkip} isPending={isPending}>
            Skip Anyway
          </Button>
          <Button onClick={onTakeQuiz}>Take Quiz</Button>
        </>
      }
    />
  );
}
