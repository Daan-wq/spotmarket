/**
 * Contracts package — single source of truth for cross-subsystem types.
 *
 * Frozen after foundation PR. Additions require a coordination PR.
 * No subsystem may import from another subsystem's `src/lib/<x>/` directly.
 * They communicate via these contracts + the event bus + Prisma reads.
 */

export * from "./events";
export * from "./metrics";
export * from "./signals";
export * from "./scores";
export * from "./notifications";
