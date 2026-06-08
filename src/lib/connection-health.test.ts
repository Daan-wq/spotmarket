import { describe, expect, it, vi } from "vitest";
import {
  classifyConnectionAuthFailure,
  getConnectionHealthAlertsForViewer,
  recordConnectionHealthFailure,
  resolveConnectionHealthIncident,
  resolveConnectionHealthIncidents,
} from "./connection-health";

describe("connection health classification", () => {
  it("classifies Meta code 190 as a revoked token and preserves provider details", () => {
    const failure = classifyConnectionAuthFailure(
      Object.assign(new Error("The session has been invalidated for security reasons."), {
        details: {
          providerCode: 190,
          providerSubcode: 460,
          providerType: "OAuthException",
          message: "The session has been invalidated for security reasons.",
        },
      }),
    );

    expect(failure).toEqual({
      issueType: "TOKEN_REVOKED",
      providerCode: "190",
      providerSubcode: "460",
      providerType: "OAuthException",
      providerMessage: "The session has been invalidated for security reasons.",
    });
  });

  it("classifies missing credentials and expired tokens", () => {
    expect(
      classifyConnectionAuthFailure(
        new Error("Missing Instagram token or user id"),
        "MISSING_ACCOUNT_CREDENTIALS",
      )?.issueType,
    ).toBe("MISSING_TOKEN");

    expect(
      classifyConnectionAuthFailure(new Error("Access token expired"), "TOKEN_EXPIRED")
        ?.issueType,
    ).toBe("TOKEN_EXPIRED");
  });

  it("classifies invalid_grant as a revoked token", () => {
    expect(
      classifyConnectionAuthFailure(
        new Error('YouTube token refresh failed: {"error":"invalid_grant"}'),
        "TOKEN_REFRESH_FAILED",
      )?.issueType,
    ).toBe("TOKEN_REVOKED");
  });

  it("ignores generic network and provider failures", () => {
    expect(
      classifyConnectionAuthFailure(
        new Error("fetch failed: ETIMEDOUT"),
        "TOKEN_REFRESH_FAILED",
      ),
    ).toBeNull();
    expect(
      classifyConnectionAuthFailure(new Error("Provider returned 503"), "REFRESH_FAILED"),
    ).toBeNull();
  });
});

