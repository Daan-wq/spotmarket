"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bold,
  Code2,
  CodeXml,
  Copy,
  Eye,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListIndentIncrease,
  ListOrdered,
  Paperclip,
  Pilcrow,
  Plus,
  Quote,
  RefreshCw,
  Save,
  Send,
  Slash,
  Smile,
  Strikethrough,
  TextQuote,
  Trash2,
  Underline,
} from "lucide-react";
import { DiscordMarkdownPreview } from "@/components/admin/discord-markdown-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SectionHeader } from "@/components/ui/page";
import type { DiscordChannelGroup, DiscordEmoji } from "@/lib/admin/discord";
import {
  DISCORD_MAX_FILES as MAX_FILES,
  DISCORD_MAX_LINK_BUTTONS as MAX_BUTTONS,
  DISCORD_MAX_EMBEDS as MAX_EMBEDS,
  DISCORD_MAX_REQUEST_BYTES as MAX_TOTAL_BYTES,
  DISCORD_MESSAGE_MAX_CHARS as MAX_CONTENT,
  buildDiscordButtonComponents,
  getDiscordEmbedCharacterCount,
  normalizeDiscordEmbeds,
  normalizeDiscordLinkButtons,
  getDiscordMessageValidationIssues,
  isHttpUrl,
} from "@/lib/admin/discord-message-validation";
import type { DiscordEmbedFieldInput, DiscordEmbedInput, DiscordLinkButton } from "@/lib/admin/discord-message-validation";
import {
  escapeDiscordMarkdown,
  isBlockFormatActive,
  isInlineFormatActive,
  isLinePrefixActive,
  toggleBlockFormat,
  toggleInlineFormat,
  toggleLinePrefix,
  type FormattingResult,
  type SelectionRange,
} from "@/lib/admin/discord-editor-formatting";
import { cn } from "@/lib/cn";

interface DiscordTemplate {
  id: string;
  name: string;
  kind: "DRAFT" | "TEMPLATE";
  messageMode?: DiscordMessageMode;
  channelId?: string | null;
  content: string;
  embeds?: DiscordEmbedInput[];
  buttons: DiscordLinkButton[];
  tags: string[];
  updatedAt: string;
}

interface LoadedTemplateIdentity {
  id: string;
  name: string;
  kind: "DRAFT" | "TEMPLATE";
}

interface TemplatesResponse {
  templates: DiscordTemplate[];
}

interface ChannelsResponse {
  groups: DiscordChannelGroup[];
}

interface EmojisResponse {
  emojis: DiscordEmoji[];
}

type DiscordMessageMode = "CONTENT" | "EMBED" | "CONTENT_EMBED";
type EmbedImageField = "thumbnailUrl" | "imageUrl";

interface EmbedMediaFile {
  file: File;
  previewUrl: string;
  attachmentName: string;
}

const HEADER_PREFIX_PATTERN = /^#{1,3}\s+/;
const ORDERED_PREFIX_PATTERN = /^\s*\d+\.\s+/;
const DEFAULT_EMBED_COLOR = 0x5865f2;
const EMBED_IMAGE_FIELDS: EmbedImageField[] = ["thumbnailUrl", "imageUrl"];

