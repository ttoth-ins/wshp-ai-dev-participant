import { describe, expect, it } from "vitest";

import { createConversation, saveMessage } from "@/lib/db";
import type { QueryExecutor, Role, Row } from "@/lib/db";

import { getConversationById, isValidUuid } from "./route";

/**
 * In-memory fake implementing the same `QueryExecutor` contract as the real
 * Neon client (mirrors the fakes in `src/lib/db.test.ts` and the sibling
 * routes' tests), so this route's 400/404/200 core logic can be exercised
 * without a live network connection to Postgres.
 *
 * `conversations.id` is a Postgres `uuid` column in production, so this fake
 * generates well-formed UUID strings (unlike the plain "1", "2", ... ids used
 * by the other routes' fakes) to exercise the "valid UUID, no matching row"
 * (404) path honestly, distinct from the "not UUID-shaped at all" (400) path.
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
  const nextUuid = () => `00000000-0000-4000-8000-${String(nextId++).padStart(12, "0")}`;

  return async (text, params = []): Promise<Row[]> => {
    if (text.startsWith("INSERT INTO conversations")) {
      const row: ConversationRow = {
        id: nextUuid(),
        title: params[0] as string,
        created_at: nextCreatedAt(),
      };
      conversations.push(row);
      return [row];
    }
    if (text.startsWith("SELECT id, title, created_at FROM conversations WHERE")) {
      return conversations.filter((c) => c.id === params[0]);
    }
    if (text.startsWith("SELECT id, title, created_at FROM conversations ORDER BY")) {
      return [...conversations].sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    }
    if (text.startsWith("SELECT id, conversation_id, role, content, created_at FROM messages")) {
      return messages
        .filter((m) => m.conversation_id === params[0])
        .sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
    }
    if (text.startsWith("INSERT INTO messages")) {
      const row: MessageRow = {
        id: nextUuid(),
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

describe("isValidUuid", () => {
  it("accepts a well-formed UUID", () => {
    expect(isValidUuid("00000000-0000-4000-8000-000000000001")).toBe(true);
  });

  it("rejects a non-UUID string", () => {
    expect(isValidUuid("not-a-uuid")).toBe(false);
    expect(isValidUuid("12345")).toBe(false);
    expect(isValidUuid("")).toBe(false);
  });
});

describe("getConversationById (open-past-conversation endpoint core logic, AC-06/SC-07)", () => {
  it("returns 'invalid-id' for a non-UUID-format id, without touching the database", async () => {
    const executor = createFakeExecutor();

    const result = await getConversationById("not-a-uuid", { executor });

    expect(result).toEqual({ outcome: "invalid-id" });
  });

  it("returns 'not-found' for a well-formed UUID with no matching conversation", async () => {
    const executor = createFakeExecutor();

    const result = await getConversationById(
      "00000000-0000-4000-8000-999999999999",
      { executor },
    );

    expect(result).toEqual({ outcome: "not-found" });
  });

  it("returns the conversation with its messages in chronological order when found", async () => {
    const executor = createFakeExecutor();
    const conversation = await createConversation("New Chat", executor);
    await saveMessage(conversation.id, "user", "Hello", executor);
    await saveMessage(conversation.id, "assistant", "Hi there", executor);
    await saveMessage(conversation.id, "user", "How are you?", executor);

    const result = await getConversationById(conversation.id, { executor });

    expect(result.outcome).toBe("found");
    if (result.outcome !== "found") {
      throw new Error("expected outcome to be 'found'");
    }
    expect(result.conversation.id).toBe(conversation.id);
    expect(result.conversation.messages.map((m) => ({ role: m.role, content: m.content }))).toEqual([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
      { role: "user", content: "How are you?" },
    ]);
  });

  it("returns an empty messages list for a conversation with no messages yet", async () => {
    const executor = createFakeExecutor();
    const conversation = await createConversation("New Chat", executor);

    const result = await getConversationById(conversation.id, { executor });

    expect(result.outcome).toBe("found");
    if (result.outcome !== "found") {
      throw new Error("expected outcome to be 'found'");
    }
    expect(result.conversation.messages).toEqual([]);
  });
});
