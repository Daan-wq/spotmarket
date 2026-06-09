import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ConnectionHealthAlertPanel,
  type ConnectionHealthAlertCopy,
} from "./connection-health-alerts";
import type { ConnectionHealthAlertItem } from "@/lib/connection-health";

const copy: ConnectionHealthAlertCopy = {
  title: "Connection expired",
  creatorDescription: "Analytics tracking has stopped.",
  adminDescription: "Connected accounts need attention.",
  analyticsStopped: "New analytics will appear after you reconnect.",
  reconnect: "Reconnect",
  viewConnections: "Unlink",
  unlinkHelp: "No longer using it?",
  close: "Close notification",
  viewCreator: "View creator",
  technicalDetails: "Technical details",
  moreIncidents: "View 1 more",
};

describe("ConnectionHealthAlertPanel", () => {
  it("renders a grouped creator alert with a temporary close action", () => {
    const html = renderToStaticMarkup(
      <ConnectionHealthAlertPanel
        incidents={[incident(), incident({ id: "incident-2", connectionLabel: "@other" })]}
        viewerRole="creator"
        copy={copy}
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain(copy.title);
    expect(html).toContain("@page");
    expect(html).toContain("@other");
    expect(html).toContain("href=\"/api/auth/instagram");
    expect(html.match(/aria-label="Close notification"/g)).toHaveLength(1);
    expect(html).not.toContain("role=\"switch\"");
    expect(html).not.toContain("Do not remind me again");
    expect(html).toContain("No longer using it?");
    expect(html).toContain("Instagram");
    expect(html).not.toContain(">Token expired");
  });

  it("groups admin incidents by creator and links overflow to Signals", () => {
    const incidents = Array.from({ length: 9 }, (_, index) =>
      incident({
        id: `incident-${index}`,
        connectionId: `ig-${index}`,
        connectionLabel: `@page${index}`,
      }),
    );

    const html = renderToStaticMarkup(
      <ConnectionHealthAlertPanel
        incidents={incidents}
        viewerRole="admin"
        copy={copy}
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain("Creator One");
    expect(html).toContain("Technical details");
    expect(html).toContain("/admin/signals?type=TOKEN_BROKEN");
    expect(html).toContain("View 1 more");
    expect(html.match(/aria-label="Close notification"/g)).toHaveLength(1);
  });
});

function incident(
  overrides: Partial<ConnectionHealthAlertItem> = {},
): ConnectionHealthAlertItem {
  return {
    id: "incident-1",
    creatorProfileId: "profile-1",
    creatorName: "Creator One",
    creatorEmail: "creator@example.com",
    connectionType: "IG",
    connectionId: "ig-1",
    connectionLabel: "@page",
    issueType: "TOKEN_REVOKED",
    openedAt: "2026-06-08T12:00:00.000Z",
    lastDetectedAt: "2026-06-08T13:00:00.000Z",
    connectionHref: "/creator/connections?platform=ig&account=ig-1",
    reconnectHref:
      "/api/auth/instagram?return_to=%2Fcreator%2Fconnections",
    creatorHref: "/admin/creators/profile-1?platform=ig&account=ig-1",
    providerDetails: {
      code: "190",
      subcode: "460",
      type: "OAuthException",
      message: "Session invalidated",
    },
    ...overrides,
  };
}
