import { NextResponse, after } from "next/server";

import {
  getConversation,
  saveMessage,
  updateConversationTitle,
  DEFAULT_CONVERSATION_TITLE,
  type QueryExecutor,
} from "@/lib/db";
import { getChatResponse, type ChatMessage, type ClaudeSend } from "@/lib/claude";
import { generateTitle } from "@/lib/title";

/**
 * POST /api/conversations/[id]/messages (Linear TTO-6, AC-02; title
 * generation added in Linear TTO-11, AC-07).
 *
 * Saves the user's message, loads the conversation's full history, asks
 * Claude for a reply using that history, then saves and returns the reply.
 * On a Claude-call failure (SC-03): the user's message stays saved, no
 * assistant message is written, and the client gets a clear error response.
 *
 * Title generation is attempted whenever the conversation still has its
 * default title (rather than "was this the first message ever", which a
 * failed first chat call would poison permanently — a retry's history
 * already has length >= 2, so counting messages can never re-trigger it).
 * Checking the title itself is retry-safe: it only flips away from the
 * default once a title has actually been generated and saved, so the very
 * first *successful* chat call for a conversation is always the one that
 * triggers it, however many earlier attempts failed.
 *
 * The title-generation call itself must not delay the chat response
 * (SC-08A), and if it fails, the failure is swallowed rather than
 * propagated — the conversation just keeps showing "New Chat" (SC-08B). It's
 * registered through Next's `after()` (which uses Vercel's `waitUntil` under
 * the hood) rather than left as a bare unawaited promise, so it isn't at risk
 * of being silently abandoned once the response is sent on a serverless
 * Function.
 */

export interface SendMessageDeps {
  executor?: QueryExecutor;
  send?: ClaudeSend;
  titleSend?: ClaudeSend;
}

export interface SendMessageResult {
  reply: string;
}

/**
 * Core save -> history -> call -> save logic, kept as a plain function
 * (mirrors `db.ts`'s injectable-executor pattern) so it can be unit-tested
 * with fakes, without a live network call to Neon or Anthropic.
 */
export async function sendMessage(
  conversationId: string,
  content: string,
  deps: SendMessageDeps = {},
): Promise<SendMessageResult> {
  await saveMessage(conversationId, "user", content, deps.executor);

  const conversation = await getConversation(conversationId, deps.executor);
  const history: ChatMessage[] = (conversation?.messages ?? []).map((message) => ({
    role: message.role,
    content: message.content,
  }));
  const hasDefaultTitle = conversation?.title === DEFAULT_CONVERSATION_TITLE;

  const reply = await getChatResponse(history, deps.send);

  await saveMessage(conversationId, "assistant", reply, deps.executor);

  if (hasDefaultTitle) {
    after(() =>
      generateTitle(content, deps.titleSend)
        .then((title) => updateConversationTitle(conversationId, title, deps.executor))
        .catch((error) => {
          console.error("Failed to generate conversation title", error);
        }),
    );
  }

  return { reply };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let content: unknown;
  try {
    const body = await request.json();
    content = (body as { content?: unknown } | null)?.content;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json(
      { error: "content is required and must be a non-empty string" },
      { status: 400 },
    );
  }

  try {
    const result = await sendMessage(id, content);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to handle chat message", error);
    return NextResponse.json(
      { error: "Failed to get a response from Claude" },
      { status: 502 },
    );
  }
}
