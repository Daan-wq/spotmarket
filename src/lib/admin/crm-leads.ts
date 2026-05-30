export const LEAD_STAGE_OPTIONS = [
  { value: "LEAD", label: "Nog te contacteren" },
  { value: "CONTACTED", label: "Gecontacteerd" },
  { value: "REPLIED", label: "Reactie ontvangen" },
  { value: "CALL_BOOKED", label: "Call gepland" },
  { value: "CALL_DONE", label: "Call geweest" },
  { value: "PROPOSAL_SENT", label: "Voorstel verstuurd" },
  { value: "NEGOTIATION", label: "In gesprek" },
  { value: "NURTURE_LATER", label: "Later opvolgen" },
  { value: "LOST", label: "Afgewezen" },
  { value: "WON", label: "Geconverteerd" },
] as const;

export const LEAD_STAGE_VALUES = LEAD_STAGE_OPTIONS.map((option) => option.value) as [
  LeadStage,
  ...LeadStage[],
];

export type LeadStage = (typeof LEAD_STAGE_OPTIONS)[number]["value"];

export const CONVERSION_BLOCKER_OPTIONS = [
  "Nog niet benaderd",
  "Wacht op reactie",
  "Timing later",
  "Budget/prijs",
  "Geen fit",
  "Beslisser ontbreekt",
  "Wil meer info",
  "Concurrent/agency",
  "Anders",
] as const;

export type ConversionBlocker = (typeof CONVERSION_BLOCKER_OPTIONS)[number];

export function leadStageLabel(stage: string | null | undefined) {
  return LEAD_STAGE_OPTIONS.find((option) => option.value === stage)?.label ?? "Onbekend";
}
