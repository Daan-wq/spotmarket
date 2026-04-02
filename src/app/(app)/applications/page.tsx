import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TopHeader } from "@/components/dashboard/top-header";

const STATUS_CONFIG: Record<string, { background: string; color: string; label: string }> = {
  approved:  { background: "var(--success-bg)", color: "var(--success)", label: "Approved"  },
  pending:   { background: "var(--warning-bg)", color: "var(--warning-text)", label: "Pending"   },
  rejected:  { background: "var(--error-bg)", color: "var(--error)", label: "Rejected"  },
  active:    { background: "var(--success-bg)", color: "var(--success)", label: "Active"    },
  completed: { background: "var(--muted)", color: "var(--text-secondary)", label: "Completed" },
  disputed:  { background: "#fff7ed", color: "#c2410c", label: "Disputed"  },
};

const MOCK_APPLICATIONS = [
  { brand: "Nike",     campaign: "Air Max Launch",     status: "approved", budget: "€25,000", applied: "Mar 12, 2026", deadline: "Apr 5, 2026"  },
  { brand: "Spotify",  campaign: "Wrapped Campaign",   status: "pending",  budget: "€20,000", applied: "Mar 14, 2026", deadline: "Apr 20, 2026" },
  { brand: "Samsung",  campaign: "Galaxy S Series",    status: "draft",    budget: "€28,000", applied: "Mar 13, 2026", deadline: "Apr 15, 2026" },
  { brand: "L'Oréal",  campaign: "Summer Glow",        status: "rejected", budget: "€9,500",  applied: "Mar 10, 2026", deadline: "Mar 30, 2026" },
  { brand: "Red Bull", campaign: "Season Launch",      status: "pending",  budget: "€48,000", applied: "Mar 9, 2026",  deadline: "Apr 10, 2026" },
  { brand: "Adidas",   campaign: "Ultraboost Spring",  status: "approved", budget: "€22,000", applied: "Mar 8, 2026",  deadline: "Apr 8, 2026"  },
];

export default async function ApplicationsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: {
      creatorProfile: {
        include: {
          applications: {
            include: {
              campaign: true,
            },
            orderBy: { appliedAt: "desc" },
          },
        },
      },
    },
  });

  const creatorProfile = user?.creatorProfile;
  const realApps = creatorProfile?.applications ?? [];
  const useMock = realApps.length === 0;

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-primary)" }}>
      <TopHeader
        title="Applications"
        displayName={creatorProfile?.displayName ?? undefined}
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {useMock ? "Sample applications — connect Instagram to track real applications." : `${realApps.length} application${realApps.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <a
            href="/campaigns"
            className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition-opacity"
            style={{ background: "var(--text-primary)" }}
          >
            Browse campaigns
          </a>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
          {/* Header */}
          <div
            className="grid grid-cols-[1fr_1.5fr_auto_auto_auto] gap-4 px-5 py-3"
            style={{ borderBottom: "1px solid var(--bg-secondary)", background: "var(--bg-primary)" }}
          >
            {["Brand", "Campaign", "Status", "Budget", "Applied"].map(h => (
              <p key={h} className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                {h}
              </p>
            ))}
          </div>

          {/* Rows — real */}
          {!useMock && realApps.map((app, i) => {
            const s = STATUS_CONFIG[app.status] ?? { background: "var(--muted)", color: "var(--text-secondary)", label: app.status };
            return (
              <div
                key={app.id}
                className="grid grid-cols-[1fr_1.5fr_auto_auto_auto] gap-4 items-center px-5 py-3.5"
                style={{ borderTop: i > 0 ? "1px solid var(--bg-secondary)" : undefined }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: "var(--text-primary)" }}
                  >
                    CA
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    Campaign
                  </p>
                </div>
                <p className="text-sm truncate" style={{ color: "var(--card-foreground)" }}>{app.campaign.name}</p>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={s}>
                  {s.label}
                </span>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>—</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {new Date(app.appliedAt).toLocaleDateString()}
                </p>
              </div>
            );
          })}

          {/* Rows — mock */}
          {useMock && MOCK_APPLICATIONS.map((app, i) => {
            const s = STATUS_CONFIG[app.status] ?? { background: "var(--muted)", color: "var(--text-secondary)", label: app.status };
            return (
              <div
                key={i}
                className="grid grid-cols-[1fr_1.5fr_auto_auto_auto] gap-4 items-center px-5 py-3.5"
                style={{ borderTop: i > 0 ? "1px solid var(--bg-secondary)" : undefined }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: "var(--text-primary)" }}
                  >
                    {app.brand.slice(0, 2).toUpperCase()}
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{app.brand}</p>
                </div>
                <p className="text-sm truncate" style={{ color: "var(--card-foreground)" }}>{app.campaign}</p>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={s}>
                  {s.label}
                </span>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{app.budget}</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{app.applied}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
