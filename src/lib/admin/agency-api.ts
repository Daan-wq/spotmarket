import { NextResponse } from "next/server";
import { z } from "zod";

export const isoDate = z.preprocess((value) => {
  if (value === "" || value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  return value;
}, z.date().nullable());

export const optionalIsoDate = isoDate.optional();

export function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      if (typeof value === "bigint") return Number(value);
      return value;
    }),
  );
}

export function jsonError(error: unknown, label: string) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  if (error instanceof Error && error.message === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error instanceof Error && error.message === "Forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  console.error(label, error);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
