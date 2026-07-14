import { describe, expect, it } from "vitest";

import {
  createConversation,
  getConversation,
  listConversations,
  saveMessage,
  updateConversationTitle,
  type QueryExecutor,
  type Role,
  type Row,
} from "./db";

/**
 * In-memory fake implementing the same `QueryExecutor` contract as the real
 * Neon client (`sql.query(text, params) -> rows`). This lets db.ts's real
 * query-building and row-shaping logic be exercised without a live network
 * connection to Postgres — required because CI has no `DATABASE_URL` secret
 * configured yet (see docs/given-when-then.md -> "Required fake/real adapter
 * contract").
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
  // Monotonic clock: real Postgres timestamps have microsecond resolution,
  // but `new Date()` in a fast test run can produce the same millisecond
  // for two inserts, making "order by created_at" ambiguous. An
  // incrementing counter keeps insertion order deterministic.
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
    if (text.startsWith("SELECT id, title, created_at FROM conversations ORDER BY")) {
      return [...conversations].sort(
        (a, b) => b.created_at.getTime() - a.created_at.getTime(),
      );
    }
    if (text.startsWith("SELECT id, title, created_at FROM conversations WHERE")) {
      return conversations.filter((c) => c.id === params[0]);
    }
    if (text.startsWith("UPDATE conversations SET title")) {
      const row = conversations.find((c) => c.id === params[0]);
      if (!row) {
        return [];
      }
      row.title = params[1] as string;
      return [row];
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

describe("db (persistence contract, AC-04/SC-05)", () => {
  it("creates a conversation and lists it, newest first", async () => {
    const executor = createFakeExecutor();

    const first = await createConversation("First", executor);
    const second = await createConversation("Second", executor);
    const list = await listConversations(executor);

    expect(list).toEqual([second, first]);
  });

  it("defaults a new conversation's title to 'New Chat'", async () => {
    const executor = createFakeExecutor();

    const conversation = await createConversation(undefined, executor);

    expect(conversation.title).toBe("New Chat");
  });

  it("saves user and AI messages and retrieves them in chronological order", async () => {
    const executor = createFakeExecutor();
    const conversation = await createConversation("New Chat", executor);

    await saveMessage(conversation.id, "user", "Hello", executor);
    await saveMessage(conversation.id, "assistant", "Hi there", executor);

    const loaded = await getConversation(conversation.id, executor);

    expect(loaded).not.toBeNull();
    expect(loaded?.title).toBe(conversation.title);
    expect(loaded?.messages).toHaveLength(2);
    expect(loaded?.messages[0]).toMatchObject({ role: "user", content: "Hello" });
    expect(loaded?.messages[1]).toMatchObject({ role: "assistant", content: "Hi there" });
  });

  it("updates a conversation's title (AC-07)", async () => {
    const executor = createFakeExecutor();
    const conversation = await createConversation("New Chat", executor);

    const updated = await updateConversationTitle(conversation.id, "Trip Planning Help", executor);

    expect(updated.title).toBe("Trip Planning Help");
    const loaded = await getConversation(conversation.id, executor);
    expect(loaded?.title).toBe("Trip Planning Help");
  });

  it("returns null for a conversation id that does not exist", async () => {
    const executor = createFakeExecutor();

    const loaded = await getConversation("missing-id", executor);

    expect(loaded).toBeNull();
  });

  it("keeps other conversations' messages untouched when saving to one conversation (SC-04 boundary)", async () => {
    const executor = createFakeExecutor();
    const a = await createConversation("A", executor);
    const b = await createConversation("B", executor);

    await saveMessage(a.id, "user", "only in A", executor);

    const loadedA = await getConversation(a.id, executor);
    const loadedB = await getConversation(b.id, executor);

    expect(loadedA?.messages).toHaveLength(1);
    expect(loadedB?.messages).toHaveLength(0);
  });

  it("retrieves saved messages, in order, from a separate read after they were saved (models surviving a restart)", async () => {
    // SC-05: messages persist across an application restart. The persisted
    // state lives in the store behind the executor (Neon in production, this
    // fake in the test), not in any in-process state of db.ts itself, so a
    // later, independent `getConversation` call — as would happen from a
    // freshly restarted server process reconnecting to the same database —
    // returns the same conversation and messages.
    const executor = createFakeExecutor();
    const conversation = await createConversation("Restart check", executor);
    await saveMessage(conversation.id, "user", "before restart", executor);
    await saveMessage(conversation.id, "assistant", "answer before restart", executor);

    const afterRestart = await getConversation(conversation.id, executor);

    expect(afterRestart?.messages.map((m) => ({ role: m.role, content: m.content }))).toEqual([
      { role: "user", content: "before restart" },
      { role: "assistant", content: "answer before restart" },
    ]);
  });
});
