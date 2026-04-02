"use client";

import { useState } from "react";
import { updatePassword } from "./actions";

export function PasswordForm() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage(null);

    const result = await updatePassword(new FormData(e.currentTarget));

    if (result?.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Password updated successfully." });
      (e.target as HTMLFormElement).reset();
      setOpen(false);
    }
    setPending(false);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">Security</p>
          <p className="text-xs text-gray-400 mt-0.5">Change your account password.</p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Change Password
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="px-5 pb-4 space-y-3 border-t border-gray-100 pt-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">New password</label>
            <input
              name="newPassword"
              type="password"
              required
              minLength={8}
              placeholder="Min. 8 characters"
              className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Confirm new password</label>
            <input
              name="confirmPassword"
              type="password"
              required
              placeholder="Repeat new password"
              className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {message && (
            <p className={`text-xs ${message.type === "error" ? "text-red-600" : "text-green-600"}`}>
              {message.text}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="text-sm font-medium px-4 py-2 rounded-lg text-white disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              {pending ? "Updating…" : "Update Password"}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setMessage(null); }}
              className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
