import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Facebook Data Deletion Request Callback.
 * Meta calls this endpoint when a user requests deletion of their data
 * (Facebook Settings → Apps and Websites → ClipProfit → Remove → Send a request
 * to delete data). We delete all stored Page connection data tied to the FB user.
 *
 * Spec: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 *
 * Meta posts form-encoded body with `signed_request` field. Format:
 *   <base64url-encoded HMAC-SHA256 signature>.<base64url-encoded JSON payload>
 * Signature must verify against FACEBOOK_APP_SECRET.
 *
 * Response must be JSON: { url, confirmation_code }
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const signedRequest = formData.get("signed_request");

  if (typeof signedRequest !== "string" || !signedRequest.includes(".")) {
    return NextResponse.json({ error: "missing signed_request" }, { status: 400 });
  }

  const [encodedSig, encodedPayload] = signedRequest.split(".");
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appSecret) {
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  const expectedSig = crypto
    .createHmac("sha256", appSecret)
    .update(encodedPayload)
    .digest("base64url");

  if (
    expectedSig.length !== encodedSig.length ||
    !crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(encodedSig))
  ) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: { user_id?: string };
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString());
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const fbUserId = payload.user_id;
  if (!fbUserId) {
    return NextResponse.json({ error: "missing user_id" }, { status: 400 });
  }

  await prisma.creatorFbConnection.deleteMany({
    where: { fbUserId },
  });

  const confirmationCode = crypto.randomBytes(16).toString("hex");

  return NextResponse.json({
    url: `https://app.clipprofit.com/api/auth/facebook/data-deletion/status?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
}
