import { z } from "zod";
import { optionalIsoDate } from "@/lib/admin/agency-api";

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

const stage = z.enum([
  "LEAD",
  "CONTACTED",
  "REPLIED",
  "CALL_BOOKED",
  "CALL_DONE",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
  "NURTURE_LATER",
]);

const priority = z.enum(["LOW", "MEDIUM", "HIGH"]);

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
  stage: stage.optional(),
  priority: priority.optional(),
  owner: createText(120),
  lastContactedAt: optionalIsoDate,
  nextFollowUpAt: optionalIsoDate,
  estimatedValue: z.coerce.number().min(0).optional(),
  probability: z.coerce.number().int().min(0).max(100).optional(),
  notes: createText(5000),
});

export const leadUpdateSchema = z.object({
  brandName: z.string().trim().min(1).max(180),
  groupName: updateText(180),
  category: updateText(120),
  subcategory: updateText(120),
  contactName: updateText(120),
  contactEmail: updateEmail,
  contactPhone: updateText(80),
  contactLinkedIn: updateText(300),
  website: updateText(300),
  source: updateText(120),
  stage: stage.optional(),
  priority: priority.optional(),
  owner: updateText(120),
  lastContactedAt: optionalIsoDate,
  nextFollowUpAt: optionalIsoDate,
  estimatedValue: z.coerce.number().min(0).optional(),
  probability: z.coerce.number().int().min(0).max(100).optional(),
  notes: updateText(5000),
});
