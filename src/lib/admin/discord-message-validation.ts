export const DISCORD_MESSAGE_MAX_CHARS = 2000;
export const DISCORD_MAX_FILES = 10;
export const DISCORD_MAX_REQUEST_BYTES = 25 * 1024 * 1024;
export const DISCORD_MAX_LINK_BUTTONS = 25;
export const DISCORD_LINK_BUTTONS_PER_ROW = 5;
export const DISCORD_LINK_BUTTON_MAX_LABEL_CHARS = 80;
export const DISCORD_LINK_BUTTON_MAX_URL_CHARS = 512;
export const DISCORD_MAX_EMBEDS = 10;
export const DISCORD_EMBED_TITLE_MAX_CHARS = 256;
export const DISCORD_EMBED_DESCRIPTION_MAX_CHARS = 4096;
export const DISCORD_EMBED_MAX_FIELDS = 25;
export const DISCORD_EMBED_FIELD_NAME_MAX_CHARS = 256;
export const DISCORD_EMBED_FIELD_VALUE_MAX_CHARS = 1024;
export const DISCORD_EMBED_FOOTER_TEXT_MAX_CHARS = 2048;
export const DISCORD_EMBED_AUTHOR_NAME_MAX_CHARS = 256;
export const DISCORD_EMBEDS_TOTAL_MAX_CHARS = 6000;

export type DiscordMessageValidationCode =
  | "missing_channel"
  | "invalid_channel"
  | "missing_payload"
  | "content_too_long"
  | "too_many_files"
  | "request_too_large"
  | "too_many_buttons"
  | "invalid_button"
  | "too_many_embeds"
  | "invalid_embed"
  | "embeds_too_long";

export interface DiscordMessageValidationIssue {
  code: DiscordMessageValidationCode;
  message: string;
}

export interface DiscordMessageValidationInput {
  channelId: string;
  content: string;
  files: Array<{ name?: string; size: number }>;
  buttons?: DiscordLinkButton[];
  embeds?: DiscordEmbedInput[];
  validChannelIds?: readonly string[];
}

export interface DiscordLinkButton {
  label: string;
  url: string;
}

export interface DiscordEmbedFieldInput {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbedInput {
  title?: string;
  url?: string;
  description?: string;
  color?: number | null;
  authorName?: string;
  authorIconUrl?: string;
  authorUrl?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  footerText?: string;
  footerIconUrl?: string;
  timestamp?: boolean | string | null;
  fields?: DiscordEmbedFieldInput[];
}

export interface DiscordEmbedPayload {
  title?: string;
  url?: string;
  description?: string;
  color?: number;
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
  };
  thumbnail?: {
    url: string;
  };
  image?: {
    url: string;
  };
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: {
    text: string;
    icon_url?: string;
  };
  timestamp?: string;
}

export interface DiscordActionRowComponent {
  type: 1;
  components: DiscordLinkButtonComponent[];
}

export interface DiscordLinkButtonComponent {
  type: 2;
  style: 5;
  label: string;
  url: string;
}

export function getDiscordMessageValidationIssues(
  input: DiscordMessageValidationInput,
): DiscordMessageValidationIssue[] {
  const issues: DiscordMessageValidationIssue[] = [];
  const channelId = input.channelId.trim();
  const buttons = normalizeDiscordLinkButtons(input.buttons ?? []);
  const embeds = normalizeDiscordEmbeds(input.embeds ?? []);

  if (!channelId) {
    issues.push({ code: "missing_channel", message: "Kies een Discord-kanaal." });
  } else if (input.validChannelIds && !input.validChannelIds.includes(channelId)) {
    issues.push({ code: "invalid_channel", message: "Kies een geldig Discord-kanaal." });
  }

  if (input.content.length > DISCORD_MESSAGE_MAX_CHARS) {
    issues.push({ code: "content_too_long", message: "Berichtinhoud mag maximaal 2000 tekens bevatten." });
  }

  if (!input.content.trim() && input.files.length === 0 && buttons.length === 0 && embeds.length === 0) {
    issues.push({ code: "missing_payload", message: "Voeg berichtinhoud, een embed, een bestand of een URL-knop toe." });
  }

  if (input.files.length > DISCORD_MAX_FILES) {
    issues.push({ code: "too_many_files", message: "Discord accepteert maximaal 10 bestanden per bericht." });
  }

  const totalSize = input.files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > DISCORD_MAX_REQUEST_BYTES) {
    issues.push({ code: "request_too_large", message: "Discord accepteert maximaal 25 MiB per bericht." });
  }

  issues.push(...getDiscordButtonValidationIssues(input.buttons ?? []));
  issues.push(...getDiscordEmbedValidationIssues(input.embeds ?? [], input.files));

  return issues;
}

