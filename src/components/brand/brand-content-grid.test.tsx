import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandContentGrid } from "./brand-content-grid";

describe("BrandContentGrid", () => {
  it("uses the portal campaign selection and only renders content-specific filters", () => {
    const html = renderToStaticMarkup(
      <BrandContentGrid
        selectedCampaignId="campaign-1"
        items={[]}
        total={0}
        page={1}
        totalPages={1}
        platform="all"
        sort="recent"
      />,
    );

    expect(html).not.toContain('<select name="campaignId"');
    expect(html).toContain('name="platform"');
    expect(html).toContain('name="sort"');
    expect(html).toContain('type="hidden" name="campaignId" value="campaign-1"');
  });
});
