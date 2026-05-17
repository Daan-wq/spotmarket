"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toIntlLocale } from "@/lib/i18n-format";

const GEO_CODES = [
  "US",
  "GB",
  "NL",
  "BE",
  "DE",
  "GR",
  "AU",
  "CA",
  "SE",
  "NO",
  "FI",
  "DK",
  "AT",
  "CH",
];

const WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;
const TRON_REGEX = /^T[1-9A-HJ-NP-Z]{33}$/;

const inputStyle = {
  border: "1px solid var(--border)",
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
};

interface ProfileFormProps {
  profileId: string;
  initialData: {
    displayName: string;
    bio: string;
    walletAddress: string;
    tronsAddress: string;
    primaryGeo: string;
  };
}

export function ProfileForm({ profileId, initialData }: ProfileFormProps) {
  const t = useTranslations("creator.profile.form");
  const locale = useLocale();
  const router = useRouter();
  const regionNames = new Intl.DisplayNames([toIntlLocale(locale)], {
    type: "region",
  });
  const [form, setForm] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function validate(): string | null {
    if (!form.displayName.trim()) return t("displayNameRequired");
    if (form.walletAddress && !WALLET_REGEX.test(form.walletAddress)) {
      return t("evmWalletInvalid");
    }
    if (form.tronsAddress && !TRON_REGEX.test(form.tronsAddress)) {
      return t("tronWalletInvalid");
    }
    return null;
  }

  async function handleSave() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch(`/api/creators/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        throw new Error(t("saveFailed"));
      }

      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid var(--border)" }}
    >
      <div
        className="px-5 py-3"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        <p
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {t("title")}
        </p>
      </div>
      <div
        className="px-5 py-5 space-y-4"
        style={{ background: "var(--bg-elevated)" }}
      >
        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--card-foreground)" }}
          >
            {t("displayName")}
          </label>
          <input
            type="text"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            placeholder={t("displayNamePlaceholder")}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
            style={inputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-bg)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--card-foreground)" }}
          >
            {t("bio")}
          </label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
            placeholder={t("bioPlaceholder")}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all resize-none"
            style={inputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-bg)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--card-foreground)" }}
          >
            {t("primaryGeo")}
          </label>
          <select
            value={form.primaryGeo}
            onChange={(e) => setForm({ ...form, primaryGeo: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
            style={inputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-bg)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {GEO_CODES.map((code) => (
              <option key={code} value={code}>
                {regionNames.of(code) ?? code} ({code})
              </option>
            ))}
          </select>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {t("primaryGeoHelper")}
          </p>
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--card-foreground)" }}
          >
            {t("evmWallet")}{" "}
            <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
              ({t("forPayouts")})
            </span>
          </label>
          <input
            type="text"
            value={form.walletAddress}
            onChange={(e) =>
              setForm({ ...form, walletAddress: e.target.value })
            }
            placeholder="0x..."
            className="w-full px-3 py-2.5 rounded-lg text-sm font-mono outline-none transition-all"
            style={inputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-bg)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {t("evmWalletHelper")}
          </p>
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--card-foreground)" }}
          >
            {t("usdtWallet")}{" "}
            <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
              ({t("forCampaignDeposits")})
            </span>
          </label>
          <input
            type="text"
            value={form.tronsAddress}
            onChange={(e) =>
              setForm({ ...form, tronsAddress: e.target.value.trim() })
            }
            placeholder="Txxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full px-3 py-2.5 rounded-lg text-sm font-mono outline-none transition-all"
            style={{
              ...inputStyle,
              borderColor:
                form.tronsAddress && !TRON_REGEX.test(form.tronsAddress)
                  ? "#f87171"
                  : undefined,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-bg)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor =
                form.tronsAddress && !TRON_REGEX.test(form.tronsAddress)
                  ? "#f87171"
                  : "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {t("usdtWalletHelper")}
          </p>
        </div>

        {error && (
          <p
            className="text-sm px-3 py-2 rounded-lg"
            style={{ color: "#b91c1c", background: "#fef2f2" }}
          >
            {error}
          </p>
        )}
        {saved && (
          <p
            className="text-sm px-3 py-2 rounded-lg"
            style={{ color: "#15803d", background: "#f0fdf4" }}
          >
            {t("saved")}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
          style={{ background: "var(--accent)" }}
          onMouseEnter={(e) => {
            if (!saving)
              (e.currentTarget as HTMLElement).style.background =
                "var(--accent-hover)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--accent)";
          }}
        >
          {saving ? t("saving") : t("save")}
        </button>
      </div>
    </div>
  );
}
