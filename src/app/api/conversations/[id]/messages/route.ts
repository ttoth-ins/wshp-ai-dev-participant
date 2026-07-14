import { NextResponse } from "next/server";

import { getConversation, saveMessage, type QueryExecutor } from "@/lib/db";
import { getChatResponse, type ChatMessage, type ClaudeSend } from "@/lib/claude";

/**
 * POST /api/conversations/[id]/messages (Linear TTO-6, AC-02).
 *
 * Saves the user's message, loads the conversation's full history, asks
 * Claude for a reply using that history, then saves and returns the reply.
 * On a Claude-call failure (SC-03): the user's message stays saved, no
 * assistant message is written, and the client gets a clear error response.
 */

export interface SendMessageDeps {
  executor?: QueryExecutor;
  send?: ClaudeSend;
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

  const reply = await getChatResponse(history, deps.send);

  await saveMessage(conversationId, "assistant", reply, deps.executor);

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
