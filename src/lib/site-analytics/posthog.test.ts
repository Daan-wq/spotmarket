import { describe, expect, it } from "vitest";
import { extractRows, getPostHogQueryConfig } from "./posthog";

describe("PostHog query helpers", () => {
  it("extracts array rows from supported response shapes", () => {
    expect(extractRows({ results: [[1, "a"]] })).toEqual([[1, "a"]]);
    expect(extractRows({ result: [[2, "b"]] })).toEqual([[2, "b"]]);
    expect(extractRows({ query_status: { results: [[3, "c"]] } })).toEqual([[3, "c"]]);
  });

  it("wraps object rows defensively", () => {
    expect(extractRows({ results: [{ count: 1 }] })).toEqual([[{ count: 1 }]]);
  });

  it("reports missing server-side env vars", () => {
    expect(() => getPostHogQueryConfig({} as NodeJS.ProcessEnv)).toThrow(
      "Missing PostHog analytics env vars: POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID, POSTHOG_HOST",
    );
  });
});
