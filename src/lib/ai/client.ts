import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export function getModel(): string {
  return process.env.AI_MODEL ?? "claude-opus-4-6";
}