export function validateDiscordMessageInput(input: DiscordMessageValidationInput): string | null {
  return getDiscordMessageValidationIssues(input)[0]?.message ?? null;
}

export function normalizeDiscordLinkButtons(buttons: DiscordLinkButton[]): DiscordLinkButton[] {
  return buttons
    .map((button) => ({
      label: button.label.trim(),
      url: button.url.trim(),
    }))
    .filter((button) => button.label.length > 0 && button.url.length > 0);
}

export function buildDiscordButtonComponents(buttons: DiscordLinkButton[]): DiscordActionRowComponent[] {
  const normalized = normalizeDiscordLinkButtons(buttons);
  const rows: DiscordActionRowComponent[] = [];
  for (let index = 0; index < normalized.length; index += DISCORD_LINK_BUTTONS_PER_ROW) {
    rows.push({
      type: 1,
      components: normalized.slice(index, index + DISCORD_LINK_BUTTONS_PER_ROW).map((button) => ({
        type: 2,
        style: 5,
        label: button.label,
        url: button.url,
      })),
    });
  }
  return rows;
}

export function normalizeDiscordEmbeds(embeds: DiscordEmbedInput[]): DiscordEmbedPayload[] {
  return embeds.map(cleanDiscordEmbed).filter((embed): embed is DiscordEmbedPayload => embed !== null);
}

export function getDiscordEmbedCharacterCount(embed: DiscordEmbedInput | DiscordEmbedPayload): number {
  const input = "authorName" in embed ? cleanDiscordEmbed(embed) : (embed as DiscordEmbedPayload);
  if (!input) return 0;
  return [
    input.title,
    input.description,
    input.author?.name,
    input.footer?.text,
    ...(input.fields ?? []).flatMap((field) => [field.name, field.value]),
  ].reduce((sum, value) => sum + (value?.length ?? 0), 0);
}

function cleanDiscordEmbed(embed: DiscordEmbedInput): DiscordEmbedPayload | null {
  const title = trimOptional(embed.title);
  const url = trimOptional(embed.url);
  const description = trimOptional(embed.description);
  const authorName = trimOptional(embed.authorName);
  const authorIconUrl = trimOptional(embed.authorIconUrl);
  const authorUrl = trimOptional(embed.authorUrl);
  const thumbnailUrl = trimOptional(embed.thumbnailUrl);
  const imageUrl = trimOptional(embed.imageUrl);
  const footerText = trimOptional(embed.footerText);
  const footerIconUrl = trimOptional(embed.footerIconUrl);
  const fields = normalizeDiscordEmbedFields(embed.fields ?? []);

  const payload: DiscordEmbedPayload = {};
  if (title) payload.title = title;
  if (url && title) payload.url = url;
  if (description) payload.description = description;
  if (typeof embed.color === "number" && Number.isInteger(embed.color) && embed.color >= 0 && embed.color <= 0xffffff) {
    payload.color = embed.color;
  }
  if (authorName) {
    payload.author = {
      name: authorName,
      ...(authorUrl ? { url: authorUrl } : {}),
      ...(authorIconUrl ? { icon_url: authorIconUrl } : {}),
    };
  }
  if (thumbnailUrl) payload.thumbnail = { url: thumbnailUrl };
  if (imageUrl) payload.image = { url: imageUrl };
  if (fields.length > 0) payload.fields = fields;
  if (footerText) {
    payload.footer = {
      text: footerText,
      ...(footerIconUrl ? { icon_url: footerIconUrl } : {}),
    };
  }
  const timestamp = normalizeDiscordTimestamp(embed.timestamp);
  if (timestamp) payload.timestamp = timestamp;

  return Object.keys(payload).length > 0 ? payload : null;
}

function normalizeDiscordEmbedFields(fields: DiscordEmbedFieldInput[]) {
  return fields
    .map((field) => ({
      name: field.name.trim(),
      value: field.value.trim(),
      inline: field.inline === true,
    }))
    .filter((field) => field.name.length > 0 && field.value.length > 0);
}

