import type { ReactNode } from "react";
import { Logo } from "@/components/shared/logo";
import { hashBrandInviteToken } from "@/lib/brand-invites";
import { prisma } from "@/lib/prisma";
import { BrandInviteForm } from "./brand-invite-form";

interface PageProps {
  params: Promise<{ token: string }>;
}

function InviteShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f9f9] px-4 py-10 text-neutral-950">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6">
          <Logo variant="light" size="sm" />
        </div>
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Brand report portal</p>
          {children}
        </section>
      </div>
    </main>
  );
}

function InvalidInviteState() {
  return (
    <>
      <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
        Uitnodiging niet geldig
      </h1>
      <p className="mt-2 text-sm leading-6 text-neutral-600">
        Deze link is verlopen, vervangen of ingetrokken. Vraag ClipProfit om een nieuwe invite-link.
      </p>
    </>
  );
}

export default async function BrandInvitePage({ params }: PageProps) {
  const { token } = await params;
  const contact = await prisma.brandContact.findUnique({
    where: { inviteTokenHash: hashBrandInviteToken(token) },
    include: { brand: { select: { name: true } } },
  });

  if (!contact || contact.status === "REVOKED") {
    return (
      <InviteShell>
        <InvalidInviteState />
      </InviteShell>
    );
  }

  const expired = !contact.inviteExpiresAt || contact.inviteExpiresAt < new Date();

  return (
    <InviteShell>
      <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
        Activeer je ClipProfit account
      </h1>
      <p className="mt-2 text-sm leading-6 text-neutral-600">
        Bekijk campagnerapporten zodra ClipProfit ze heeft vrijgegeven.
      </p>
      <div className="mt-6">
        {expired ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Deze uitnodiging is verlopen. Vraag ClipProfit om een nieuwe uitnodiging.
          </div>
        ) : (
          <BrandInviteForm
            token={token}
            brandName={contact.brand.name}
            email={contact.email}
            initialName={contact.name ?? ""}
          />
        )}
      </div>
    </InviteShell>
  );
}
