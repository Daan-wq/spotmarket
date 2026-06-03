import { describe, expect, it } from "vitest";
import { extractRows, getPostHogConfigurationStatus, getPostHogQueryConfig } from "./posthog";

function testEnv(overrides: Record<string, string>): NodeJS.ProcessEnv {
  return { NODE_ENV: "test", ...overrides };
}

describe("PostHog query helpers", () => {
  it("extracts array rows from supported response shapes", () => {
    expect(extractRows({ results: [[1, "a"]] })).toEqual([[1, "a"]]);
    expect(extractRows({ result: [[2, "b"]] })).toEqual([[2, "b"]]);
    expect(extractRows({ query_status: { results: [[3, "c"]] } })).toEqual([[3, "c"]]);
  });

  it("wraps object rows defensively", () => {
    expect(extractRows({ results: [{ count: 1 }] })).toEqual([[{ count: 1 }]]);
  });

  it("derives the private query host from the public EU ingestion host", () => {
    expect(getPostHogQueryConfig(testEnv({
      NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com/",
      POSTHOG_PERSONAL_API_KEY: "phx_test",
      POSTHOG_PROJECT_ID: "123",
    }))).toEqual({
      host: "https://eu.posthog.com",
      personalApiKey: "phx_test",
      projectId: "123",
    });
  });

  it("reports missing analytics env vars without flagging a derivable query host", () => {
    const status = getPostHogConfigurationStatus(testEnv({
      NEXT_PUBLIC_POSTHOG_KEY: "phc_test",
      NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com",
    }));

    expect(status).toEqual({
      isConfigured: false,
      host: "https://eu.posthog.com",
      projectId: null,
      missing: ["POSTHOG_PERSONAL_API_KEY", "POSTHOG_PROJECT_ID"],
    });
    expect(() => getPostHogQueryConfig(testEnv({
      NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com",
    }))).toThrow(
      "Missing PostHog analytics env vars: POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID",
    );
  });
});
