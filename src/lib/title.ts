import { getChatResponse, type ClaudeSend } from "@/lib/claude";

/**
 * Title-generation for a conversation's first message (Linear TTO-11, AC-07).
 *
 * Reuses `claude.ts`'s `getChatResponse`/`ClaudeSend` wiring (same
 * `claude-sonnet-5` model, D-03) instead of building a second Anthropic
 * client from scratch — this is just a differently-prompted, short Claude
 * call, not a different integration.
 */

const TITLE_INSTRUCTION =
  "Generate a short, concise title (5-6 words max) that summarizes the " +
  "topic of the following message. Respond with only the title text - no " +
  "quotes, punctuation at the end, or explanation.";

/**
 * Generates a short title from a conversation's first user message.
 * `send` defaults to `getChatResponse`'s own default (a real Anthropic
 * client), and can be overridden with a fake in tests.
 */
export async function generateTitle(
  firstMessage: string,
  send?: ClaudeSend,
): Promise<string> {
  const reply = await getChatResponse(
    [{ role: "user", content: `${TITLE_INSTRUCTION}\n\nMessage: ${firstMessage}` }],
    send,
  );
  return reply.trim();
}
