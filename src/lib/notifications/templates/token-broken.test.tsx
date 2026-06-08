import { describe, expect, it } from "vitest";
import { render } from "@react-email/components";
import { TokenBrokenEmail } from "./token-broken";

describe("TokenBrokenEmail", () => {
  it("names the affected page and links to its connection view", async () => {
    const html = await render(
      <TokenBrokenEmail
        data={{
          accountLabel: "@page",
          connectionType: "IG",
          href: "/creator/connections?platform=ig&account=ig-1",
        }}
      />,
    );

    expect(html).toContain("@page");
    expect(html).toContain("Analytics tracking has stopped");
    expect(html).toContain(
      "https://app.clipprofit.com/creator/connections?platform=ig&amp;account=ig-1",
    );
  });
});
