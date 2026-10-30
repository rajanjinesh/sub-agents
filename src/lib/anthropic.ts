import Anthropic from "@anthropic-ai/sdk";

// The ONLY place the Anthropic client is created. Server-side only: never import from a client component.
let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  client ??= new Anthropic({ apiKey });
  return client;
}

export function getModel(): string {
  const model = process.env.ANTHROPIC_MODEL?.trim();
  if (!model) throw new Error("ANTHROPIC_MODEL is not set");
  return model;
}
