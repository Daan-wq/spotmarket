import { describe, expect, it } from "vitest";
import { classifyMetaApiError, parseMetaApiError } from "./meta-api-error";

describe("Meta API error classification", () => {
  it("classifies invalid fields as API schema errors instead of broken tokens", () => {
    const error = parseMetaApiError(
      400,
      JSON.stringify({
        error: {
          message: "(#100) Tried accessing nonexisting field (views)",
          type: "OAuthException",
          code: 100,
          fbtrace_id: "trace-1",
        },
      }),
    );

    expect(classifyMetaApiError(error)).toBe("API_SCHEMA_ERROR");
    expect(error.providerCode).toBe(100);
    expect(error.providerType).toBe("OAuthException");
  });

  it("keeps token, permission, object, and rate-limit failures separate", () => {
    expect(classifyMetaApiError(parseMetaApiError(401, '{"error":{"code":190}}'))).toBe(
      "TOKEN_EXPIRED",
    );
    expect(
      classifyMetaApiError(
        parseMetaApiError(403, '{"error":{"code":10,"message":"Permission denied"}}'),
      ),
    ).toBe("PERMISSION_DENIED");
    expect(
      classifyMetaApiError(
        parseMetaApiError(
          400,
          '{"error":{"code":100,"message":"Unsupported get request. Object does not exist"}}',
        ),
      ),
    ).toBe("POST_NOT_FOUND");
    expect(classifyMetaApiError(parseMetaApiError(429, '{"error":{"code":4}}'))).toBe(
      "RATE_LIMITED",
    );
  });
});
