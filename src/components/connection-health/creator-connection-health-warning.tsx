import type { ConnectionType } from "@prisma/client";
import { AlertTriangle } from "lucide-react";

interface CreatorConnectionIncident {
  id: string;
  connectionLabel: string;
  connectionType: ConnectionType;
  providerMessage: string | null;
}

export function CreatorConnectionHealthWarning({
  incidents,
}: {
  incidents: CreatorConnectionIncident[];
}) {
  if (incidents.length === 0) return null;

  return (
    <section
      role="status"
      className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 shrink-0" size={20} aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold">
            {incidents.length}{" "}
            {incidents.length === 1
              ? "connection requires reconnection"
              : "connections require reconnection"}
          </h2>
          <p className="mt-1 text-xs leading-5 text-amber-800">
            Analytics tracking has stopped for these accounts. This warning
            remains visible even when an admin dismisses the global alert.
          </p>
          <ul className="mt-3 divide-y divide-amber-200 border-y border-amber-200">
            {incidents.map((incident) => (
              <li key={incident.id} className="py-2.5">
                <p className="text-sm font-semibold">
                  {incident.connectionLabel}{" "}
                  <span className="text-xs font-medium text-amber-700">
                    ({platformLabel(incident.connectionType)})
                  </span>
                </p>
                {incident.providerMessage ? (
                  <p className="mt-1 break-words text-xs text-amber-800">
                    {incident.providerMessage}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function platformLabel(connectionType: ConnectionType) {
  return {
    IG: "Instagram",
    TT: "TikTok",
    YT: "YouTube",
    FB: "Facebook",
  }[connectionType];
}
