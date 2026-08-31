// Basic automated screening, per the build spec: "keyword filter or an LLM moderation
// call" on chat messages and job posts, so *some* moderation exists before real money
// moves through the platform (Phase 3 payments). This is a keyword filter — fast, free,
// no external dependency — not an exhaustive profanity/safety list. Swap in (or add) an
// Anthropic moderation call here for stronger coverage before this goes anywhere near
// production; keep the screenContent() signature the same so call sites don't change.

const BLOCKED_PATTERNS: { pattern: RegExp; reason: string }[] = [
  // Trying to move payment or contact off-platform is a common scam vector against
  // minors specifically — HireUp's escrow protections only apply on-platform.
  {
    pattern: /\b(venmo|cashapp|cash app|zelle|paypal me|wire transfer|western union)\b/i,
    reason: "mentions moving payment off-platform",
  },
  {
    pattern: /\b(text me|call me|whatsapp|snapchat|my number is|reach me at)\b.{0,20}\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/i,
    reason: "shares a phone number to move the conversation off-platform",
  },
  // Requests for sensitive personal/financial info a job post or chat message has no
  // legitimate reason to ask a minor for.
  {
    pattern: /\b(social security|ssn|bank account number|routing number|credit card number)\b/i,
    reason: "requests sensitive personal/financial information",
  },
  // A minimal slur/profanity net — expand this list (or replace with an LLM call)
  // before relying on it as the only line of defense.
  { pattern: /\b(fuck|shit|bitch|asshole|slut|whore)\b/i, reason: "contains profanity" },
];

export function screenContent(text: string): { blocked: boolean; reason?: string } {
  for (const { pattern, reason } of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return { blocked: true, reason };
    }
  }
  return { blocked: false };
}
