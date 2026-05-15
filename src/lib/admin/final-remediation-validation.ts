import { z } from "zod";
import { isoDate, optionalIsoDate } from "@/lib/admin/agency-api";

const platformValues = ["INSTAGRAM", "TIKTOK", "YOUTUBE_SHORTS", "FACEBOOK", "X"] as const;

export const pricingPackageSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(1000).optional().nullable(),
  price: z.coerce.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  platforms: z.array(z.enum(platformValues)).optional(),
  includedClips: z.coerce.number().int().min(0).optional().nullable(),
  includedViews: z.coerce.number().int().min(0).optional().nullable(),
  creatorRatePerClip: z.coerce.number().min(0).optional(),
  creatorCpv: z.coerce.number().min(0).optional(),
  businessCpv: z.coerce.number().min(0).optional(),
  marginPercent: z.coerce.number().min(0).max(100).optional(),
  isActive: z.coerce.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
  notes: z.string().max(5000).optional().nullable(),
});

export const contractDocumentSchema = z.object({
  title: z.string().min(1).max(180),
  type: z.string().min(1).max(80).optional(),
  status: z.string().min(1).max(80).optional(),
  owner: z.string().max(120).optional().nullable(),
  brandId: z.string().optional().nullable(),
  campaignId: z.string().optional().nullable(),
  effectiveAt: optionalIsoDate,
  expiresAt: optionalIsoDate,
  renewalAt: optionalIsoDate,
  externalUrl: z.string().url().optional().nullable().or(z.literal("")),
  storageKey: z.string().max(500).optional().nullable(),
  fileName: z.string().max(240).optional().nullable(),
  mimeType: z.string().max(120).optional().nullable(),
  fileSize: z.coerce.number().int().min(0).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export const weeklySnapshotSchema = z.object({
  weekStart: isoDate.refine((date) => date instanceof Date, "weekStart is required"),
  weekEnd: isoDate.refine((date) => date instanceof Date, "weekEnd is required"),
  status: z.string().min(1).max(80).optional(),
  notes: z.string().max(5000).optional().nullable(),
});

export type PricingPackageInput = z.infer<typeof pricingPackageSchema>;
export type ContractDocumentInput = z.infer<typeof contractDocumentSchema>;
export type WeeklySnapshotInput = z.infer<typeof weeklySnapshotSchema>;
