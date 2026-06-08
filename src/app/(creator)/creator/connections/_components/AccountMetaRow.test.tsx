import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccountMetaRow } from "./AccountMetaRow";

const accountLabel = "@clipprofit";

describe("AccountMetaRow", () => {
  it("renders a successful account refresh timestamp", () => {
    const html = renderToStaticMarkup(
      <AccountMetaRow
        label={accountLabel}
        meta="1,234 followers"
        refreshStatus="SUCCESS"
        lastSuccessfulRefreshAt="2026-05-17T12:00:00.000Z"
        lastRefreshErrorMessage={null}
      />,
    );

    expect(html).toContain("1,234 followers");
    expect(html).toContain("last refreshed");
  });

  it("renders a never-refreshed account without guessing a date", () => {
    const html = renderToStaticMarkup(
      <AccountMetaRow
        label={accountLabel}
        meta="No audience snapshot"
        refreshStatus="NEVER_REFRESHED"
        lastSuccessfulRefreshAt={null}
        lastRefreshErrorMessage={null}
      />,
    );

    expect(html).toContain("not refreshed yet");
    expect(html).not.toContain("last refreshed");
  });

  it("renders a refreshing account state", () => {
    const html = renderToStaticMarkup(
      <AccountMetaRow
        label={accountLabel}
        meta="1,234 followers"
        refreshStatus="REFRESHING"
        lastSuccessfulRefreshAt={null}
        lastRefreshErrorMessage={null}
      />,
    );

    expect(html).toContain("refreshing");
  });

  it("renders a friendly reconnect state without exposing provider errors", () => {
    const html = renderToStaticMarkup(
      <AccountMetaRow
        label={accountLabel}
        meta="1,234 followers"
        refreshStatus="FAILED"
        lastSuccessfulRefreshAt="2026-05-17T12:00:00.000Z"
        lastRefreshErrorMessage="Token expired"
        requiresReconnect
        reconnectRequiredText="Reconnect required"
        analyticsStoppedText="Analytics tracking has stopped."
      />,
    );

    expect(html).toContain("1,234 followers");
    expect(html).toContain("last refreshed");
    expect(html).toContain("Reconnect required");
    expect(html).toContain("Analytics tracking has stopped.");
    expect(html).not.toContain("Token expired");
  });

  it("keeps technical provider details available to admins", () => {
    const html = renderToStaticMarkup(
      <AccountMetaRow
        label={accountLabel}
        meta="1,234 followers"
        refreshStatus="FAILED"
        lastSuccessfulRefreshAt="2026-05-17T12:00:00.000Z"
        lastRefreshErrorMessage="Meta code 190"
        requiresReconnect
        reconnectRequiredText="Reconnect required"
        analyticsStoppedText="Analytics tracking has stopped."
        showTechnicalError
      />,
    );

    expect(html).toContain("Reconnect required");
    expect(html).toContain("Meta code 190");
  });
});
