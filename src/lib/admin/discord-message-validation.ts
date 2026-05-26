export const DISCORD_MESSAGE_MAX_CHARS = 2000;
export const DISCORD_MAX_FILES = 10;
export const DISCORD_MAX_REQUEST_BYTES = 25 * 1024 * 1024;
export const DISCORD_MAX_LINK_BUTTONS = 25;
export const DISCORD_LINK_BUTTONS_PER_ROW = 5;
export const DISCORD_LINK_BUTTON_MAX_LABEL_CHARS = 80;
export const DISCORD_LINK_BUTTON_MAX_URL_CHARS = 512;

export type DiscordMessageValidationCode =
  | "missing_channel"
  | "invalid_channel"
  | "missing_payload"
  | "content_too_long"
  | "too_many_files"
  | "request_too_large"
  | "too_many_buttons"
  | "invalid_button";

export interface DiscordMessageValidationIssue {
  code: DiscordMessageValidationCode;
  message: string;
}

export interface DiscordMessageValidationInput {
  channelId: string;
  content: string;
  files: Array<{ size: number }>;
  buttons?: DiscordLinkButton[];
  validChannelIds?: readonly string[];
}

export interface DiscordLinkButton {
  label: string;
  url: string;
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

  if (!channelId) {
    issues.push({ code: "missing_channel", message: "Choose a Discord channel." });
  } else if (input.validChannelIds && !input.validChannelIds.includes(channelId)) {
    issues.push({ code: "invalid_channel", message: "Choose a valid Discord channel." });
  }

  if (input.content.length > DISCORD_MESSAGE_MAX_CHARS) {
    issues.push({ code: "content_too_long", message: "Message content must be 2000 characters or fewer." });
  }

  if (!input.content.trim() && input.files.length === 0 && buttons.length === 0) {
    issues.push({ code: "missing_payload", message: "Add message content, a file, or a URL button." });
  }

  if (input.files.length > DISCORD_MAX_FILES) {
    issues.push({ code: "too_many_files", message: "Discord accepts up to 10 files per message." });
  }

  const totalSize = input.files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > DISCORD_MAX_REQUEST_BYTES) {
    issues.push({ code: "request_too_large", message: "Discord accepts up to 25 MiB per message." });
  }

  issues.push(...getDiscordButtonValidationIssues(input.buttons ?? []));

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

function getDiscordButtonValidationIssues(buttons: DiscordLinkButton[]): DiscordMessageValidationIssue[] {
  const issues: DiscordMessageValidationIssue[] = [];
  const nonEmptyButtons = buttons.filter((button) => button.label.trim().length > 0 || button.url.trim().length > 0);

  if (nonEmptyButtons.length > DISCORD_MAX_LINK_BUTTONS) {
    issues.push({ code: "too_many_buttons", message: "Discord accepts up to 25 URL buttons per message." });
  }

  nonEmptyButtons.forEach((button, index) => {
    const label = button.label.trim();
    const url = button.url.trim();
    const number = index + 1;

    if (!label || !url) {
      issues.push({
        code: "invalid_button",
        message: `Button ${number} needs both a label and URL.`,
      });
      return;
    }

    if (label.length > DISCORD_LINK_BUTTON_MAX_LABEL_CHARS) {
      issues.push({
        code: "invalid_button",
        message: `Button ${number} label must be ${DISCORD_LINK_BUTTON_MAX_LABEL_CHARS} characters or fewer.`,
      });
    }

    if (url.length > DISCORD_LINK_BUTTON_MAX_URL_CHARS) {
      issues.push({
        code: "invalid_button",
        message: `Button ${number} URL must be ${DISCORD_LINK_BUTTON_MAX_URL_CHARS} characters or fewer.`,
      });
    }

    if (!isHttpUrl(url)) {
      issues.push({
        code: "invalid_button",
        message: `Button ${number} URL must start with http:// or https://.`,
      });
    }
  });

  return issues;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
