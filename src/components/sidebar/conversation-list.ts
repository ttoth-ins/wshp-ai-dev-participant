/**
 * Pure list logic for the sidebar (Linear TTO-9, AC-05/SC-06).
 *
 * Kept separate from the JSX (`conversation-sidebar.tsx`) so "which
 * conversation is active" and "how a freshly created conversation is added
 * to the list" can be unit-tested with plain Vitest, no DOM/React renderer
 * needed — mirrors `chat-reducer.ts`'s split
 * (see `docs/engineering-standard.md` §4, module-testability).
 */

export interface SidebarConversation {
  id: string;
  title: string;
}

/** Whether `conversation` is the one currently shown in the chat view. */
export function isActiveConversation(
  conversation: SidebarConversation,
  activeConversationId: string | null,
): boolean {
  return activeConversationId !== null && conversation.id === activeConversationId;
}

/**
 * Adds a newly created conversation to the front of the list — matching
 * `GET /api/conversations`'s most-recent-first ordering — without creating a
 * duplicate entry if it's somehow already present.
 */
export function addConversation(
  conversations: SidebarConversation[],
  conversation: SidebarConversation,
): SidebarConversation[] {
  const withoutDuplicate = conversations.filter((c) => c.id !== conversation.id);
  return [conversation, ...withoutDuplicate];
}
