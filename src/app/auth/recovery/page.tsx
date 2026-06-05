import { Suspense } from "react";
import { RecoveryForm } from "./recovery-form";

export default function RecoveryPage() {
  return (
    <Suspense>
      <RecoveryForm />
    </Suspense>
  );
}
