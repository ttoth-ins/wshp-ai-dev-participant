"use client";

import { isActiveConversation, type SidebarConversation } from "./conversation-list";

/**
 * Sidebar listing every conversation, most-recent-first, with the active one
 * visually highlighted (Linear TTO-9, AC-05/SC-06).
 *
 * `onSelectConversation` is a stub hook point for Linear TTO-10 (opening a
 * past conversation) — this component only renders the list and reports
 * which entry was clicked; it does not fetch or render that conversation's
 * message history itself.
 */
export interface ConversationSidebarProps {
  conversations: SidebarConversation[];
  activeConversationId: string | null;
  onSelectConversation?: (id: string) => void;
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
}: ConversationSidebarProps) {
  return (
    <nav
      aria-label="Conversations"
      className="flex w-64 shrink-0 flex-col gap-1 border-r border-border p-4"
    >
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">
        Conversations
      </h2>
      {conversations.length === 0 && (
        <p className="text-sm text-muted-foreground">No conversations yet.</p>
      )}
      <ul className="flex flex-col gap-1">
        {conversations.map((conversation) => {
          const active = isActiveConversation(conversation, activeConversationId);
          return (
            <li key={conversation.id}>
              <button
                type="button"
                onClick={() => onSelectConversation?.(conversation.id)}
                aria-current={active ? "true" : undefined}
                className={`w-full truncate rounded-md px-2 py-1.5 text-left text-sm ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {conversation.title}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
