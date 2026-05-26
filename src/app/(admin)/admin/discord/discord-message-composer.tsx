"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Bold,
  Code2,
  CodeXml,
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
  DISCORD_MAX_REQUEST_BYTES as MAX_TOTAL_BYTES,
  DISCORD_MESSAGE_MAX_CHARS as MAX_CONTENT,
  normalizeDiscordLinkButtons,
  getDiscordMessageValidationIssues,
} from "@/lib/admin/discord-message-validation";
import type { DiscordLinkButton } from "@/lib/admin/discord-message-validation";
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
  content: string;
  buttons: DiscordLinkButton[];
  tags: string[];
  updatedAt: string;
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

const HEADER_PREFIX_PATTERN = /^#{1,3}\s+/;
const ORDERED_PREFIX_PATTERN = /^\s*\d+\.\s+/;

export function DiscordMessageComposer() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [channelGroups, setChannelGroups] = useState<DiscordChannelGroup[]>([]);
  const [emojis, setEmojis] = useState<DiscordEmoji[]>([]);
  const [templates, setTemplates] = useState<DiscordTemplate[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [content, setContent] = useState("");
  const [linkButtons, setLinkButtons] = useState<DiscordLinkButton[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
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
  const [selection, setSelection] = useState<SelectionRange>({ start: 0, end: 0 });
  const [activeInlineFormat, setActiveInlineFormat] = useState<string | null>(null);

  useEffect(() => {
    void refreshAll();
  }, []);

  const allChannels = useMemo(
    () => channelGroups.flatMap((group) => group.channels.map((channel) => ({ ...channel, groupName: group.name }))),
    [channelGroups],
  );
  const validChannelIds = useMemo(() => allChannels.map((channel) => channel.id), [allChannels]);
  const selectedChannel = allChannels.find((channel) => channel.id === selectedChannelId) ?? null;
  const totalFileSize = files.reduce((sum, file) => sum + file.size, 0);
  const completeLinkButtons = useMemo(() => normalizeDiscordLinkButtons(linkButtons), [linkButtons]);
  const filteredEmojis = emojis.filter((emoji) =>
    emoji.name.toLowerCase().includes(emojiQuery.trim().toLowerCase()),
  );
  const sendValidationIssues = useMemo(
    () =>
      getDiscordMessageValidationIssues({
        channelId: selectedChannelId,
        content,
        files,
        buttons: linkButtons,
        validChannelIds: loading ? undefined : validChannelIds,
      }),
    [content, files, linkButtons, loading, selectedChannelId, validChannelIds],
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
      content,
      files: next,
      buttons: linkButtons,
      validChannelIds: loading ? undefined : validChannelIds,
    })[0];
    setError(issue?.message ?? null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
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

  function loadTemplate(template: DiscordTemplate) {
    setTemplateId(template.id);
    setTemplateName(template.name);
    setTemplateKind(template.kind);
    setTemplateTags(template.tags.join(", "));
    setContent(template.content);
    setLinkButtons(template.buttons ?? []);
    setSelection({ start: 0, end: template.content.length });
    setActiveInlineFormat(null);
    setStatus(`Loaded ${template.name}`);
  }

  function newTemplate() {
    setTemplateId(null);
    setTemplateName("");
    setTemplateTags("");
    setTemplateKind("DRAFT");
    setContent("");
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
    setSaving(true);
    setError(null);
    setStatus(null);
    const payload = {
      name: templateName.trim() || `${kind === "DRAFT" ? "Draft" : "Template"} ${new Date().toLocaleDateString()}`,
      kind,
      content,
      buttons: completeLinkButtons,
      tags: templateTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    try {
      const response = await fetch(templateId ? `/api/admin/discord/templates/${templateId}` : "/api/admin/discord/templates", {
        method: templateId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Could not save template.");
      const saved = body.template as DiscordTemplate;
      setTemplateId(saved.id);
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

  function openSendConfirm() {
    setError(null);
    if (primarySendIssue) return setError(primarySendIssue.message);
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
    payload.append("content", content);
    payload.append("buttons", JSON.stringify(completeLinkButtons));
    if (templateId) payload.append("templateId", templateId);
    for (const file of files) payload.append("files", file);

    try {
      const response = await fetch("/api/admin/discord/messages", {
        method: "POST",
        body: payload,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Could not send Discord message.");
      setConfirmOpen(false);
      setFiles([]);
      setStatus(`Message sent: ${body.message?.url ?? body.message?.id ?? "Discord"}`);
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
            className="mt-4 w-full resize-y rounded-xl border border-neutral-200 px-4 py-3 text-sm leading-6 outline-none focus:border-neutral-500"
            placeholder="Write Discord Markdown here..."
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
            <span className={content.length > MAX_CONTENT ? "font-semibold text-red-600" : undefined}>
              {content.length} / {MAX_CONTENT} characters
            </span>
            <span>{files.length} / {MAX_FILES} files - {formatBytes(totalFileSize)} / {formatBytes(MAX_TOTAL_BYTES)}</span>
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
            <Button type="button" onClick={openSendConfirm}>
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
          <SectionHeader title="Live preview" description="Mobile Discord preview. The actual send still uses your raw Markdown." />
          <DiscordMarkdownPreview content={content} emojis={emojis} buttons={completeLinkButtons} frame="mobile" />
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
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-500">{template.content || "Empty draft"}</p>
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
      </aside>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Discord send"
        description={selectedChannel ? `Posting to #${selectedChannel.name} from the ClipProfit bot.` : undefined}
        size="lg"
        className="max-w-3xl"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)} disabled={sending}>Cancel</Button>
            <Button type="button" onClick={sendMessage} isPending={sending}>
              <Send className="h-4 w-4" />
              Send now
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
            <ConfirmStat label="Channel" value={selectedChannel ? `#${selectedChannel.name}` : "-"} />
            <ConfirmStat label="Characters" value={`${content.length} / ${MAX_CONTENT}`} />
            <ConfirmStat label="Files" value={`${files.length} (${formatBytes(totalFileSize)})`} />
            <ConfirmStat label="Buttons" value={`${completeLinkButtons.length} / ${MAX_BUTTONS}`} />
          </div>
          <DiscordMarkdownPreview
            content={content}
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
