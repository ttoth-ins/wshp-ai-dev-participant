import Anthropic from "@anthropic-ai/sdk";

/**
 * Thin wrapper around the Anthropic SDK for the AI Assistant MVP chat
 * endpoint (Linear TTO-6, AC-02). Sends a conversation's full message
 * history to Claude and returns the assistant's reply text.
 *
 * The Claude-calling part is a small, swappable `ClaudeSend` function so the
 * caller can be exercised with a fake in tests, without a live network call
 * to Anthropic in CI — mirrors `db.ts`'s `QueryExecutor` injection pattern
 * (see `docs/given-when-then.md` -> "Required fake/real adapter contract").
 */

export type Role = "user" | "assistant";

export interface ChatMessage {
  role: Role;
  content: string;
}

/** Model resolved for TASK-02/TASK-07 (D-03, RESOLVED): Claude Sonnet 5. */
const MODEL = "claude-sonnet-5";

/**
 * Minimal contract this module needs to talk to Claude: send the full prior
 * message history, get the assistant's reply text back.
 */
export type ClaudeSend = (messages: ChatMessage[]) => Promise<string>;

let defaultSend: ClaudeSend | undefined;

function getDefaultSend(): ClaudeSend {
  if (!defaultSend) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    const client = new Anthropic({ apiKey });
    defaultSend = async (messages) => {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        messages: messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      });
      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === "text",
      );
      if (!textBlock) {
        throw new Error("Claude response contained no text content");
      }
      return textBlock.text;
    };
  }
  return defaultSend;
}

/**
 * Sends a conversation's full message history to Claude and returns the
 * assistant's reply text. `send` defaults to a lazily-constructed real
 * Anthropic client, only built the first time this is actually invoked
 * without an override.
 */
export async function getChatResponse(
  messages: ChatMessage[],
  send: ClaudeSend = getDefaultSend(),
): Promise<string> {
  return send(messages);
}
