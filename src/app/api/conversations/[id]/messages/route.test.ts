import { describe, expect, it } from "vitest";

import { createConversation, getConversation, saveMessage } from "@/lib/db";
import type { QueryExecutor, Role, Row } from "@/lib/db";
import type { ChatMessage, ClaudeSend } from "@/lib/claude";

import { sendMessage } from "./route";

/**
 * In-memory fake implementing the same `QueryExecutor` contract as the real
 * Neon client (mirrors the fake in `src/lib/db.test.ts`) so this route's
 * save -> history -> call -> save logic can be exercised without a live
 * network connection to Postgres or Anthropic.
 */
function createFakeExecutor(): QueryExecutor {
  interface ConversationRow extends Row {
    id: string;
    title: string;
    created_at: Date;
  }
  interface MessageRow extends Row {
    id: string;
    conversation_id: string;
    role: Role;
    content: string;
    created_at: Date;
  }

  const conversations: ConversationRow[] = [];
  const messages: MessageRow[] = [];
  let nextId = 1;
  let clock = 0;
  const nextCreatedAt = () => new Date(clock++);

  return async (text, params = []): Promise<Row[]> => {
    if (text.startsWith("INSERT INTO conversations")) {
      const row: ConversationRow = {
        id: String(nextId++),
        title: params[0] as string,
        created_at: nextCreatedAt(),
      };
      conversations.push(row);
      return [row];
    }
    if (text.startsWith("SELECT id, title, created_at FROM conversations WHERE")) {
      return conversations.filter((c) => c.id === params[0]);
    }
    if (text.startsWith("SELECT id, conversation_id, role, content, created_at FROM messages")) {
      return messages
        .filter((m) => m.conversation_id === params[0])
        .sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
    }
    if (text.startsWith("INSERT INTO messages")) {
      const row: MessageRow = {
        id: String(nextId++),
        conversation_id: params[0] as string,
        role: params[1] as Role,
        content: params[2] as string,
        created_at: nextCreatedAt(),
      };
      messages.push(row);
      return [row];
    }
    throw new Error(`Unhandled query in fake executor: ${text}`);
  };
}

describe("sendMessage (chat endpoint core logic, AC-02)", () => {
  it("sends the full prior history (not just the latest message) to Claude and saves the reply (SC-02)", async () => {
    const executor = createFakeExecutor();
    const conversation = await createConversation("New Chat", executor);
    await saveMessage(conversation.id, "user", "Hello", executor);
    await saveMessage(conversation.id, "assistant", "Hi there", executor);

    let receivedHistory: ChatMessage[] | undefined;
    const fakeSend: ClaudeSend = async (messages) => {
      receivedHistory = messages;
      return "I'm doing well, thanks!";
    };

    const result = await sendMessage(conversation.id, "How are you?", {
      executor,
      send: fakeSend,
    });

    expect(result.reply).toBe("I'm doing well, thanks!");
    expect(receivedHistory).toEqual([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
      { role: "user", content: "How are you?" },
    ]);

    const loaded = await getConversation(conversation.id, executor);
    expect(loaded?.messages.map((m) => ({ role: m.role, content: m.content }))).toEqual([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
      { role: "user", content: "How are you?" },
      { role: "assistant", content: "I'm doing well, thanks!" },
    ]);
  });

  it("sends the full history for a brand-new conversation (N=0 prior messages)", async () => {
    const executor = createFakeExecutor();
    const conversation = await createConversation("New Chat", executor);

    let receivedHistory: ChatMessage[] | undefined;
    const fakeSend: ClaudeSend = async (messages) => {
      receivedHistory = messages;
      return "Hello! How can I help?";
    };

    await sendMessage(conversation.id, "Hi", { executor, send: fakeSend });

    expect(receivedHistory).toEqual([{ role: "user", content: "Hi" }]);
  });

  it("keeps the saved user message and writes no assistant message when Claude fails (SC-03)", async () => {
    const executor = createFakeExecutor();
    const conversation = await createConversation("New Chat", executor);

    const fakeSend: ClaudeSend = async () => {
      throw new Error("Claude API timeout");
    };

    await expect(
      sendMessage(conversation.id, "Hello", { executor, send: fakeSend }),
    ).rejects.toThrow("Claude API timeout");

    const loaded = await getConversation(conversation.id, executor);
    expect(loaded?.messages).toHaveLength(1);
    expect(loaded?.messages[0]).toMatchObject({ role: "user", content: "Hello" });
  });
});
