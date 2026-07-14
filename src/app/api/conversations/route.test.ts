import { describe, expect, it } from "vitest";

import { getConversation } from "@/lib/db";
import type { QueryExecutor, Role, Row } from "@/lib/db";

import { createNewConversation, listAllConversations } from "./route";

/**
 * In-memory fake implementing the same `QueryExecutor` contract as the real
 * Neon client (mirrors the fake in `src/lib/db.test.ts` and the messages
 * route's test) so this route's core logic can be exercised without a live
 * network connection to Postgres.
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
    if (text.startsWith("SELECT id, title, created_at FROM conversations ORDER BY")) {
      return [...conversations].sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    }
    if (text.startsWith("SELECT id, conversation_id, role, content, created_at FROM messages")) {
      return messages
        .filter((m) => m.conversation_id === params[0])
        .sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
    }
    throw new Error(`Unhandled query in fake executor: ${text}`);
  };
}

describe("createNewConversation (New Chat endpoint core logic, AC-03/SC-04)", () => {
  it("creates a new conversation with a usable id, defaulting the title to 'New Chat'", async () => {
    const executor = createFakeExecutor();

    const conversation = await createNewConversation({ executor });

    expect(conversation.id).toBeTruthy();
    expect(conversation.title).toBe("New Chat");
  });

  it("does not touch or alter a previously existing conversation when a second one is created (SC-04)", async () => {
    const executor = createFakeExecutor();

    const first = await createNewConversation({ executor });
    const second = await createNewConversation({ executor });

    expect(second.id).not.toBe(first.id);

    const loadedFirst = await getConversation(first.id, executor);
    expect(loadedFirst).toEqual({ ...first, messages: [] });
  });
});

describe("listAllConversations (sidebar list endpoint core logic, AC-05/SC-06)", () => {
  it("returns an empty list when no conversations exist", async () => {
    const executor = createFakeExecutor();

    const conversations = await listAllConversations({ executor });

    expect(conversations).toEqual([]);
  });

  it("returns conversations most-recent-first, each with an id and a title", async () => {
    const executor = createFakeExecutor();
    const first = await createNewConversation({ executor });
    const second = await createNewConversation({ executor });

    const conversations = await listAllConversations({ executor });

    expect(conversations.map((c) => c.id)).toEqual([second.id, first.id]);
    expect(conversations.every((c) => typeof c.title === "string")).toBe(true);
  });

  it("does not alter any conversation while listing them", async () => {
    const executor = createFakeExecutor();
    const conversation = await createNewConversation({ executor });

    await listAllConversations({ executor });

    const loaded = await getConversation(conversation.id, executor);
    expect(loaded).toEqual({ ...conversation, messages: [] });
  });
});
