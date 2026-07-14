"use client";

import { useReducer, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  chatReducer,
  initialChatState,
  type ChatMessageItem,
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
 */
export interface ChatViewProps {
  createConversation: () => Promise<string>;
}

function createMessageId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function ChatView({ createConversation }: ChatViewProps) {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const [input, setInput] = useState("");
  const conversationIdRef = useRef<string | null>(null);

  const isSending = state.status === "sending";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || isSending) {
      return;
    }

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
      });
    } catch {
      dispatch({
        type: "send-failed",
        error: "Something went wrong while getting a response. Please try again.",
      });
    }
  }

  async function handleNewChat() {
    if (isSending) {
      return;
    }

    try {
      const response = await fetch("/api/conversations", { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to create a new conversation");
      }

      const conversation = (await response.json()) as { id: string };
      conversationIdRef.current = conversation.id;
      setInput("");
      dispatch({ type: "conversation-reset" });
    } catch {
      // The failed New Chat attempt leaves the current conversation and its
      // messages exactly as they were (SC-04) — only an error is shown.
      dispatch({
        type: "send-failed",
        error: "Could not start a new chat. Please try again.",
      });
    }
  }

  return (
    <div className="flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={handleNewChat}>
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
          disabled={isSending}
          aria-label="Message"
        />
        <Button type="submit" disabled={isSending || input.trim().length === 0}>
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
