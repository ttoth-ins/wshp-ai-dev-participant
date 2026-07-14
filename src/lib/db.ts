import { neon } from "@neondatabase/serverless";

/**
 * Data-access module for the AI Assistant MVP persistence layer
 * (Linear TTO-5, AC-04). Schema: `src/lib/schema.sql`.
 *
 * The SQL-executing part is a small, swappable `QueryExecutor` function so
 * the row-shaping logic below can be exercised with an in-memory fake in
 * tests, without a live network connection to Neon in CI
 * (see `docs/given-when-then.md` -> "Required fake/real adapter contract").
 */

export type Role = "user" | "assistant";

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: Role;
  content: string;
  createdAt: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

/** Row shape as returned by the Neon driver (or an equivalent fake). */
export type Row = Record<string, unknown>;

/**
 * Minimal contract this module needs from a SQL client: run a parameterized
 * query, get rows back. Matches `@neondatabase/serverless`'s
 * `sql.query(text, params)`, so the real client can be passed directly.
 */
export type QueryExecutor = (text: string, params?: unknown[]) => Promise<Row[]>;

let defaultExecutor: QueryExecutor | undefined;

function getDefaultExecutor(): QueryExecutor {
  if (!defaultExecutor) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    const sql = neon(connectionString);
    defaultExecutor = (text, params) => sql.query(text, params);
  }
  return defaultExecutor;
}

function toIsoString(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function toConversation(row: Row): Conversation {
  return {
    id: String(row.id),
    title: String(row.title),
    createdAt: toIsoString(row.created_at),
  };
}

function toMessage(row: Row): Message {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    role: row.role as Role,
    content: String(row.content),
    createdAt: toIsoString(row.created_at),
  };
}

export async function createConversation(
  title: string = "New Chat",
  executor: QueryExecutor = getDefaultExecutor(),
): Promise<Conversation> {
  const rows = await executor(
    "INSERT INTO conversations (title) VALUES ($1) RETURNING id, title, created_at",
    [title],
  );
  return toConversation(rows[0]);
}

export async function listConversations(
  executor: QueryExecutor = getDefaultExecutor(),
): Promise<Conversation[]> {
  const rows = await executor(
    "SELECT id, title, created_at FROM conversations ORDER BY created_at DESC",
  );
  return rows.map(toConversation);
}

export async function getConversation(
  id: string,
  executor: QueryExecutor = getDefaultExecutor(),
): Promise<ConversationWithMessages | null> {
  const conversationRows = await executor(
    "SELECT id, title, created_at FROM conversations WHERE id = $1",
    [id],
  );
  if (conversationRows.length === 0) {
    return null;
  }
  const messageRows = await executor(
    "SELECT id, conversation_id, role, content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC",
    [id],
  );
  return {
    ...toConversation(conversationRows[0]),
    messages: messageRows.map(toMessage),
  };
}

export async function saveMessage(
  conversationId: string,
  role: Role,
  content: string,
  executor: QueryExecutor = getDefaultExecutor(),
): Promise<Message> {
  const rows = await executor(
    "INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3) RETURNING id, conversation_id, role, content, created_at",
    [conversationId, role, content],
  );
  return toMessage(rows[0]);
}
