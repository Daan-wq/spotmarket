"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { updateCreatorProfile } from "../actions";

interface ProfileEditFormProps {
  initialDisplayName: string;
  initialBio: string;
}

export function ProfileEditForm({
  initialDisplayName,
  initialBio,
}: ProfileEditFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const t = useTranslations("creatorSettings.profileForm");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateCreatorProfile(fd);
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(res.error ?? t("saveFailed"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <AlertBanner tone="error" title={error} />}
      {success && <AlertBanner tone="success" title={t("saved")} />}

      <Field
        label={t("displayName.label")}
        helper={t("displayName.helper")}
      >
        <input
          name="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={60}
          required
          className="form-input"
          style={inputStyle}
        />
      </Field>

      <Field
        label={t("bio.label")}
        helper={t("bio.helper")}
      >
        <textarea
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={280}
          rows={3}
          className="form-input"
          style={{ ...inputStyle, resize: "vertical", minHeight: 70 }}
        />
        <p
          className="mt-1 text-xs text-right"
          style={{ color: "var(--text-muted)" }}
        >
          {t("bio.count", { count: bio.length })}
        </p>
      </Field>

      <div>
        <Button type="submit" isPending={pending}>
          {t("saveChanges")}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block text-sm font-medium mb-1"
        style={{ color: "var(--text-primary)" }}
      >
        {label}
      </label>
      {children}
      {helper && (
        <p
          className="mt-1 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          {helper}
        </p>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  borderColor: "var(--border)",
  color: "var(--text-primary)",
};
