import "server-only";

import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

/** Lazily-constructed singleton — never instantiate at module scope so a missing
 * ANTHROPIC_API_KEY doesn't crash unrelated routes that merely import this module. */
export function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

// Cheap/fast model for the high-volume match-score call, a heavier one for the
// lower-volume assistant panel (recommendations, Work Passport draft, interview prep).
export const MATCH_SCORE_MODEL = "claude-haiku-4-5-20251001";
export const ASSISTANT_MODEL = "claude-sonnet-5";
