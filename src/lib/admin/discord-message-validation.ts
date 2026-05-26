export const DISCORD_MESSAGE_MAX_CHARS = 2000;
export const DISCORD_MAX_FILES = 10;
export const DISCORD_MAX_REQUEST_BYTES = 25 * 1024 * 1024;

export type DiscordMessageValidationCode =
  | "missing_channel"
  | "invalid_channel"
  | "missing_payload"
  | "content_too_long"
  | "too_many_files"
  | "request_too_large";

export interface DiscordMessageValidationIssue {
  code: DiscordMessageValidationCode;
  message: string;
}

export interface DiscordMessageValidationInput {
  channelId: string;
  content: string;
  files: Array<{ size: number }>;
  validChannelIds?: readonly string[];
}

export function getDiscordMessageValidationIssues(
  input: DiscordMessageValidationInput,
): DiscordMessageValidationIssue[] {
  const issues: DiscordMessageValidationIssue[] = [];
  const channelId = input.channelId.trim();

  if (!channelId) {
    issues.push({ code: "missing_channel", message: "Choose a Discord channel." });
  } else if (input.validChannelIds && !input.validChannelIds.includes(channelId)) {
    issues.push({ code: "invalid_channel", message: "Choose a valid Discord channel." });
  }

  if (input.content.length > DISCORD_MESSAGE_MAX_CHARS) {
    issues.push({ code: "content_too_long", message: "Message content must be 2000 characters or fewer." });
  }

  if (!input.content.trim() && input.files.length === 0) {
    issues.push({ code: "missing_payload", message: "Add message content or at least one file." });
  }

  if (input.files.length > DISCORD_MAX_FILES) {
    issues.push({ code: "too_many_files", message: "Discord accepts up to 10 files per message." });
  }

  const totalSize = input.files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > DISCORD_MAX_REQUEST_BYTES) {
    issues.push({ code: "request_too_large", message: "Discord accepts up to 25 MiB per message." });
  }

  return issues;
}

export function validateDiscordMessageInput(input: DiscordMessageValidationInput): string | null {
  return getDiscordMessageValidationIssues(input)[0]?.message ?? null;
}
