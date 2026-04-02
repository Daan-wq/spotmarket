"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "./actions";

export function DeleteAccountForm() {
  const [confirming, setConfirming] = useState(false);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAccount();
      if (result && "error" in result) {
        setError(result.error as string);
      }
    });
  }

  return (
    <div className="rounded-xl border border-red-200 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-red-100">
        <p className="text-sm font-medium text-red-700">Danger Zone</p>
        <p className="text-xs text-gray-400 mt-0.5">Permanently delete your account and all data.</p>
      </div>
      <div className="px-5 py-4">
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-sm font-medium px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            Delete Account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              This action is <strong>irreversible</strong>. All your data, pages, and earnings history will be permanently deleted.
            </p>
            <p className="text-xs text-gray-500">
              Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="DELETE"
              className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={input !== "DELETE" || isPending}
                className="text-sm font-medium px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40"
              >
                {isPending ? "Deleting…" : "Confirm Delete"}
              </button>
              <button
                type="button"
                onClick={() => { setConfirming(false); setInput(""); setError(null); }}
                className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
