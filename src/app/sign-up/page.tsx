import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  return (
    <AuthShell>
      <Suspense>
        <SignUpForm />
      </Suspense>
    </AuthShell>
  );
}