function normalizeDiscordTimestamp(value: DiscordEmbedInput["timestamp"]): string | null {
  if (value === true) return new Date().toISOString();
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function getDiscordEmbedValidationIssues(
  embeds: DiscordEmbedInput[],
  files: Array<{ name?: string }> = [],
): DiscordMessageValidationIssue[] {
  const issues: DiscordMessageValidationIssue[] = [];
  const uploadedFileNames = new Set(
    files
      .map((file) => file.name?.trim())
      .filter((name): name is string => Boolean(name)),
  );
  if (embeds.length > DISCORD_MAX_EMBEDS) {
    issues.push({ code: "too_many_embeds", message: `Discord accepteert maximaal ${DISCORD_MAX_EMBEDS} embeds per bericht.` });
  }

  embeds.forEach((embed, index) => {
    const number = index + 1;
    const title = embed.title?.trim() ?? "";
    const url = embed.url?.trim() ?? "";
    const description = embed.description?.trim() ?? "";
    const authorName = embed.authorName?.trim() ?? "";
    const authorIconUrl = embed.authorIconUrl?.trim() ?? "";
    const authorUrl = embed.authorUrl?.trim() ?? "";
    const thumbnailUrl = embed.thumbnailUrl?.trim() ?? "";
    const imageUrl = embed.imageUrl?.trim() ?? "";
    const footerText = embed.footerText?.trim() ?? "";
    const footerIconUrl = embed.footerIconUrl?.trim() ?? "";
    const fields = embed.fields ?? [];

    if (title.length > DISCORD_EMBED_TITLE_MAX_CHARS) {
      issues.push({ code: "invalid_embed", message: `Embed ${number}: titel mag maximaal ${DISCORD_EMBED_TITLE_MAX_CHARS} tekens bevatten.` });
    }
    if (url && !title) {
      issues.push({ code: "invalid_embed", message: `Embed ${number}: titel-URL heeft een embedtitel nodig.` });
    }
    if (url && !isHttpUrl(url)) {
      issues.push({ code: "invalid_embed", message: `Embed ${number}: titel-URL moet beginnen met http:// of https://.` });
    }
    if (description.length > DISCORD_EMBED_DESCRIPTION_MAX_CHARS) {
      issues.push({
        code: "invalid_embed",
        message: `Embed ${number}: beschrijving mag maximaal ${DISCORD_EMBED_DESCRIPTION_MAX_CHARS} tekens bevatten.`,
      });
    }
    if (typeof embed.color === "number" && (!Number.isInteger(embed.color) || embed.color < 0 || embed.color > 0xffffff)) {
      issues.push({ code: "invalid_embed", message: `Embed ${number}: kleur moet een geldige Discord-kleur zijn.` });
    }
    if (authorName.length > DISCORD_EMBED_AUTHOR_NAME_MAX_CHARS) {
      issues.push({ code: "invalid_embed", message: `Embed ${number}: auteurnaam mag maximaal ${DISCORD_EMBED_AUTHOR_NAME_MAX_CHARS} tekens bevatten.` });
    }
    if ((authorIconUrl || authorUrl) && !authorName) {
      issues.push({ code: "invalid_embed", message: `Embed ${number}: auteur-URL's hebben een auteurnaam nodig.` });
    }
    for (const [label, value] of [
      ["thumbnail-URL", thumbnailUrl],
      ["afbeeldings-URL", imageUrl],
    ] as const) {
      if (!value) continue;
      const attachmentName = getDiscordAttachmentFileName(value);
      if (!isHttpUrl(value) && !attachmentName) {
        issues.push({ code: "invalid_embed", message: `Embed ${number}: ${label} moet beginnen met http://, https:// of attachment://.` });
      } else if (attachmentName && !uploadedFileNames.has(attachmentName)) {
        issues.push({ code: "invalid_embed", message: `Embed ${number}: upload voor ${label} ontbreekt. Upload de afbeelding opnieuw voordat je verzendt.` });
      }
    }
    for (const [label, value] of [
      ["auteuricoon-URL", authorIconUrl],
      ["footericoon-URL", footerIconUrl],
    ] as const) {
      if (value && !isHttpUrl(value)) {
        issues.push({ code: "invalid_embed", message: `Embed ${number}: ${label} moet beginnen met http:// of https://.` });
      }
    }
    if (authorUrl && !isHttpUrl(authorUrl)) {
      issues.push({ code: "invalid_embed", message: `Embed ${number}: auteur-URL moet beginnen met http:// of https://.` });
    }
    if (footerText.length > DISCORD_EMBED_FOOTER_TEXT_MAX_CHARS) {
      issues.push({ code: "invalid_embed", message: `Embed ${number}: footertekst mag maximaal ${DISCORD_EMBED_FOOTER_TEXT_MAX_CHARS} tekens bevatten.` });
    }
    if (footerIconUrl && !footerText) {
      issues.push({ code: "invalid_embed", message: `Embed ${number}: footericoon heeft footertekst nodig.` });
    }
    const touchedFields = fields.filter((field) => field.name.trim().length > 0 || field.value.trim().length > 0);
    if (touchedFields.length > DISCORD_EMBED_MAX_FIELDS) {
      issues.push({ code: "invalid_embed", message: `Embed ${number}: maximaal ${DISCORD_EMBED_MAX_FIELDS} velden toegestaan.` });
    }
    touchedFields.forEach((field, fieldIndex) => {
      const fieldNumber = fieldIndex + 1;
      const name = field.name.trim();
      const value = field.value.trim();
      if (!name || !value) {
        issues.push({ code: "invalid_embed", message: `Embed ${number}: veld ${fieldNumber} heeft een naam en waarde nodig.` });
        return;
      }
      if (name.length > DISCORD_EMBED_FIELD_NAME_MAX_CHARS) {
        issues.push({
          code: "invalid_embed",
          message: `Embed ${number}: veld ${fieldNumber} naam mag maximaal ${DISCORD_EMBED_FIELD_NAME_MAX_CHARS} tekens bevatten.`,
        });
      }
      if (value.length > DISCORD_EMBED_FIELD_VALUE_MAX_CHARS) {
        issues.push({
          code: "invalid_embed",
          message: `Embed ${number}: veld ${fieldNumber} waarde mag maximaal ${DISCORD_EMBED_FIELD_VALUE_MAX_CHARS} tekens bevatten.`,
        });
      }
    });
  });

  const totalCharacters = normalizeDiscordEmbeds(embeds).reduce((sum, embed) => sum + getDiscordEmbedCharacterCount(embed), 0);
  if (totalCharacters > DISCORD_EMBEDS_TOTAL_MAX_CHARS) {
    issues.push({
      code: "embeds_too_long",
      message: `Discord-embeds mogen samen maximaal ${DISCORD_EMBEDS_TOTAL_MAX_CHARS} tekens bevatten.`,
    });
  }

  return issues;
}

function trimOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function getDiscordButtonValidationIssues(buttons: DiscordLinkButton[]): DiscordMessageValidationIssue[] {
  const issues: DiscordMessageValidationIssue[] = [];
  const nonEmptyButtons = buttons.filter((button) => button.label.trim().length > 0 || button.url.trim().length > 0);

  if (nonEmptyButtons.length > DISCORD_MAX_LINK_BUTTONS) {
    issues.push({ code: "too_many_buttons", message: "Discord accepteert maximaal 25 URL-knoppen per bericht." });
  }

  nonEmptyButtons.forEach((button, index) => {
    const label = button.label.trim();
    const url = button.url.trim();
    const number = index + 1;

    if (!label || !url) {
      issues.push({
        code: "invalid_button",
        message: `Knop ${number} heeft een label en URL nodig.`,
      });
      return;
    }

    if (label.length > DISCORD_LINK_BUTTON_MAX_LABEL_CHARS) {
      issues.push({
        code: "invalid_button",
        message: `Knop ${number}: label mag maximaal ${DISCORD_LINK_BUTTON_MAX_LABEL_CHARS} tekens bevatten.`,
      });
    }

    if (url.length > DISCORD_LINK_BUTTON_MAX_URL_CHARS) {
      issues.push({
        code: "invalid_button",
        message: `Knop ${number}: URL mag maximaal ${DISCORD_LINK_BUTTON_MAX_URL_CHARS} tekens bevatten.`,
      });
    }

    if (!isHttpUrl(url)) {
      issues.push({
        code: "invalid_button",
        message: `Knop ${number}: URL moet beginnen met http:// of https://.`,
      });
    }
  });

  return issues;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isAttachmentUrl(value: string): boolean {
  return /^attachment:\/\/[^/\\?#]+$/.test(value.trim());
}

export function attachmentFileNameFromUrl(value: string): string | null {
  const prefix = "attachment://";
  const trimmed = value.trim();
  if (!isAttachmentUrl(trimmed)) return null;
  return trimmed.slice(prefix.length);
}

function getDiscordAttachmentFileName(value: string): string | null {
  return attachmentFileNameFromUrl(value);
}
