import { NextResponse } from "next/server";

import {
  getConversation,
  type ConversationWithMessages,
  type QueryExecutor,
} from "@/lib/db";

/**
 * GET /api/conversations/[id] (Linear TTO-10, AC-06).
 *
 * Returns a single conversation's messages in chronological order, so the
 * sidebar can open a past conversation and let the user continue it with
 * full history (SC-07).
 *
 * Per the TTO-5 review finding recorded on this Linear issue: `conversations.id`
 * is a Postgres `uuid` column, so a non-UUID-format `id` would otherwise
 * surface as a raw Postgres type error from `getConversation`. This route
 * checks the format itself first, so that case is a clean 400 instead of a
 * leaked 500, and a well-formed UUID with no matching row is a 404.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(id: string): boolean {
  return UUID_PATTERN.test(id);
}

export interface GetConversationDeps {
  executor?: QueryExecutor;
}

export type GetConversationResult =
  | { outcome: "invalid-id" }
  | { outcome: "not-found" }
  | { outcome: "found"; conversation: ConversationWithMessages };

/**
 * Core logic, kept as a plain function (mirrors the sibling routes'
 * injectable-executor pattern) so the 400/404/200 paths can be unit-tested
 * with a fake executor, without a live network connection to Neon.
 */
export async function getConversationById(
  id: string,
  deps: GetConversationDeps = {},
): Promise<GetConversationResult> {
  if (!isValidUuid(id)) {
    return { outcome: "invalid-id" };
  }

  const conversation = await getConversation(id, deps.executor);
  if (!conversation) {
    return { outcome: "not-found" };
  }

  return { outcome: "found", conversation };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const result = await getConversationById(id);

    switch (result.outcome) {
      case "invalid-id":
        return NextResponse.json(
          { error: "id must be a valid UUID" },
          { status: 400 },
        );
      case "not-found":
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 },
        );
      case "found":
        return NextResponse.json(result.conversation);
    }
  } catch (error) {
    console.error("Failed to load conversation", error);
    return NextResponse.json(
      { error: "Failed to load conversation" },
      { status: 500 },
    );
  }
}
