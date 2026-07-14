import { NextResponse } from "next/server";

import {
  createConversation,
  listConversations,
  type Conversation,
  type QueryExecutor,
} from "@/lib/db";

/**
 * POST /api/conversations (Linear TTO-8, AC-03).
 *
 * Creates a new, empty conversation and returns it. This is the reusable
 * endpoint behind the **New Chat** button (SC-04): it only inserts a new
 * `conversations` row — it never reads or modifies any other conversation,
 * so every previously existing conversation stays unchanged.
 *
 * A sibling task (TTO-9) adds a `GET` handler to this same file (for listing
 * conversations) — Next.js route handlers are just multiple named exports
 * from one `route.ts`, so that composes without touching this `POST` export.
 */

export interface CreateConversationDeps {
  executor?: QueryExecutor;
}

/**
 * Core logic, kept as a plain function (mirrors `db.ts`'s and the messages
 * route's injectable-executor pattern) so it can be unit-tested with a fake
 * executor, without a live network connection to Neon in CI.
 */
export async function createNewConversation(
  deps: CreateConversationDeps = {},
): Promise<Conversation> {
  return createConversation(undefined, deps.executor);
}

export async function POST() {
  try {
    const conversation = await createNewConversation();
    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error("Failed to create a new conversation", error);
    return NextResponse.json(
      { error: "Failed to create a new conversation" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/conversations (Linear TTO-9, AC-05).
 *
 * Lists every conversation, most-recent-first (`listConversations` already
 * orders by `created_at DESC` — see `src/lib/db.ts`), for the sidebar (SC-06).
 */

export interface ListConversationsDeps {
  executor?: QueryExecutor;
}

/**
 * Core logic, kept as a plain function (mirrors `createNewConversation`
 * above) so it can be unit-tested with a fake executor, without a live
 * network connection to Neon in CI.
 */
export async function listAllConversations(
  deps: ListConversationsDeps = {},
): Promise<Conversation[]> {
  return listConversations(deps.executor);
}

export async function GET() {
  try {
    const conversations = await listAllConversations();
    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Failed to list conversations", error);
    return NextResponse.json(
      { error: "Failed to list conversations" },
      { status: 500 },
    );
  }
}
