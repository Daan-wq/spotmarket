"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AuthErrorHandler() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("error=")) return;

    const params = new URLSearchParams(hash.slice(1));
    const error = params.get("error");
    const description = params.get("error_description");

    if (error) {
      // Clear the hash to prevent re-triggering
      window.history.replaceState(null, "", window.location.pathname);
      const message = description || "Authentication failed. Please try again.";
      router.replace(`/sign-in?auth_error=${encodeURIComponent(message)}`);
    }
  }, [router]);

  return null;
}
