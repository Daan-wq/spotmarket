import { z } from "zod";
import { optionalIsoDate } from "@/lib/admin/agency-api";
import {
  CAMPAIGN_REPORT_SECTION_KEYS,
  DEFAULT_CAMPAIGN_REPORT_SECTIONS,
  normalizeEditorialContent,
  type CampaignReportSectionSettings,
} from "@/lib/admin/campaign-report-shared";

const reportStatus = z.enum(["DRAFT", "FINAL"]);
const textList = z.array(z.string().trim().min(1).max(500)).max(12);
const rawSectionSettings = z.record(z.string(), z.boolean());
const rawEditorialContent = z.record(z.string(), z.unknown());

function normalizeCampaignReportSectionSettings(value?: Record<string, boolean>): CampaignReportSectionSettings {
  const input = value ?? {};
  return CAMPAIGN_REPORT_SECTION_KEYS.reduce((acc, key) => {
    acc[key] = typeof input[key] === "boolean" ? input[key] : DEFAULT_CAMPAIGN_REPORT_SECTIONS[key];
    return acc;
  }, {} as CampaignReportSectionSettings);
}

const sectionSettingsSchema = rawSectionSettings
  .optional()
  .transform((value): CampaignReportSectionSettings => {
    return normalizeCampaignReportSectionSettings(value);
  });

const optionalSectionSettingsSchema = rawSectionSettings
  .optional()
  .transform((value): CampaignReportSectionSettings | undefined => {
    if (!value) return undefined;
    return normalizeCampaignReportSectionSettings(value);
  });

const optionalEditorialContentSchema = rawEditorialContent
  .optional()
  .transform((value) => {
    if (!value) return undefined;
    return normalizeEditorialContent(value);
  });

export const campaignReportCreateSchema = z.object({
  campaignId: z.string().min(1),
  title: z.string().trim().min(1).max(180).optional(),
  status: reportStatus.optional(),
  periodStart: optionalIsoDate,
  periodEnd: optionalIsoDate,
  executiveSummary: z.string().trim().max(5000).optional(),
  keyTakeaways: textList.optional(),
  learnings: textList.optional(),
  nextCampaignRecommendations: textList.optional(),
  sectionSettings: sectionSettingsSchema,
  editorialContent: optionalEditorialContentSchema,
});

export const campaignReportUpdateSchema = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  status: reportStatus.optional(),
  periodStart: optionalIsoDate,
  periodEnd: optionalIsoDate,
  executiveSummary: z.string().trim().max(5000).optional(),
  keyTakeaways: textList.optional(),
  learnings: textList.optional(),
  nextCampaignRecommendations: textList.optional(),
  sectionSettings: optionalSectionSettingsSchema,
  editorialContent: optionalEditorialContentSchema,
});

export type CampaignReportCreateInput = z.infer<typeof campaignReportCreateSchema>;
export type CampaignReportUpdateInput = z.infer<typeof campaignReportUpdateSchema>;
