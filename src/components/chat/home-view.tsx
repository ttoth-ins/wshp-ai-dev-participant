"use client";

import { useEffect, useState } from "react";

import { ConversationSidebar } from "@/components/sidebar/conversation-sidebar";
import {
  addConversation,
  type SidebarConversation,
} from "@/components/sidebar/conversation-list";

import { ChatView } from "./chat-view";

/**
 * Composes the sidebar and the chat view, lifting the conversation list and
 * the active-conversation id up so the sidebar can highlight the active
 * conversation and refresh when a new one is created (Linear TTO-9,
 * AC-05/SC-06).
 *
 * The initial list is fetched client-side from `GET /api/conversations` on
 * mount (see `page.tsx` for why this isn't done in the Server Component
 * instead). Every subsequent update goes through `ChatView`'s existing
 * `onConversationCreated` hook, fired both by the lazy first-message
 * bootstrap and by New Chat (Linear TTO-7/TTO-8), so no separate refresh
 * mechanism (e.g. polling, a second `GET`) is invented.
 */
export interface HomeViewProps {
  createConversation: () => Promise<string>;
}

export function HomeView({ createConversation }: HomeViewProps) {
  const [conversations, setConversations] = useState<SidebarConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    fetch("/api/conversations")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load conversations");
        }
        return response.json() as Promise<SidebarConversation[]>;
      })
      .then((data) => {
        if (!cancelled) {
          setConversations(data);
        }
      })
      .catch(() => {
        // Best-effort: the sidebar simply stays empty on a load failure —
        // this must never block or error out the chat view itself.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleConversationCreated(conversation: SidebarConversation) {
    setActiveConversationId(conversation.id);
    setConversations((prev) => addConversation(prev, conversation));
  }

  return (
    <>
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
      />
      <div className="flex flex-1 flex-col items-center p-4">
        <ChatView
          createConversation={createConversation}
          onConversationCreated={handleConversationCreated}
        />
      </div>
    </>
  );
}