describe("connection health incident lifecycle", () => {
  it("creates one incident and sends one notification for a new auth failure", async () => {
    const db = createDb();
    const notify = vi.fn().mockResolvedValue("notification-1");
    db.connectionHealthIncident.findUnique.mockResolvedValue(null);
    db.connectionHealthIncident.create.mockResolvedValue({ id: "incident-1" });

    const result = await recordConnectionHealthFailure(
      {
        connectionType: "IG",
        connectionId: "ig-1",
        error: Object.assign(new Error("OAuthException: session invalidated"), {
          details: {
            providerCode: 190,
            providerSubcode: null,
            providerType: "OAuthException",
            message: "OAuthException: session invalidated",
          },
        }),
        detectedAt: new Date("2026-06-08T12:00:00.000Z"),
      },
      db as never,
      notify,
    );

    expect(result).toEqual({ incidentId: "incident-1", created: true });
    expect(db.connectionHealthIncident.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        activeKey: "IG:ig-1",
        connectionType: "IG",
        connectionId: "ig-1",
        creatorProfileId: "profile-1",
        connectionLabel: "@page",
        issueType: "TOKEN_REVOKED",
      }),
      select: { id: true },
    });
    expect(notify).toHaveBeenCalledWith(
      "user-1",
      "TOKEN_BROKEN",
      expect.objectContaining({
        incidentId: "incident-1",
        connectionId: "ig-1",
        connectionType: "IG",
        accountLabel: "@page",
        href: "/creator/connections?platform=ig&account=ig-1",
      }),
    );
  });

  it("updates an existing incident without sending another notification", async () => {
    const db = createDb();
    const notify = vi.fn();
    db.connectionHealthIncident.findUnique.mockResolvedValue({ id: "incident-1" });
    db.connectionHealthIncident.update.mockResolvedValue({ id: "incident-1" });

    const result = await recordConnectionHealthFailure(
      {
        connectionType: "IG",
        connectionId: "ig-1",
        error: new Error("Access token expired"),
        code: "TOKEN_EXPIRED",
      },
      db as never,
      notify,
    );

    expect(result).toEqual({ incidentId: "incident-1", created: false });
    expect(db.connectionHealthIncident.update).toHaveBeenCalledWith({
      where: { id: "incident-1" },
      data: expect.objectContaining({
        issueType: "TOKEN_EXPIRED",
        lastDetectedAt: expect.any(Date),
      }),
      select: { id: true },
    });
    expect(db.connectionHealthIncident.create).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("does not create an incident for a non-authentication failure", async () => {
    const db = createDb();
    const notify = vi.fn();

    const result = await recordConnectionHealthFailure(
      {
        connectionType: "YT",
        connectionId: "yt-1",
        error: new Error("YouTube API returned 503"),
        code: "REFRESH_FAILED",
      },
      db as never,
      notify,
    );

    expect(result).toBeNull();
    expect(db.creatorYtConnection.findUnique).not.toHaveBeenCalled();
    expect(db.connectionHealthIncident.create).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("resolves the active incident and releases its active key", async () => {
    const db = createDb();
    const resolvedAt = new Date("2026-06-08T13:00:00.000Z");

    await resolveConnectionHealthIncident(
      "IG",
      "ig-1",
      "REFRESH_SUCCEEDED",
      resolvedAt,
      db as never,
    );

    expect(db.connectionHealthIncident.updateMany).toHaveBeenCalledWith({
      where: { activeKey: "IG:ig-1", resolvedAt: null },
      data: {
        activeKey: null,
        resolvedAt,
        resolutionReason: "REFRESH_SUCCEEDED",
      },
    });
  });

  it("resolves multiple removed connections in one update", async () => {
    const db = createDb();
    const resolvedAt = new Date("2026-06-08T14:00:00.000Z");

    await resolveConnectionHealthIncidents(
      "FB",
      ["fb-1", "fb-2"],
      "UNLINKED",
      resolvedAt,
      db as never,
    );

    expect(db.connectionHealthIncident.updateMany).toHaveBeenCalledWith({
      where: {
        activeKey: { in: ["FB:fb-1", "FB:fb-2"] },
        resolvedAt: null,
      },
      data: {
        activeKey: null,
        resolvedAt,
        resolutionReason: "UNLINKED",
      },
    });
  });
});

describe("connection health alert visibility", () => {
  it("limits creators to their own incidents and hides provider diagnostics", async () => {
    const db = createDb();
    db.connectionHealthIncident.findMany.mockResolvedValue([
      incidentRow({ dismissals: [] }),
    ]);

    const alerts = await getConnectionHealthAlertsForViewer(
      { id: "user-1", role: "creator" },
      db as never,
    );

    expect(db.connectionHealthIncident.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          resolvedAt: null,
          creatorProfile: { userId: "user-1" },
        },
      }),
    );
    expect(alerts[0]).toMatchObject({
      id: "incident-1",
      creatorName: "Creator One",
      connectionLabel: "@page",
      dismissed: false,
      providerDetails: null,
      reconnectHref:
        "/api/auth/instagram?return_to=%2Fcreator%2Fconnections",
    });
  });

  it("returns global incidents and provider diagnostics to admins", async () => {
    const db = createDb();
    db.connectionHealthIncident.findMany.mockResolvedValue([
      incidentRow({ dismissals: [{ id: "dismissal-1" }] }),
    ]);

    const alerts = await getConnectionHealthAlertsForViewer(
      { id: "admin-1", role: "admin" },
      db as never,
    );

    expect(db.connectionHealthIncident.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { resolvedAt: null },
      }),
    );
    expect(alerts[0]).toMatchObject({
      dismissed: true,
      creatorHref: "/admin/creators/profile-1?platform=ig&account=ig-1",
      providerDetails: {
        code: "190",
        subcode: "460",
        type: "OAuthException",
        message: "Session invalidated",
      },
    });
  });
});

function createDb() {
  return {
    creatorIgConnection: {
      findUnique: vi.fn().mockResolvedValue({
        creatorProfileId: "profile-1",
        igUsername: "page",
        creatorProfile: { userId: "user-1" },
      }),
    },
    creatorFbConnection: { findUnique: vi.fn() },
    creatorYtConnection: { findUnique: vi.fn() },
    creatorTikTokConnection: { findUnique: vi.fn() },
    connectionHealthIncident: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

function incidentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "incident-1",
    creatorProfileId: "profile-1",
    connectionType: "IG",
    connectionId: "ig-1",
    connectionLabel: "@page",
    issueType: "TOKEN_REVOKED",
    providerCode: "190",
    providerSubcode: "460",
    providerType: "OAuthException",
    providerMessage: "Session invalidated",
    openedAt: new Date("2026-06-08T12:00:00.000Z"),
    lastDetectedAt: new Date("2026-06-08T13:00:00.000Z"),
    creatorProfile: {
      displayName: "Creator One",
      user: { email: "creator@example.com" },
    },
    dismissals: [],
    ...overrides,
  };
}
