import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <AuthShell>
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
