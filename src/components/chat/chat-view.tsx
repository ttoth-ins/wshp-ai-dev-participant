"use client";

import { useEffect, useReducer, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SidebarConversation } from "@/components/sidebar/conversation-list";

import {
  chatReducer,
  initialChatState,
  SwitchRequestGuard,
  type ChatMessageItem,
  type ChatRole,
} from "./chat-reducer";

/**
 * Chat view: message list, text input, Send button, New Chat button, loading
 * state (Linear TTO-7 AC-01/SC-01; Linear TTO-8 AC-03/SC-04).
 *
 * `createConversation` bootstraps the conversation this chat is sent
 * against, lazily, on the first message the user actually sends (unchanged
 * from TTO-7). The **New Chat** button instead calls the reusable
 * `POST /api/conversations` endpoint (TTO-8) eagerly and immediately resets
 * this view to a new, empty, active conversation — it does not read or
 * modify any previous conversation's data.
 *
 * `onConversationCreated` (Linear TTO-9, AC-05/SC-06) is called whenever this
 * view starts a new conversation — either the lazy bootstrap above, or an
 * explicit New Chat — so a parent component can keep the sidebar's list and
 * active-conversation highlight in sync, without a second `GET` round trip.
 *
 * `selectedConversationId` (Linear TTO-10, AC-06/SC-07) is the id the parent
 * wants this view to show — set when the user clicks a past conversation in
 * the sidebar. When it names a conversation this view isn't already showing,
 * an effect loads it from `GET /api/conversations/[id]` and replaces the
 * current messages with its full history (see `chat-reducer.ts`'s
 * `conversation-loaded` action for why this is a replace, not an append, and
 * why it bumps `generation` the same way `conversation-reset` does). Because
 * `conversationIdRef` below is set eagerly by the lazy-bootstrap and New Chat
 * paths *before* the parent's prop can reflect it, feeding
 * `activeConversationId` back in as `selectedConversationId` does not
 * re-trigger a load for a conversation this view itself just created.
 */
export interface ChatViewProps {
  createConversation: () => Promise<string>;
  onConversationCreated?: (conversation: SidebarConversation) => void;
  selectedConversationId?: string | null;
}

interface FetchedConversation {
  id: string;
  messages: { id: string; role: ChatRole; content: string }[];
}

function createMessageId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function ChatView({
  createConversation,
  onConversationCreated,
  selectedConversationId,
}: ChatViewProps) {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const [input, setInput] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const conversationIdRef = useRef<string | null>(null);
  // Mirrors `state.generation` for synchronous reads inside async callbacks
  // (see `chat-reducer.ts`) — incremented in lockstep with every
  // `conversation-reset`/`conversation-loaded` dispatch below.
  const generationRef = useRef(0);
  // Only the most recently requested conversation-switch may apply its
  // result — guards against two rapid sidebar clicks resolving out of order,
  // and (via `invalidate()` in `handleNewChat`) against New Chat completing
  // while a switch is still in flight (Linear TTO-10 review finding). This
  // is independent of the `generation` guard above, which instead guards
  // against a Send racing a switch or New Chat.
  const switchRequestGuardRef = useRef(new SwitchRequestGuard());

  const isSending = state.status === "sending";
  // Neither a Send nor a New Chat may start while the other is in flight —
  // this closes the race where a Send resolves after a New Chat has already
  // reset the view (Linear TTO-8 review finding), and also prevents a
  // rapid double-click on New Chat from creating an extra conversation row.
  const isBusy = isSending || isCreatingChat;

  useEffect(() => {
    const id = selectedConversationId;
    if (!id || id === conversationIdRef.current) {
      // Nothing to load: no selection yet, or this view already shows it
      // (including the case where this view itself just created/reset to
      // this id — see the prop doc comment above).
      return;
    }

    const requestId = switchRequestGuardRef.current.next();

    fetch(`/api/conversations/${id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load the conversation");
        }
        return response.json() as Promise<FetchedConversation>;
      })
      .then((conversation) => {
        if (switchRequestGuardRef.current.isStale(requestId)) {
          // A newer selection, or a New Chat, superseded this one before it
          // resolved.
          return;
        }
        conversationIdRef.current = conversation.id;
        generationRef.current += 1;
        setInput("");
        dispatch({
          type: "conversation-loaded",
          messages: conversation.messages.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
          })),
        });
      })
      .catch(() => {
        if (switchRequestGuardRef.current.isStale(requestId)) {
          return;
        }
        dispatch({
          type: "send-failed",
          error: "Could not load that conversation. Please try again.",
          generation: generationRef.current,
        });
      });
    // Only re-run when the parent asks for a different conversation.
  }, [selectedConversationId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || isBusy) {
      return;
    }

    const generation = generationRef.current;

    dispatch({
      type: "user-message-sent",
      message: { id: createMessageId(), role: "user", content },
    });
    setInput("");

    try {
      let conversationId = conversationIdRef.current;
      if (!conversationId) {
        conversationId = await createConversation();
        conversationIdRef.current = conversationId;
        onConversationCreated?.({ id: conversationId, title: "New Chat" });
      }

      const response = await fetch(
        `/api/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to get a response from Claude");
      }

      const data = (await response.json()) as { reply: string };
      dispatch({
        type: "ai-response-received",
        message: {
          id: createMessageId(),
          role: "assistant",
          content: data.reply,
        },
        generation,
      });
    } catch {
      dispatch({
        type: "send-failed",
        error: "Something went wrong while getting a response. Please try again.",
        generation,
      });
    }
  }

  async function handleNewChat() {
    if (isBusy) {
      return;
    }

    setIsCreatingChat(true);
    try {
      const response = await fetch("/api/conversations", { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to create a new conversation");
      }

      const conversation = (await response.json()) as SidebarConversation;
      conversationIdRef.current = conversation.id;
      setInput("");
      generationRef.current += 1;
      // A switch fetch already in flight (user clicked a sidebar entry, then
      // New Chat before it resolved) must not be allowed to overwrite this
      // brand-new, empty conversation with the other one's history once it
      // resolves (Linear TTO-10 review finding).
      switchRequestGuardRef.current.invalidate();
      dispatch({ type: "conversation-reset" });
      onConversationCreated?.(conversation);
    } catch {
      // The failed New Chat attempt leaves the current conversation and its
      // messages exactly as they were (SC-04) — only an error is shown.
      dispatch({
        type: "send-failed",
        error: "Could not start a new chat. Please try again.",
        generation: generationRef.current,
      });
    } finally {
      setIsCreatingChat(false);
    }
  }

  return (
    <div className="flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleNewChat}
          disabled={isBusy}
        >
          New Chat
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-lg border border-border p-4">
        {state.messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Send a message to start the conversation.
          </p>
        )}
        {state.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Thinking…
            </div>
          </div>
        )}
      </div>

      {state.status === "error" && state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type a message…"
          disabled={isBusy}
          aria-label="Message"
        />
        <Button type="submit" disabled={isBusy || input.trim().length === 0}>
          Send
        </Button>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessageItem }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