export function DiscordMessageComposer() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const embedMediaSequenceRef = useRef(0);
  const embedMediaFilesRef = useRef<Record<string, EmbedMediaFile>>({});
  const [channelGroups, setChannelGroups] = useState<DiscordChannelGroup[]>([]);
  const [emojis, setEmojis] = useState<DiscordEmoji[]>([]);
  const [templates, setTemplates] = useState<DiscordTemplate[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [messageMode, setMessageMode] = useState<DiscordMessageMode>("CONTENT");
  const [content, setContent] = useState("");
  const [embeds, setEmbeds] = useState<DiscordEmbedInput[]>([]);
  const [embedMediaFiles, setEmbedMediaFiles] = useState<Record<string, EmbedMediaFile>>({});
  const [linkButtons, setLinkButtons] = useState<DiscordLinkButton[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [loadedTemplateIdentity, setLoadedTemplateIdentity] = useState<LoadedTemplateIdentity | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateTags, setTemplateTags] = useState("");
  const [templateKind, setTemplateKind] = useState<"DRAFT" | "TEMPLATE">("DRAFT");
  const [emojiQuery, setEmojiQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sendIntent, setSendIntent] = useState<"test" | "publish">("publish");
  const [selection, setSelection] = useState<SelectionRange>({ start: 0, end: 0 });
  const [activeInlineFormat, setActiveInlineFormat] = useState<string | null>(null);

  useEffect(() => {
    void refreshAll();
  }, []);

  useEffect(() => {
    embedMediaFilesRef.current = embedMediaFiles;
  }, [embedMediaFiles]);

  useEffect(() => {
    return () => revokeEmbedMediaPreviews(embedMediaFilesRef.current);
  }, []);

  const allChannels = useMemo(
    () => channelGroups.flatMap((group) => group.channels.map((channel) => ({ ...channel, groupName: group.name }))),
    [channelGroups],
  );
  const validChannelIds = useMemo(() => allChannels.map((channel) => channel.id), [allChannels]);
  const selectedChannel = allChannels.find((channel) => channel.id === selectedChannelId) ?? null;
  const activeContent = messageMode === "EMBED" ? "" : content;
  const activeEmbeds = useMemo(() => (messageMode === "CONTENT" ? [] : embeds), [embeds, messageMode]);
  const activeEmbedMediaAttachments = useMemo(
    () => getReferencedEmbedMediaFiles(activeEmbeds, embedMediaFiles),
    [activeEmbeds, embedMediaFiles],
  );
  const validationFiles = useMemo(
    () => toDiscordValidationFiles(files, activeEmbedMediaAttachments),
    [activeEmbedMediaAttachments, files],
  );
  const totalFileSize = validationFiles.reduce((sum, file) => sum + file.size, 0);
  const previewEmbeds = useMemo(
    () => resolveEmbedAttachmentPreviews(activeEmbeds, embedMediaFiles),
    [activeEmbeds, embedMediaFiles],
  );
  const cleanedEmbeds = useMemo(() => normalizeDiscordEmbeds(activeEmbeds), [activeEmbeds]);
  const embedCharacterCount = cleanedEmbeds.reduce((sum, embed) => sum + getDiscordEmbedCharacterCount(embed), 0);
  const completeLinkButtons = useMemo(() => normalizeDiscordLinkButtons(linkButtons), [linkButtons]);
  const previewPayload = useMemo(
    () => ({
      content: activeContent || undefined,
      embeds: cleanedEmbeds.length > 0 ? cleanedEmbeds : undefined,
      components: completeLinkButtons.length > 0 ? buildDiscordButtonComponents(completeLinkButtons) : undefined,
    }),
    [activeContent, cleanedEmbeds, completeLinkButtons],
  );
  const filteredEmojis = emojis.filter((emoji) =>
    emoji.name.toLowerCase().includes(emojiQuery.trim().toLowerCase()),
  );
  const sendValidationIssues = useMemo(
    () =>
      getDiscordMessageValidationIssues({
        channelId: selectedChannelId,
        content: activeContent,
        files: validationFiles,
        embeds: activeEmbeds,
        buttons: linkButtons,
        validChannelIds: loading ? undefined : validChannelIds,
      }),
    [activeContent, activeEmbeds, linkButtons, loading, selectedChannelId, validChannelIds, validationFiles],
  );
  const primarySendIssue = loading
    ? { message: "Discord channels and emojis are still loading." }
    : (sendValidationIssues[0] ?? null);

  async function refreshAll() {
    setLoading(true);
    setError(null);
    try {
      const [channelsRes, emojisRes, templatesRes] = await Promise.all([
        fetch("/api/admin/discord/channels"),
        fetch("/api/admin/discord/emojis"),
        fetch("/api/admin/discord/templates"),
      ]);
      const channelsBody = (await channelsRes.json().catch(() => ({}))) as Partial<ChannelsResponse> & { error?: string };
      const emojisBody = (await emojisRes.json().catch(() => ({}))) as Partial<EmojisResponse> & { error?: string };
      const templatesBody = (await templatesRes.json().catch(() => ({}))) as Partial<TemplatesResponse> & { error?: string };
      if (!channelsRes.ok) throw new Error(channelsBody.error ?? "Could not load Discord channels.");
      if (!emojisRes.ok) throw new Error(emojisBody.error ?? "Could not load Discord emojis.");
      if (!templatesRes.ok) throw new Error(templatesBody.error ?? "Could not load templates.");
      setChannelGroups(channelsBody.groups ?? []);
      setEmojis(emojisBody.emojis ?? []);
      setTemplates(templatesBody.templates ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Discord data.");
    } finally {
      setLoading(false);
    }
  }

  function currentSelection(): SelectionRange {
    const textarea = textareaRef.current;
    if (!textarea) return { start: content.length, end: content.length };
    return { start: textarea.selectionStart, end: textarea.selectionEnd };
  }

  function syncSelection() {
    setSelection(currentSelection());
  }

  function applyFormatting(result: FormattingResult) {
    setContent(result.content);
    setSelection(result.selection);
    setActiveInlineFormat(result.activeInlineFormat);
    window.setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(result.selection.start, result.selection.end);
    }, 0);
  }

  function applyWrap(prefix: string, suffix = prefix, fallback = "text") {
    applyFormatting(toggleInlineFormat({ content, selection: currentSelection(), prefix, suffix, fallback, activeInlineFormat }));
  }

  function applyLinePrefix(prefix: string, removePattern?: RegExp) {
    applyFormatting(toggleLinePrefix({ content, selection: currentSelection(), prefix, removePattern }));
  }

  function applyBlockSnippet(prefix: string, suffix: string, fallback: string) {
    applyFormatting(toggleBlockFormat({ content, selection: currentSelection(), prefix, suffix, fallback }));
  }

  function escapeMarkdownSelection() {
    const fallback = "escaped markdown, not bold";
    const range = currentSelection();
    const selected = content.slice(range.start, range.end) || fallback;
    const escaped = escapeDiscordMarkdown(selected);
    applyFormatting({
      content: `${content.slice(0, range.start)}${escaped}${content.slice(range.end)}`,
      selection: { start: range.start, end: range.start + escaped.length },
      activeInlineFormat: null,
    });
  }

  function insertText(value: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((current) => `${current}${value}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${content.slice(0, start)}${value}${content.slice(end)}`;
    setContent(next);
    setSelection({ start: start + value.length, end: start + value.length });
    setActiveInlineFormat(null);
    window.setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + value.length, start + value.length);
    }, 0);
  }

  function handleFiles(selected: FileList | null) {
    if (!selected) return;
    const next = [...files, ...Array.from(selected)];
    setFiles(next);
    const issue = getDiscordMessageValidationIssues({
      channelId: selectedChannelId,
      content: activeContent,
      files: toDiscordValidationFiles(next, activeEmbedMediaAttachments),
      embeds: activeEmbeds,
      buttons: linkButtons,
      validChannelIds: loading ? undefined : validChannelIds,
    })[0];
    setError(issue?.message ?? null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  }

  function handleEmbedImageFile(embedIndex: number, field: EmbedImageField, selected: FileList | null) {
    const file = selected?.[0];
    if (!file) return;
    if (file.type && !file.type.startsWith("image/")) {
      setError("Choose an image file for the embed.");
      return;
    }

    const attachmentName = createEmbedAttachmentName(field, file, ++embedMediaSequenceRef.current);
    const previewUrl = URL.createObjectURL(file);
    const previousName = getAttachmentNameFromUrl(embeds[embedIndex]?.[field]);
    updateEmbed(embedIndex, { [field]: `attachment://${attachmentName}` });
    setEmbedMediaFiles((current) => {
      const next = { ...current, [attachmentName]: { file, previewUrl, attachmentName } };
      if (previousName && current[previousName] && !isAttachmentNameUsedElsewhere(embeds, previousName, embedIndex, field)) {
        URL.revokeObjectURL(current[previousName].previewUrl);
        delete next[previousName];
      }
      return next;
    });
    setError(null);
  }

  function clearEmbedImage(embedIndex: number, field: EmbedImageField) {
    const previousName = getAttachmentNameFromUrl(embeds[embedIndex]?.[field]);
    updateEmbed(embedIndex, { [field]: "" });
    if (!previousName || isAttachmentNameUsedElsewhere(embeds, previousName, embedIndex, field)) return;
    setEmbedMediaFiles((current) => {
      const existing = current[previousName];
      if (!existing) return current;
      URL.revokeObjectURL(existing.previewUrl);
      const next = { ...current };
      delete next[previousName];
      return next;
    });
  }

  function clearAllEmbedMediaFiles() {
    setEmbedMediaFiles((current) => {
      revokeEmbedMediaPreviews(current);
      return {};
    });
  }

  function pruneEmbedMediaFiles(nextEmbeds: DiscordEmbedInput[]) {
    const referencedNames = getAttachmentNamesFromEmbeds(nextEmbeds);
    setEmbedMediaFiles((current) => {
      const next: Record<string, EmbedMediaFile> = {};
      for (const [name, media] of Object.entries(current)) {
        if (referencedNames.has(name)) {
          next[name] = media;
        } else {
          URL.revokeObjectURL(media.previewUrl);
        }
      }
      return next;
    });
  }

  function clearSentEmbedMediaFiles(sentAttachments: EmbedMediaFile[]) {
    if (sentAttachments.length === 0) return;
    const sentNames = new Set(sentAttachments.map((attachment) => attachment.attachmentName));
    setEmbeds((current) =>
      current.map((embed) => {
        const next = { ...embed };
        for (const field of EMBED_IMAGE_FIELDS) {
          const attachmentName = getAttachmentNameFromUrl(next[field]);
          if (attachmentName && sentNames.has(attachmentName)) next[field] = "";
        }
        return next;
      }),
    );
    setEmbedMediaFiles((current) => {
      const next = { ...current };
      for (const name of sentNames) {
        if (!next[name]) continue;
        URL.revokeObjectURL(next[name].previewUrl);
        delete next[name];
      }
      return next;
    });
  }

  function addLinkButton() {
    if (linkButtons.length >= MAX_BUTTONS) {
      setError(`Discord accepts up to ${MAX_BUTTONS} URL buttons per message.`);
      return;
    }
    setLinkButtons((current) => [...current, { label: "", url: "" }]);
  }

  function updateLinkButton(index: number, field: keyof DiscordLinkButton, value: string) {
    setLinkButtons((current) =>
      current.map((button, buttonIndex) => (buttonIndex === index ? { ...button, [field]: value } : button)),
    );
  }

  function removeLinkButton(index: number) {
    setLinkButtons((current) => current.filter((_, buttonIndex) => buttonIndex !== index));
  }

  function addEmbed(embed: DiscordEmbedInput = createEmptyEmbed()) {
    if (embeds.length >= MAX_EMBEDS) {
      setError(`Discord accepts up to ${MAX_EMBEDS} embeds per message.`);
      return;
    }
    setEmbeds((current) => [...current, embed]);
    if (messageMode === "CONTENT") setMessageMode(content.trim() ? "CONTENT_EMBED" : "EMBED");
  }

  function updateEmbed(index: number, patch: Partial<DiscordEmbedInput>) {
    setEmbeds((current) => current.map((embed, embedIndex) => (embedIndex === index ? { ...embed, ...patch } : embed)));
  }

  function duplicateEmbed(index: number) {
    const source = embeds[index];
    if (!source) return;
    addEmbed({
      ...source,
      fields: source.fields?.map((field) => ({ ...field })) ?? [],
    });
  }

  function removeEmbed(index: number) {
    const nextEmbeds = embeds.filter((_, embedIndex) => embedIndex !== index);
    setEmbeds(nextEmbeds);
    pruneEmbedMediaFiles(nextEmbeds);
  }

  function moveEmbed(index: number, direction: -1 | 1) {
    setEmbeds((current) => moveItem(current, index, index + direction));
  }

  function applyEmbedPreset(preset: EmbedPreset) {
    const next = createPresetEmbed(preset);
    setEmbeds([next]);
    setMessageMode(content.trim() ? "CONTENT_EMBED" : "EMBED");
    setStatus(`${preset.label} embed preset loaded`);
  }

  function addEmbedField(embedIndex: number) {
    const embed = embeds[embedIndex];
    if ((embed.fields?.length ?? 0) >= 25) {
      setError("Discord accepts up to 25 fields per embed.");
      return;
    }
    updateEmbed(embedIndex, { fields: [...(embed.fields ?? []), { name: "", value: "", inline: false }] });
  }

  function updateEmbedField(embedIndex: number, fieldIndex: number, patch: Partial<DiscordEmbedFieldInput>) {
    const embed = embeds[embedIndex];
    const fields = embed.fields ?? [];
    updateEmbed(embedIndex, {
      fields: fields.map((field, index) => (index === fieldIndex ? { ...field, ...patch } : field)),
    });
  }

  function removeEmbedField(embedIndex: number, fieldIndex: number) {
    const embed = embeds[embedIndex];
    updateEmbed(embedIndex, { fields: (embed.fields ?? []).filter((_, index) => index !== fieldIndex) });
  }

  function moveEmbedField(embedIndex: number, fieldIndex: number, direction: -1 | 1) {
    const embed = embeds[embedIndex];
    updateEmbed(embedIndex, { fields: moveItem(embed.fields ?? [], fieldIndex, fieldIndex + direction) });
  }

  function loadTemplate(template: DiscordTemplate) {
    setTemplateId(template.id);
    setLoadedTemplateIdentity({ id: template.id, name: template.name, kind: template.kind });
    setTemplateName(template.name);
    setTemplateKind(template.kind);
    setTemplateTags(template.tags.join(", "));
    setMessageMode(template.messageMode ?? inferMessageMode(template.content, template.embeds ?? []));
    if (template.channelId) setSelectedChannelId(template.channelId);
    setContent(template.content);
    setEmbeds(removeLocalEmbedAttachmentUrls(template.embeds ?? []));
    clearAllEmbedMediaFiles();
    setLinkButtons(template.buttons ?? []);
    setSelection({ start: 0, end: template.content.length });
    setActiveInlineFormat(null);
    setStatus(`Loaded ${template.name}`);
  }

  function newTemplate() {
    setTemplateId(null);
    setLoadedTemplateIdentity(null);
    setTemplateName("");
    setTemplateTags("");
    setTemplateKind("DRAFT");
    setMessageMode("CONTENT");
    setContent("");
    setEmbeds([]);
    clearAllEmbedMediaFiles();
    setLinkButtons([]);
    setFiles([]);
    setSelection({ start: 0, end: 0 });
    setActiveInlineFormat(null);
    setStatus("Composer cleared");
  }

  function inlineActive(prefix: string, suffix = prefix) {
    return isInlineFormatActive(content, selection, prefix, suffix, activeInlineFormat);
  }

  function lineActive(prefix: string, removePattern?: RegExp) {
    return isLinePrefixActive(content, selection, prefix, removePattern);
  }

  function blockActive(prefix: string, suffix: string) {
    return isBlockFormatActive(content, selection, prefix, suffix);
  }

  async function saveTemplate(kind: "DRAFT" | "TEMPLATE") {
    setError(null);
    setStatus(null);
    if (hasEmbedAttachmentReferences(activeEmbeds)) {
      setError("Uploaded embed images are only available for this send. Clear or replace them before saving a draft or template.");
      return;
    }
    setSaving(true);
    const payload = {
      name: templateName.trim() || `${kind === "DRAFT" ? "Draft" : "Template"} ${new Date().toLocaleDateString()}`,
      kind,
      messageMode,
      channelId: selectedChannelId || null,
      content: activeContent,
      embeds: activeEmbeds,
      buttons: completeLinkButtons,
      tags: templateTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    try {
      const shouldPatchLoadedTemplate = shouldPatchLoadedDiscordTemplate(loadedTemplateIdentity, payload.name, kind);
      const templateEndpoint =
        shouldPatchLoadedTemplate && loadedTemplateIdentity
          ? `/api/admin/discord/templates/${loadedTemplateIdentity.id}`
          : "/api/admin/discord/templates";
      const response = await fetch(
        templateEndpoint,
        {
          method: shouldPatchLoadedTemplate ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Could not save template.");
      const saved = body.template as DiscordTemplate;
      setTemplateId(saved.id);
      setLoadedTemplateIdentity({ id: saved.id, name: saved.name, kind: saved.kind });
      setTemplateName(saved.name);
      setTemplateKind(saved.kind);
      setTemplateTags(saved.tags.join(", "));
      setStatus(kind === "DRAFT" ? "Draft saved" : "Template saved");
      await refreshTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save template.");
    } finally {
      setSaving(false);
    }
  }

  async function refreshTemplates() {
    const response = await fetch("/api/admin/discord/templates");
    const body = (await response.json().catch(() => ({}))) as Partial<TemplatesResponse> & { error?: string };
    if (!response.ok) throw new Error(body.error ?? "Could not load templates.");
    setTemplates(body.templates ?? []);
  }

  async function deleteTemplate(id: string) {
    setError(null);
    const response = await fetch(`/api/admin/discord/templates/${id}`, { method: "DELETE" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error ?? "Could not delete template.");
      return;
    }
    if (templateId === id) newTemplate();
    await refreshTemplates();
    setStatus("Template deleted");
  }

  function openSendConfirm(intent: "test" | "publish") {
    setError(null);
    if (primarySendIssue) return setError(primarySendIssue.message);
    setSendIntent(intent);
    setConfirmOpen(true);
  }

  async function sendMessage() {
    if (primarySendIssue) {
      setError(primarySendIssue.message);
      return;
    }
    setSending(true);
    setError(null);
    setStatus(null);
    const payload = new FormData();
    payload.append("channelId", selectedChannelId);
    payload.append("sendMode", sendIntent);
    payload.append("content", activeContent);
    payload.append("embeds", JSON.stringify(activeEmbeds));
    payload.append("buttons", JSON.stringify(completeLinkButtons));
    if (templateId) payload.append("templateId", templateId);
    for (const file of files) payload.append("files", file);
    for (const attachment of activeEmbedMediaAttachments) {
      payload.append("files", attachment.file, attachment.attachmentName);
    }

    try {
      const response = await fetch("/api/admin/discord/messages", {
        method: "POST",
        body: payload,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Could not send Discord message.");
      setConfirmOpen(false);
      setFiles([]);
      clearSentEmbedMediaFiles(activeEmbedMediaAttachments);
      setStatus(`${sendIntent === "test" ? "Test message" : "Message"} sent: ${body.message?.url ?? body.message?.id ?? "Discord"}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send Discord message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-5">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <label>
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Channel</span>
              <select
                value={selectedChannelId}
                onChange={(event) => setSelectedChannelId(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500"
                disabled={loading}
              >
                <option value="">Choose channel</option>
                {channelGroups.map((group) => (
                  <optgroup key={group.id ?? "uncategorized"} label={group.name}>
                    {group.channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        #{channel.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Status</span>
              <div className="mt-2 flex h-11 items-center justify-between rounded-xl border border-neutral-200 px-3 text-sm text-neutral-600">
                <span>{loading ? "Loading Discord..." : selectedChannel ? `#${selectedChannel.name}` : "No channel"}</span>
                <button type="button" onClick={refreshAll} className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100" title="Refresh Discord data">
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-2">
            <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
              <ModeButton
                label="Normal message"
                description="Only Markdown content"
                active={messageMode === "CONTENT"}
                onClick={() => setMessageMode("CONTENT")}
              />
              <ModeButton
                label="With embed"
                description="Only embed payload"
                active={messageMode === "EMBED"}
                onClick={() => {
                  setMessageMode("EMBED");
                  if (embeds.length === 0) addEmbed();
                }}
              />
              <ModeButton
                label="Normal + embed"
                description="Text above embeds"
                active={messageMode === "CONTENT_EMBED"}
                onClick={() => {
                  setMessageMode("CONTENT_EMBED");
                  if (embeds.length === 0) addEmbed();
                }}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-2">
            <ToolbarButton label="Big header" pressed={lineActive("# ")} onClick={() => applyLinePrefix("# ", HEADER_PREFIX_PATTERN)}><Heading1 className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Medium header" pressed={lineActive("## ")} onClick={() => applyLinePrefix("## ", HEADER_PREFIX_PATTERN)}><Heading2 className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Small header" pressed={lineActive("### ")} onClick={() => applyLinePrefix("### ", HEADER_PREFIX_PATTERN)}><Heading3 className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Subtext" pressed={lineActive("-# ")} onClick={() => applyLinePrefix("-# ")}><Pilcrow className="h-4 w-4" /></ToolbarButton>
            <ToolbarDivider />
            <ToolbarButton label="Bold" pressed={inlineActive("**")} onClick={() => applyWrap("**")}><Bold className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Italic" pressed={inlineActive("*")} onClick={() => applyWrap("*")}><Italic className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Underline" pressed={inlineActive("__")} onClick={() => applyWrap("__")}><Underline className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Bold italic" pressed={inlineActive("***")} onClick={() => applyWrap("***")}><span className="text-[11px] font-black italic">BI</span></ToolbarButton>
            <ToolbarButton label="Underlined italic" pressed={inlineActive("__*", "*__")} onClick={() => applyWrap("__*", "*__")}><span className="text-[11px] font-semibold italic underline">I</span></ToolbarButton>
            <ToolbarButton label="Underlined bold" pressed={inlineActive("__**", "**__")} onClick={() => applyWrap("__**", "**__")}><span className="text-[11px] font-black underline">B</span></ToolbarButton>
            <ToolbarButton label="Underlined bold italic" pressed={inlineActive("__***", "***__")} onClick={() => applyWrap("__***", "***__")}><span className="text-[11px] font-black italic underline">BI</span></ToolbarButton>
            <ToolbarButton label="Strike" pressed={inlineActive("~~")} onClick={() => applyWrap("~~")}><Strikethrough className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Spoiler" pressed={inlineActive("||")} onClick={() => applyWrap("||", "||", "spoiler")}><Eye className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Code" pressed={inlineActive("`")} onClick={() => applyWrap("`", "`", "code")}><Code2 className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Code block" pressed={blockActive("```js\n", "\n```")} onClick={() => applyBlockSnippet("```js\n", "\n```", "// code block with syntax highlighting\nconsole.log(\"Hello\");")}><CodeXml className="h-4 w-4" /></ToolbarButton>
            <ToolbarDivider />
            <ToolbarButton label="Quote" pressed={lineActive("> ")} onClick={() => applyLinePrefix("> ")}><Quote className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Multiline quote" pressed={blockActive(">>> ", "")} onClick={() => applyBlockSnippet(">>> ", "", "multi-line quote\nThis keeps quoting everything after it.")}><TextQuote className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="List" pressed={lineActive("- ")} onClick={() => applyLinePrefix("- ")}><List className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Numbered list" pressed={lineActive("1. ", ORDERED_PREFIX_PATTERN)} onClick={() => applyLinePrefix("1. ", ORDERED_PREFIX_PATTERN)}><ListOrdered className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Indented bullet" pressed={lineActive("  - ")} onClick={() => applyLinePrefix("  - ")}><ListIndentIncrease className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Link" pressed={inlineActive("[", "](https://example.com)")} onClick={() => applyWrap("[", "](https://example.com)", "link")}><Link2 className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Escape markdown" onClick={escapeMarkdownSelection}><Slash className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Attach files" onClick={() => fileInputRef.current?.click()}><Paperclip className="h-4 w-4" /></ToolbarButton>
          </div>

          <label className="mt-4 block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Main message content</span>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                setSelection({ start: event.target.selectionStart, end: event.target.selectionEnd });
              }}
              onSelect={syncSelection}
              onClick={syncSelection}
              onKeyUp={syncSelection}
              rows={13}
              className="mt-2 w-full resize-y rounded-xl border border-neutral-200 px-4 py-3 text-sm leading-6 outline-none focus:border-neutral-500"
              placeholder="Write Discord Markdown here..."
            />
          </label>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
            <span className={activeContent.length > MAX_CONTENT ? "font-semibold text-red-600" : undefined}>
              {activeContent.length} / {MAX_CONTENT} characters sent
            </span>
            {messageMode === "EMBED" && content.trim() ? <span>Text is saved locally here but not sent in embed-only mode.</span> : null}
            <span>
              {validationFiles.length} / {MAX_FILES} files
              {activeEmbedMediaAttachments.length > 0 ? ` (${activeEmbedMediaAttachments.length} embedded)` : ""} - {formatBytes(totalFileSize)} / {formatBytes(MAX_TOTAL_BYTES)}
            </span>
          </div>

          <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-neutral-950">Embeds</p>
                <p className="text-xs text-neutral-500">
                  {cleanedEmbeds.length} / {MAX_EMBEDS} embeds ready - {embedCharacterCount} / 6000 embed characters
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addEmbed()}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 transition hover:border-neutral-300 hover:text-neutral-950"
                >
                  <Plus className="h-4 w-4" />
                  Add embed
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {EMBED_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyEmbedPreset(preset)}
                  className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-950"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {messageMode === "CONTENT" ? (
              <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-neutral-500">
                Embed payload is off in normal-message mode. Switch to an embed mode to send embeds.
              </p>
            ) : null}

            {embeds.length > 0 ? (
              <div className="mt-3 space-y-3">
                {embeds.map((embed, embedIndex) => (
                  <div key={embedIndex} className="rounded-xl border border-neutral-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-neutral-950">Embed {embedIndex + 1}</p>
                      <div className="flex gap-1">
                        <IconButton label="Move embed up" onClick={() => moveEmbed(embedIndex, -1)} disabled={embedIndex === 0}>
                          <ArrowUp className="h-4 w-4" />
                        </IconButton>
                        <IconButton label="Move embed down" onClick={() => moveEmbed(embedIndex, 1)} disabled={embedIndex === embeds.length - 1}>
                          <ArrowDown className="h-4 w-4" />
                        </IconButton>
                        <IconButton label="Duplicate embed" onClick={() => duplicateEmbed(embedIndex)}>
                          <Copy className="h-4 w-4" />
                        </IconButton>
                        <IconButton label="Delete embed" onClick={() => removeEmbed(embedIndex)}>
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_150px]">
                      <input
                        value={embed.title ?? ""}
                        onChange={(event) => updateEmbed(embedIndex, { title: event.target.value })}
                        placeholder="Embed title"
                        maxLength={256}
                        className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500"
                      />
                      <label className="flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-500">
                        <span>Color</span>
                        <input
                          type="color"
                          value={numberToHex(embed.color ?? DEFAULT_EMBED_COLOR)}
                          onChange={(event) => updateEmbed(embedIndex, { color: hexToNumber(event.target.value) })}
                          className="h-6 w-10 cursor-pointer border-0 bg-transparent p-0"
                        />
                      </label>
                    </div>
                    <input
                      value={embed.url ?? ""}
                      onChange={(event) => updateEmbed(embedIndex, { url: event.target.value })}
                      placeholder="Title URL, optional"
                      className="mt-2 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500"
                    />
                    <textarea
                      value={embed.description ?? ""}
                      onChange={(event) => updateEmbed(embedIndex, { description: event.target.value })}
                      placeholder="Embed description with Discord Markdown..."
                      rows={5}
                      maxLength={4096}
                      className="mt-2 w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-neutral-500"
                    />

                    <details className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Author, media and footer</summary>
                      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                        <input value={embed.authorName ?? ""} onChange={(event) => updateEmbed(embedIndex, { authorName: event.target.value })} placeholder="Author name" className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500" />
                        <input value={embed.authorIconUrl ?? ""} onChange={(event) => updateEmbed(embedIndex, { authorIconUrl: event.target.value })} placeholder="Author icon URL" className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500" />
                        <input value={embed.authorUrl ?? ""} onChange={(event) => updateEmbed(embedIndex, { authorUrl: event.target.value })} placeholder="Author URL" className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500" />
                        <div className="grid grid-cols-1 gap-2 md:col-span-3 xl:grid-cols-2">
                          <EmbedImageUpload
                            label="Thumbnail"
                            value={embed.thumbnailUrl ?? ""}
                            media={getEmbedMediaFile(embed.thumbnailUrl, embedMediaFiles)}
                            onSelect={(selected) => handleEmbedImageFile(embedIndex, "thumbnailUrl", selected)}
                            onClear={() => clearEmbedImage(embedIndex, "thumbnailUrl")}
                          />
                          <EmbedImageUpload
                            label="Large image"
                            value={embed.imageUrl ?? ""}
                            media={getEmbedMediaFile(embed.imageUrl, embedMediaFiles)}
                            onSelect={(selected) => handleEmbedImageFile(embedIndex, "imageUrl", selected)}
                            onClear={() => clearEmbedImage(embedIndex, "imageUrl")}
                          />
                        </div>
                        <label className="flex min-h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700">
                          <input type="checkbox" checked={embed.timestamp === true} onChange={(event) => updateEmbed(embedIndex, { timestamp: event.target.checked })} />
                          Current timestamp
                        </label>
                        <input value={embed.footerText ?? ""} onChange={(event) => updateEmbed(embedIndex, { footerText: event.target.value })} placeholder="Footer text" className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500 md:col-span-2" />
                        <input value={embed.footerIconUrl ?? ""} onChange={(event) => updateEmbed(embedIndex, { footerIconUrl: event.target.value })} placeholder="Footer icon URL" className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500" />
                      </div>
                    </details>

                    <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Fields</p>
                        <button type="button" onClick={() => addEmbedField(embedIndex)} className="inline-flex h-8 items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 text-xs font-semibold text-neutral-600 hover:text-neutral-950">
                          <Plus className="h-3.5 w-3.5" />
                          Add field
                        </button>
                      </div>
                      {(embed.fields ?? []).length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {(embed.fields ?? []).map((field, fieldIndex) => (
                            <div key={fieldIndex} className="grid grid-cols-1 gap-2 rounded-lg border border-neutral-200 bg-white p-2 md:grid-cols-[minmax(0,1fr)_88px_104px]">
                              <input value={field.name} onChange={(event) => updateEmbedField(embedIndex, fieldIndex, { name: event.target.value })} placeholder="Field name" maxLength={256} className="h-10 rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
                              <label className="flex h-10 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm text-neutral-600">
                                <input type="checkbox" checked={field.inline === true} onChange={(event) => updateEmbedField(embedIndex, fieldIndex, { inline: event.target.checked })} />
                                Inline
                              </label>
                              <div className="flex items-center justify-end gap-1">
                                <IconButton label="Move field up" onClick={() => moveEmbedField(embedIndex, fieldIndex, -1)} disabled={fieldIndex === 0}><ArrowUp className="h-4 w-4" /></IconButton>
                                <IconButton label="Move field down" onClick={() => moveEmbedField(embedIndex, fieldIndex, 1)} disabled={fieldIndex === (embed.fields?.length ?? 0) - 1}><ArrowDown className="h-4 w-4" /></IconButton>
                                <IconButton label="Remove field" onClick={() => removeEmbedField(embedIndex, fieldIndex)}><Trash2 className="h-4 w-4" /></IconButton>
                              </div>
                              <textarea value={field.value} onChange={(event) => updateEmbedField(embedIndex, fieldIndex, { value: event.target.value })} placeholder="Field value" rows={2} maxLength={1024} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-500 md:col-span-3" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-neutral-500">No fields yet.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-neutral-950">URL buttons</p>
                <p className="text-xs text-neutral-500">{completeLinkButtons.length} / {MAX_BUTTONS} buttons ready</p>
              </div>
              <button
                type="button"
                onClick={addLinkButton}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 transition hover:border-neutral-300 hover:text-neutral-950"
              >
                <Plus className="h-4 w-4" />
                Add URL button
              </button>
            </div>
            {linkButtons.length > 0 ? (
              <div className="mt-3 space-y-2">
                {linkButtons.map((button, index) => (
                  <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)_34px]">
                    <input
                      value={button.label}
                      onChange={(event) => updateLinkButton(index, "label", event.target.value)}
                      placeholder="Button label"
                      maxLength={80}
                      className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500"
                    />
                    <input
                      value={button.url}
                      onChange={(event) => updateLinkButton(index, "url", event.target.value)}
                      placeholder="https://example.com"
                      className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeLinkButton(index)}
                      className="flex h-10 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-200 hover:text-red-600"
                      aria-label={`Remove URL button ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <p
            aria-live="polite"
            className={cn(
              "mt-2 rounded-xl px-3 py-2 text-xs font-medium",
              primarySendIssue ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700",
            )}
          >
            {primarySendIssue?.message ?? "Ready to preview and send."}
          </p>
          {sendValidationIssues.length > 1 ? (
            <ul className="mt-2 space-y-1 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {sendValidationIssues.slice(1, 6).map((issue, index) => (
                <li key={`${issue.code}-${index}`}>{issue.message}</li>
              ))}
            </ul>
          ) : null}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => handleFiles(event.target.files)}
          />

          {files.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
              {files.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-950">{file.name}</p>
                    <p className="text-xs text-neutral-500">{file.type || "file"} - {formatBytes(file.size)}</p>
                  </div>
                  <button type="button" onClick={() => removeFile(index)} className="rounded-md p-1 text-neutral-500 hover:bg-neutral-200" aria-label={`Remove ${file.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => openSendConfirm("test")}>
              <Send className="h-4 w-4" />
              Send test
            </Button>
            <Button type="button" onClick={() => openSendConfirm("publish")}>
              <Send className="h-4 w-4" />
              Preview and send
            </Button>
            <Button type="button" variant="outline" isPending={saving} onClick={() => saveTemplate("DRAFT")}>
              <Save className="h-4 w-4" />
              Save draft
            </Button>
            <Button type="button" variant="outline" isPending={saving} onClick={() => saveTemplate("TEMPLATE")}>
              <Save className="h-4 w-4" />
              Save template
            </Button>
            <Button type="button" variant="ghost" onClick={newTemplate}>Clear</Button>
          </div>

          {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
          {status ? <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{status}</p> : null}
        </div>

        <section className="xl:sticky xl:top-4 xl:self-start">
          <SectionHeader title="Live preview" description="Mobile Discord preview for the exact payload that will be sent." />
          <DiscordMarkdownPreview content={activeContent} embeds={previewEmbeds} emojis={emojis} buttons={completeLinkButtons} frame="mobile" />
        </section>
        </div>
      </section>

      <aside className="space-y-5">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <SectionHeader title="Template details" />
          <div className="space-y-3">
            <input
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              placeholder="Template name"
              className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500"
            />
            <select
              value={templateKind}
              onChange={(event) => setTemplateKind(event.target.value as "DRAFT" | "TEMPLATE")}
              className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500"
            >
              <option value="DRAFT">Draft</option>
              <option value="TEMPLATE">Template</option>
            </select>
            <input
              value={templateTags}
              onChange={(event) => setTemplateTags(event.target.value)}
              placeholder="Tags, comma separated"
              className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <SectionHeader title="Custom emojis" action={<Smile className="h-4 w-4 text-neutral-400" />} />
          <input
            value={emojiQuery}
            onChange={(event) => setEmojiQuery(event.target.value)}
            placeholder="Search emojis"
            className="mb-3 h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500"
          />
          <div className="grid max-h-56 grid-cols-6 gap-2 overflow-y-auto pr-1">
            {filteredEmojis.map((emoji) => (
              <button
                key={emoji.id}
                type="button"
                onClick={() => insertText(emoji.syntax)}
                title={`:${emoji.name}:`}
                className={cn(
                  "flex h-10 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 transition hover:bg-neutral-100",
                  !emoji.available && "opacity-40",
                )}
              >
                <img src={emoji.url} alt={`:${emoji.name}:`} className="h-6 w-6" />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <SectionHeader title="Drafts and templates" />
          <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {templates.length === 0 ? (
              <p className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-500">No drafts or templates yet.</p>
            ) : (
              templates.map((template) => (
                <div key={template.id} className="rounded-xl border border-neutral-200 p-3">
                  <button type="button" onClick={() => loadTemplate(template)} className="block w-full text-left">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-neutral-950">{template.name}</p>
                      <Badge variant={template.kind === "TEMPLATE" ? "active" : "neutral"}>{template.kind.toLowerCase()}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-500">
                      {template.content || (template.embeds?.length ? `${template.embeds.length} embed(s)` : "Empty draft")}
                    </p>
                    {template.tags.length > 0 ? <p className="mt-2 text-[11px] text-neutral-400">{template.tags.join(", ")}</p> : null}
                  </button>
                  <button type="button" onClick={() => deleteTemplate(template.id)} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-neutral-400 hover:text-red-600">
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <details className="rounded-2xl border border-neutral-200 bg-white p-5">
          <summary className="cursor-pointer text-sm font-semibold text-neutral-950">Preview payload</summary>
          <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-neutral-950 p-3 text-[11px] leading-5 text-neutral-100">
            {JSON.stringify(previewPayload, null, 2)}
          </pre>
        </details>
      </aside>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={sendIntent === "test" ? "Confirm Discord test" : "Confirm Discord send"}
        description={selectedChannel ? `Posting to #${selectedChannel.name} from the ClipProfit bot.` : undefined}
        size="lg"
        className="max-w-3xl"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)} disabled={sending}>Cancel</Button>
            <Button type="button" onClick={sendMessage} isPending={sending}>
              <Send className="h-4 w-4" />
              {sendIntent === "test" ? "Send test" : "Send now"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-5">
            <ConfirmStat label="Channel" value={selectedChannel ? `#${selectedChannel.name}` : "-"} />
            <ConfirmStat label="Content" value={`${activeContent.length} / ${MAX_CONTENT}`} />
            <ConfirmStat label="Embeds" value={`${cleanedEmbeds.length} (${embedCharacterCount} chars)`} />
            <ConfirmStat label="Files" value={`${validationFiles.length} (${formatBytes(totalFileSize)})`} />
            <ConfirmStat label="Buttons" value={`${completeLinkButtons.length} / ${MAX_BUTTONS}`} />
          </div>
          <DiscordMarkdownPreview
            content={activeContent}
            embeds={previewEmbeds}
            emojis={emojis}
            buttons={completeLinkButtons}
            frame="mobile"
            className="max-h-[520px] overflow-y-auto"
          />
        </div>
      </Dialog>
    </div>
  );
}

export function shouldPatchLoadedDiscordTemplate(
  loaded: LoadedTemplateIdentity | null,
  nextName: string,
  nextKind: "DRAFT" | "TEMPLATE",
) {
  return Boolean(
    loaded &&
      loaded.kind === nextKind &&
      normalizeTemplateName(loaded.name) === normalizeTemplateName(nextName),
  );
}

function EmbedImageUpload({
  label,
  value,
  media,
  onSelect,
  onClear,
}: {
  label: string;
  value: string;
  media: EmbedMediaFile | null;
  onSelect: (selected: FileList | null) => void;
  onClear: () => void;
}) {
  const previewSrc = media?.previewUrl ?? (value && isHttpUrl(value) ? value : null);
  const isMissingUpload = Boolean(value && getAttachmentNameFromUrl(value) && !media);
  const detail = media
    ? `${media.file.type || "image"} - ${formatBytes(media.file.size)}`
    : previewSrc
      ? "External image"
      : isMissingUpload
        ? "Re-upload required"
        : "No image selected";

  return (
    <div className="min-w-0 rounded-lg border border-neutral-200 bg-white p-2.5">
      <div className="grid min-w-0 grid-cols-[48px_minmax(0,1fr)] gap-3">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-neutral-100">
          {previewSrc ? (
            <img src={previewSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <Paperclip className="h-4 w-4 text-neutral-400" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-neutral-950">{label}</p>
              <p className={cn("mt-0.5 truncate text-xs", isMissingUpload ? "text-amber-700" : "text-neutral-500")}>{detail}</p>
            </div>
            {value ? (
              <button
                type="button"
                onClick={onClear}
                className="shrink-0 rounded-md p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-red-600"
                aria-label={`Clear ${label.toLowerCase()}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="mt-2 flex min-w-0 items-center gap-2">
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 text-xs font-semibold text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-950">
              <Paperclip className="h-3.5 w-3.5" />
              Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  onSelect(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            {media ? <span className="min-w-0 truncate text-xs text-neutral-400">{media.attachmentName}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function getReferencedEmbedMediaFiles(embeds: DiscordEmbedInput[], mediaFiles: Record<string, EmbedMediaFile>): EmbedMediaFile[] {
  const seen = new Set<string>();
  const result: EmbedMediaFile[] = [];
  for (const name of getAttachmentNamesFromEmbeds(embeds)) {
    if (seen.has(name)) continue;
    const media = mediaFiles[name];
    if (!media) continue;
    seen.add(name);
    result.push(media);
  }
  return result;
}

function toDiscordValidationFiles(files: File[], embedMediaFiles: EmbedMediaFile[]) {
  return [
    ...files.map((file) => ({ name: file.name, size: file.size })),
    ...embedMediaFiles.map((media) => ({ name: media.attachmentName, size: media.file.size })),
  ];
}

function resolveEmbedAttachmentPreviews(
  embeds: DiscordEmbedInput[],
  mediaFiles: Record<string, EmbedMediaFile>,
): DiscordEmbedInput[] {
  return embeds.map((embed) => {
    const next = { ...embed };
    for (const field of EMBED_IMAGE_FIELDS) {
      const attachmentName = getAttachmentNameFromUrl(embed[field]);
      const media = attachmentName ? mediaFiles[attachmentName] : null;
      if (media) next[field] = media.previewUrl;
    }
    return next;
  });
}

function getEmbedMediaFile(value: string | undefined, mediaFiles: Record<string, EmbedMediaFile>): EmbedMediaFile | null {
  const attachmentName = getAttachmentNameFromUrl(value);
  return attachmentName ? (mediaFiles[attachmentName] ?? null) : null;
}

function hasEmbedAttachmentReferences(embeds: DiscordEmbedInput[]) {
  return getAttachmentNamesFromEmbeds(embeds).size > 0;
}

function removeLocalEmbedAttachmentUrls(embeds: DiscordEmbedInput[]): DiscordEmbedInput[] {
  return embeds.map((embed) => {
    const next = { ...embed };
    for (const field of EMBED_IMAGE_FIELDS) {
      if (getAttachmentNameFromUrl(next[field])) next[field] = "";
    }
    return next;
  });
}

function getAttachmentNamesFromEmbeds(embeds: DiscordEmbedInput[]) {
  const names = new Set<string>();
  for (const embed of embeds) {
    for (const field of EMBED_IMAGE_FIELDS) {
      const attachmentName = getAttachmentNameFromUrl(embed[field]);
      if (attachmentName) names.add(attachmentName);
    }
  }
  return names;
}

function isAttachmentNameUsedElsewhere(
  embeds: DiscordEmbedInput[],
  attachmentName: string,
  skipEmbedIndex: number,
  skipField: EmbedImageField,
) {
  return embeds.some((embed, embedIndex) =>
    EMBED_IMAGE_FIELDS.some((field) => {
      if (embedIndex === skipEmbedIndex && field === skipField) return false;
      return getAttachmentNameFromUrl(embed[field]) === attachmentName;
    }),
  );
}

function getAttachmentNameFromUrl(value: string | undefined): string | null {
  const prefix = "attachment://";
  if (!value?.startsWith(prefix)) return null;
  const name = value.slice(prefix.length).trim();
  return name || null;
}

function createEmbedAttachmentName(field: EmbedImageField, file: File, sequence: number) {
  const safeName = sanitizeAttachmentFileName(file.name || defaultImageFileName(file.type));
  const dotIndex = safeName.lastIndexOf(".");
  const base = dotIndex > 0 ? safeName.slice(0, dotIndex) : safeName;
  const extension = dotIndex > 0 ? safeName.slice(dotIndex) : extensionFromImageType(file.type);
  return `embed-${sequence}-${field === "thumbnailUrl" ? "thumb" : "image"}-${base}`.slice(0, 90) + extension;
}

function sanitizeAttachmentFileName(value: string) {
  const safe = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return safe || "image.png";
}

function defaultImageFileName(type: string) {
  return `image${extensionFromImageType(type)}`;
}

function extensionFromImageType(type: string) {
  if (type === "image/jpeg") return ".jpg";
  if (type === "image/webp") return ".webp";
  if (type === "image/gif") return ".gif";
  return ".png";
}

function revokeEmbedMediaPreviews(mediaFiles: Record<string, EmbedMediaFile>) {
  Object.values(mediaFiles).forEach((media) => URL.revokeObjectURL(media.previewUrl));
}

function normalizeTemplateName(name: string) {
  return name.trim().toLowerCase();
}

interface EmbedPreset {
  id: string;
  label: string;
  title: string;
  description: string;
  color: number;
}

const EMBED_PRESETS: EmbedPreset[] = [
  {
    id: "rules",
    label: "Rules",
    title: "📋 ClipProfit Server Regels",
    color: DEFAULT_EMBED_COLOR,
    description:
      "Lees deze regels voordat je deelneemt - we houden het simpel.\n\n" +
      "1. Respecteer elkaar\n" +
      "2. Geen pesterijen, discriminatie of toxic gedrag.\n" +
      "3. Geen ongewenste DM's\n" +
      "4. Geen random priveberichten of promoties naar andere leden.\n" +
      "5. Geen spam\n" +
      "6. Geen links of zelfpromotie.\n" +
      "7. Blijf on-topic\n" +
      "8. Gebruik het juiste kanaal voor het juiste onderwerp.\n" +
      "9. Enkel echte resultaten\n\n" +
      "⚠️ Overtredingen: waarschuwing -> mute -> ban\n" +
      "❓ Vragen? Stel ze in het juiste help-kanaal.",
  },
  {
    id: "announcement",
    label: "Announcement",
    title: "📣 Nieuwe update",
    color: 0x3498db,
    description: "Schrijf hier de belangrijkste update, wat er verandert, en wat leden nu moeten doen.",
  },
  {
    id: "campaign",
    label: "Campaign update",
    title: "🚨 Nieuwe campagne",
    color: 0xf1c40f,
    description: "**Campagne details**\nPlatform:\nCPM:\nMinimum views:\nMaximum views:\n\n**Links**\nVoeg de juiste links toe.",
  },
  {
    id: "warning",
    label: "Warning",
    title: "⚠️ Belangrijke waarschuwing",
    color: 0xe74c3c,
    description: "Leg kort uit wat niet de bedoeling is en welke actie er volgt als dit doorgaat.",
  },
  {
    id: "success",
    label: "Success",
    title: "✅ Resultaat behaald",
    color: 0x2ecc71,
    description: "Vat het resultaat samen en geef de volgende stap.",
  },
  {
    id: "faq",
    label: "FAQ / info",
    title: "ℹ️ Veelgestelde vragen",
    color: 0x5865f2,
    description: "**Vraag:**\nAntwoord.\n\n**Vraag:**\nAntwoord.",
  },
];

function createEmptyEmbed(): DiscordEmbedInput {
  return {
    title: "",
    url: "",
    description: "",
    color: DEFAULT_EMBED_COLOR,
    authorName: "",
    authorIconUrl: "",
    authorUrl: "",
    thumbnailUrl: "",
    imageUrl: "",
    footerText: "",
    footerIconUrl: "",
    timestamp: false,
    fields: [],
  };
}

function createPresetEmbed(preset: EmbedPreset): DiscordEmbedInput {
  return {
    ...createEmptyEmbed(),
    title: preset.title,
    description: preset.description,
    color: preset.color,
    footerText: "ClipProfit",
    timestamp: true,
  };
}

function inferMessageMode(content: string, embeds: DiscordEmbedInput[]): DiscordMessageMode {
  const hasContent = content.trim().length > 0;
  const hasEmbeds = normalizeDiscordEmbeds(embeds).length > 0;
  if (hasContent && hasEmbeds) return "CONTENT_EMBED";
  if (hasEmbeds) return "EMBED";
  return "CONTENT";
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function numberToHex(value: number): string {
  return `#${Math.max(0, Math.min(0xffffff, value)).toString(16).padStart(6, "0")}`;
}

function hexToNumber(value: string): number {
  return Number.parseInt(value.replace("#", ""), 16);
}

function ModeButton({
  label,
  description,
  active,
  onClick,
}: {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-lg border px-3 py-2 text-left transition",
        active ? "border-neutral-900 bg-white shadow-sm" : "border-neutral-200 bg-white/70 hover:border-neutral-300",
      )}
    >
      <span className="block text-sm font-semibold text-neutral-950">{label}</span>
      <span className="mt-0.5 block text-xs text-neutral-500">{description}</span>
    </button>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function ToolbarButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-white hover:text-neutral-950",
        pressed && "bg-white text-neutral-950 shadow-sm ring-1 ring-neutral-300",
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span aria-hidden="true" className="mx-1 h-6 w-px bg-neutral-200" />;
}

function ConfirmStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${bytes} B`;
}
