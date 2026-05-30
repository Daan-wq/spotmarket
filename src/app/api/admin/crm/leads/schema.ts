import { z } from "zod";
import { optionalIsoDate } from "@/lib/admin/agency-api";
import { CONVERSION_BLOCKER_OPTIONS, LEAD_STAGE_VALUES } from "@/lib/admin/crm-leads";

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const createText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().max(max).optional().nullable());

const updateText = (max: number) =>
  z.preprocess(emptyToNull, z.string().max(max).optional().nullable());

const createEmail = z.preprocess(emptyToUndefined, z.string().email().optional().nullable());
const updateEmail = z.preprocess(emptyToNull, z.string().email().optional().nullable());

const stage = z.enum(LEAD_STAGE_VALUES);
const priority = z.enum(["LOW", "MEDIUM", "HIGH"]);
const createConversionBlocker = z.preprocess(
  emptyToUndefined,
  z.enum(CONVERSION_BLOCKER_OPTIONS).optional().nullable(),
);
const updateConversionBlocker = z.preprocess(
  emptyToNull,
  z.enum(CONVERSION_BLOCKER_OPTIONS).optional().nullable(),
);

export const leadCreateSchema = z.object({
  brandName: z.string().trim().min(1).max(180),
  groupName: createText(180),
  category: createText(120),
  subcategory: createText(120),
  contactName: createText(120),
  contactEmail: createEmail,
  contactPhone: createText(80),
  contactLinkedIn: createText(300),
  website: createText(300),
  source: createText(120),
  conversionBlocker: createConversionBlocker,
  stage: stage.optional(),
  priority: priority.optional(),
  owner: createText(120),
  nextAction: createText(300),
  lastContactedAt: optionalIsoDate,
  nextFollowUpAt: optionalIsoDate,
  estimatedValue: z.coerce.number().min(0).optional(),
  probability: z.coerce.number().int().min(0).max(100).optional(),
  notes: createText(5000),
});

export const leadUpdateSchema = z.object({
  brandName: z.string().trim().min(1).max(180).optional(),
  groupName: updateText(180),
  category: updateText(120),
  subcategory: updateText(120),
  contactName: updateText(120),
  contactEmail: updateEmail,
  contactPhone: updateText(80),
  contactLinkedIn: updateText(300),
  website: updateText(300),
  source: updateText(120),
  conversionBlocker: updateConversionBlocker,
  stage: stage.optional(),
  priority: priority.optional(),
  owner: updateText(120),
  nextAction: updateText(300),
  lastContactedAt: optionalIsoDate,
  nextFollowUpAt: optionalIsoDate,
  archivedAt: optionalIsoDate,
  estimatedValue: z.coerce.number().min(0).optional(),
  probability: z.coerce.number().int().min(0).max(100).optional(),
  notes: updateText(5000),
});
