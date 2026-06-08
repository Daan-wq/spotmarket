import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CreatorConnectionHealthWarning } from "./creator-connection-health-warning";

describe("CreatorConnectionHealthWarning", () => {
  it("renders every affected account with admin-only diagnostics", () => {
    const html = renderToStaticMarkup(
      <CreatorConnectionHealthWarning
        incidents={[
          {
            id: "incident-1",
            connectionLabel: "@example",
            connectionType: "IG",
            providerMessage: "Meta code 190",
          },
          {
            id: "incident-2",
            connectionLabel: "Example channel",
            connectionType: "YT",
            providerMessage: "invalid_grant",
          },
        ]}
      />,
    );

    expect(html).toContain("2 connections require reconnection");
    expect(html).toContain("@example");
    expect(html).toContain("Example channel");
    expect(html).toContain("Meta code 190");
    expect(html).toContain("invalid_grant");
  });
});
