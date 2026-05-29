"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

const inputClass = "h-10 rounded-md border border-neutral-200 px-3 text-sm outline-none transition focus:border-neutral-500";

export function LeadCreateForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    const payload = {
      brandName: String(formData.get("brandName") ?? ""),
      groupName: String(formData.get("groupName") ?? ""),
      category: String(formData.get("category") ?? ""),
      subcategory: String(formData.get("subcategory") ?? ""),
      contactName: String(formData.get("contactName") ?? ""),
      contactEmail: String(formData.get("contactEmail") ?? ""),
      contactPhone: String(formData.get("contactPhone") ?? ""),
      contactLinkedIn: String(formData.get("contactLinkedIn") ?? ""),
      website: String(formData.get("website") ?? ""),
      owner: String(formData.get("owner") ?? ""),
      source: String(formData.get("source") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    };

    startTransition(async () => {
      const response = await fetch("/api/admin/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Could not create lead.");
        return;
      }
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
        <input name="brandName" required placeholder="Company or lead" className={`${inputClass} md:col-span-2`} />
        <input name="groupName" placeholder="Group" className={`${inputClass} md:col-span-2`} />
        <input name="owner" placeholder="Owner" className={`${inputClass} md:col-span-2`} />
        <input name="category" placeholder="Category" className={inputClass} />
        <input name="subcategory" placeholder="Subcategory" className={inputClass} />
        <input name="contactName" placeholder="Contact person" className={inputClass} />
        <input name="contactEmail" type="email" placeholder="Email" className={inputClass} />
        <input name="contactPhone" placeholder="Phone" className={inputClass} />
        <input name="contactLinkedIn" placeholder="LinkedIn" className={inputClass} />
        <input name="website" placeholder="Website" className={`${inputClass} md:col-span-2`} />
        <input name="source" placeholder="Source" className={`${inputClass} md:col-span-2`} />
        <input name="notes" placeholder="Notes" className={`${inputClass} md:col-span-2`} />
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <div className="mt-4 flex justify-end">
        <Button type="submit" isPending={isPending}>Add lead</Button>
      </div>
    </form>
  );
}
