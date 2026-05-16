import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PlatformIcon from "./PlatformIcon";

describe("PlatformIcon", () => {
  it("renders repeated Instagram icons without duplicate SVG gradient ids", () => {
    const html = renderToStaticMarkup(
      <div>
        <div className="md:hidden">
          <PlatformIcon platform="INSTAGRAM" size={24} />
        </div>
        <div className="hidden md:block">
          <PlatformIcon platform="INSTAGRAM" size={28} />
        </div>
      </div>
    );

    expect(html).not.toContain('id="ig-grad"');
    expect(html).not.toContain("url(#ig-grad)");
    expect(html.match(/radial-gradient/g)?.length).toBe(2);
  });
});
