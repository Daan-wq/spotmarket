"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

const inputClass = "h-10 rounded-md border border-neutral-200 px-3 text-sm outline-none transition focus:border-neutral-500";

export function LeadCreateForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
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
        setError(body.error ?? "Lead kon niet worden gemaakt.");
        return;
      }
      formRef.current?.reset();
      setIsOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="relative flex justify-end">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={isOpen}
        onClick={() => {
          setError(null);
          setIsOpen((value) => !value);
        }}
        className="rounded-md"
      >
        <Plus className="h-4 w-4" />
        Lead toevoegen
        <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
      </Button>

      {isOpen ? (
        <div className="absolute right-0 top-11 z-30 w-[min(780px,calc(100vw-2rem))] rounded-lg border border-neutral-200 bg-white p-4 shadow-xl shadow-neutral-950/10">
          <form ref={formRef} action={onSubmit}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
              <input name="brandName" required placeholder="Bedrijf of lead" className={`${inputClass} md:col-span-2`} />
              <input name="groupName" placeholder="Groep" className={`${inputClass} md:col-span-2`} />
              <input name="owner" placeholder="Eigenaar" className={`${inputClass} md:col-span-2`} />
              <input name="category" placeholder="Categorie" className={inputClass} />
              <input name="subcategory" placeholder="Subcategorie" className={inputClass} />
              <input name="contactName" placeholder="Contactpersoon" className={inputClass} />
              <input name="contactEmail" type="email" placeholder="Email" className={inputClass} />
              <input name="contactPhone" placeholder="Telefoon" className={inputClass} />
              <input name="contactLinkedIn" placeholder="LinkedIn" className={inputClass} />
              <input name="website" placeholder="Website" className={`${inputClass} md:col-span-2`} />
              <input name="source" placeholder="Bron" className={`${inputClass} md:col-span-2`} />
              <input name="notes" placeholder="Notities" className={`${inputClass} md:col-span-2`} />
            </div>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="rounded-md"
              >
                Annuleren
              </Button>
              <Button type="submit" size="sm" isPending={isPending} className="rounded-md">
                Lead toevoegen
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
