"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Bold,
  Code2,
  Eye,
  Italic,
  Link2,
  List,
  ListOrdered,
  Paperclip,
  Quote,
  RefreshCw,
  Save,
  Send,
  Smile,
  Strikethrough,
  Trash2,
  Underline,
} from "lucide-react";
import { DiscordMarkdownPreview } from "@/components/admin/discord-markdown-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SectionHeader } from "@/components/ui/page";
import type { DiscordChannelGroup, DiscordEmoji } from "@/lib/admin/discord";
import { cn } from "@/lib/cn";

interface DiscordTemplate {
  id: string;
  name: string;
  kind: "DRAFT" | "TEMPLATE";
  content: string;
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

const MAX_CONTENT = 2000;
const MAX_FILES = 10;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;

export function DiscordMessageComposer() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [channelGroups, setChannelGroups] = useState<DiscordChannelGroup[]>([]);
  const [emojis, setEmojis] = useState<DiscordEmoji[]>([]);
  const [templates, setTemplates] = useState<DiscordTemplate[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [content, setContent] = useState("");
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

  useEffect(() => {
    void refreshAll();
  }, []);

  const allChannels = useMemo(
    () => channelGroups.flatMap((group) => group.channels.map((channel) => ({ ...channel, groupName: group.name }))),
    [channelGroups],
  );
  const selectedChannel = allChannels.find((channel) => channel.id === selectedChannelId) ?? null;
  const totalFileSize = files.reduce((sum, file) => sum + file.size, 0);
  const filteredEmojis = emojis.filter((emoji) =>
    emoji.name.toLowerCase().includes(emojiQuery.trim().toLowerCase()),
  );
  const canSend = Boolean(selectedChannelId) && (content.trim().length > 0 || files.length > 0) && content.length <= MAX_CONTENT && files.length <= MAX_FILES && totalFileSize <= MAX_TOTAL_BYTES;

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

  function applyWrap(prefix: string, suffix = prefix, fallback = "text") {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((current) => `${current}${prefix}${fallback}${suffix}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end) || fallback;
    const next = `${content.slice(0, start)}${prefix}${selected}${suffix}${content.slice(end)}`;
    setContent(next);
    window.setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  }

  function applyLinePrefix(prefix: string) {
    const textarea = textareaRef.current;
    if (!textarea) return setContent((current) => `${current}${current.endsWith("\n") || !current ? "" : "\n"}${prefix}`);
    const start = textarea.selectionStart;
    const lineStart = content.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const next = `${content.slice(0, lineStart)}${prefix}${content.slice(lineStart)}`;
    setContent(next);
    window.setTimeout(() => textarea.focus(), 0);
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
    window.setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + value.length, start + value.length);
    }, 0);
  }

  function handleFiles(selected: FileList | null) {
    if (!selected) return;
    const next = [...files, ...Array.from(selected)].slice(0, MAX_FILES);
    setFiles(next);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  }

  function loadTemplate(template: DiscordTemplate) {
    setTemplateId(template.id);
    setTemplateName(template.name);
    setTemplateKind(template.kind);
    setTemplateTags(template.tags.join(", "));
    setContent(template.content);
    setStatus(`Loaded ${template.name}`);
  }

  function newTemplate() {
    setTemplateId(null);
    setTemplateName("");
    setTemplateTags("");
    setTemplateKind("DRAFT");
    setContent("");
    setFiles([]);
    setStatus("Composer cleared");
  }

  async function saveTemplate(kind: "DRAFT" | "TEMPLATE") {
    setSaving(true);
    setError(null);
    setStatus(null);
    const payload = {
      name: templateName.trim() || `${kind === "DRAFT" ? "Draft" : "Template"} ${new Date().toLocaleDateString()}`,
      kind,
      content,
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
    if (!selectedChannelId) return setError("Choose a Discord channel.");
    if (!content.trim() && files.length === 0) return setError("Add message content or at least one file.");
    if (content.length > MAX_CONTENT) return setError("Message content must be 2000 characters or fewer.");
    if (files.length > MAX_FILES) return setError("Discord accepts up to 10 files per message.");
    if (totalFileSize > MAX_TOTAL_BYTES) return setError("Discord accepts up to 25 MiB per message.");
    setConfirmOpen(true);
  }

  async function sendMessage() {
    setSending(true);
    setError(null);
    setStatus(null);
    const payload = new FormData();
    payload.append("channelId", selectedChannelId);
    payload.append("content", content);
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
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-5">
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
            <ToolbarButton label="Bold" onClick={() => applyWrap("**")}><Bold className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Italic" onClick={() => applyWrap("*")}><Italic className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Underline" onClick={() => applyWrap("__")}><Underline className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Strike" onClick={() => applyWrap("~~")}><Strikethrough className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Spoiler" onClick={() => applyWrap("||", "||", "spoiler")}><Eye className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Code" onClick={() => applyWrap("`", "`", "code")}><Code2 className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Quote" onClick={() => applyLinePrefix("> ")}><Quote className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="List" onClick={() => applyLinePrefix("- ")}><List className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Numbered list" onClick={() => applyLinePrefix("1. ")}><ListOrdered className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Link" onClick={() => applyWrap("[", "](https://example.com)", "link")}><Link2 className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Attach files" onClick={() => fileInputRef.current?.click()}><Paperclip className="h-4 w-4" /></ToolbarButton>
          </div>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={13}
            className="mt-4 w-full resize-y rounded-xl border border-neutral-200 px-4 py-3 text-sm leading-6 outline-none focus:border-neutral-500"
            placeholder="Write Discord Markdown here..."
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
            <span className={content.length > MAX_CONTENT ? "font-semibold text-red-600" : undefined}>
              {content.length} / {MAX_CONTENT} characters
            </span>
            <span>{files.length} files - {formatBytes(totalFileSize)} / {formatBytes(MAX_TOTAL_BYTES)}</span>
          </div>

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
            <Button type="button" onClick={openSendConfirm} disabled={!canSend}>
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

        <section>
          <SectionHeader title="Live preview" description="Rendered as a safe Discord-style preview. The actual send still uses your raw Markdown." />
          <DiscordMarkdownPreview content={content} emojis={emojis} />
        </section>
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
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            <ConfirmStat label="Channel" value={selectedChannel ? `#${selectedChannel.name}` : "-"} />
            <ConfirmStat label="Characters" value={`${content.length} / ${MAX_CONTENT}`} />
            <ConfirmStat label="Files" value={`${files.length} (${formatBytes(totalFileSize)})`} />
          </div>
          <DiscordMarkdownPreview content={content} emojis={emojis} className="max-h-80 overflow-y-auto" />
        </div>
      </Dialog>
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-white hover:text-neutral-950"
    >
      {children}
    </button>
  );
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
