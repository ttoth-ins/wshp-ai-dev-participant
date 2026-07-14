import { describe, expect, it } from "vitest";

import {
  chatReducer,
  initialChatState,
  type ChatMessageItem,
} from "./chat-reducer";

const userMessage: ChatMessageItem = {
  id: "1",
  role: "user",
  content: "Hello",
};

const aiMessage: ChatMessageItem = {
  id: "2",
  role: "assistant",
  content: "Hi there",
};

describe("chatReducer", () => {
  it("appends the user's message immediately and enters the sending state (SC-01)", () => {
    const state = chatReducer(initialChatState, {
      type: "user-message-sent",
      message: userMessage,
    });

    expect(state.messages).toEqual([userMessage]);
    expect(state.status).toBe("sending");
  });

  it("appends the AI response at the end, after the user message, in order (SC-01)", () => {
    const afterUser = chatReducer(initialChatState, {
      type: "user-message-sent",
      message: userMessage,
    });
    const afterAi = chatReducer(afterUser, {
      type: "ai-response-received",
      message: aiMessage,
      generation: 0,
    });

    expect(afterAi.messages).toEqual([userMessage, aiMessage]);
    expect(afterAi.status).toBe("idle");
  });

  it("keeps a second round trip in chronological order", () => {
    let state = chatReducer(initialChatState, {
      type: "user-message-sent",
      message: userMessage,
    });
    state = chatReducer(state, {
      type: "ai-response-received",
      message: aiMessage,
      generation: 0,
    });
    const secondUserMessage: ChatMessageItem = {
      id: "3",
      role: "user",
      content: "Follow-up",
    };
    state = chatReducer(state, {
      type: "user-message-sent",
      message: secondUserMessage,
    });

    expect(state.messages.map((message) => message.id)).toEqual([
      "1",
      "2",
      "3",
    ]);
  });

  it("on send failure, keeps the saved user message and does not fabricate an AI message", () => {
    const afterUser = chatReducer(initialChatState, {
      type: "user-message-sent",
      message: userMessage,
    });
    const afterFailure = chatReducer(afterUser, {
      type: "send-failed",
      error: "Failed to get a response from Claude",
      generation: 0,
    });

    expect(afterFailure.messages).toEqual([userMessage]);
    expect(afterFailure.status).toBe("error");
    expect(afterFailure.error).toBe("Failed to get a response from Claude");
  });

  it("New Chat resets to a fresh, empty, idle state (AC-03/SC-04)", () => {
    const afterUser = chatReducer(initialChatState, {
      type: "user-message-sent",
      message: userMessage,
    });
    const afterAi = chatReducer(afterUser, {
      type: "ai-response-received",
      message: aiMessage,
      generation: 0,
    });

    const afterReset = chatReducer(afterAi, { type: "conversation-reset" });

    expect(afterReset).toEqual({ ...initialChatState, generation: 1 });
  });

  it(
    "drops a stale AI response that resolves after New Chat has reset the " +
      "conversation, instead of showing a reply for the wrong chat " +
      "(Linear TTO-8 review finding: Send/New Chat race)",
    () => {
      // 1. User sends a message on conversation A (generation 0). The Send
      //    captures `generation: 0` before its fetch, exactly as
      //    `chat-view.tsx` does.
      const afterUser = chatReducer(initialChatState, {
        type: "user-message-sent",
        message: userMessage,
      });
      expect(afterUser.generation).toBe(0);

      // 2. Before the Send's fetch resolves, New Chat's own request resolves
      //    and resets the view to a new, empty conversation B — bumping the
      //    generation.
      const afterReset = chatReducer(afterUser, { type: "conversation-reset" });
      expect(afterReset).toEqual({ ...initialChatState, generation: 1 });

      // 3. The Send's fetch to conversation A finally resolves and dispatches
      //    its AI response, still stamped with the generation (0) it was
      //    issued under — which no longer matches the current generation (1).
      const afterStaleAi = chatReducer(afterReset, {
        type: "ai-response-received",
        message: aiMessage,
        generation: 0,
      });

      // The stale reply must NOT appear in conversation B's state.
      expect(afterStaleAi).toEqual(afterReset);
      expect(afterStaleAi.messages).toEqual([]);
    },
  );

  it("drops a stale send-failed dispatch from before a New Chat reset", () => {
    const afterUser = chatReducer(initialChatState, {
      type: "user-message-sent",
      message: userMessage,
    });
    const afterReset = chatReducer(afterUser, { type: "conversation-reset" });

    const afterStaleFailure = chatReducer(afterReset, {
      type: "send-failed",
      error: "Something went wrong while getting a response. Please try again.",
      generation: 0,
    });

    expect(afterStaleFailure).toEqual(afterReset);
  });

  it("still applies an AI response whose generation matches the current one after a reset", () => {
    const afterReset = chatReducer(initialChatState, {
      type: "conversation-reset",
    });
    const afterUser = chatReducer(afterReset, {
      type: "user-message-sent",
      message: userMessage,
    });
    const afterAi = chatReducer(afterUser, {
      type: "ai-response-received",
      message: aiMessage,
      generation: 1,
    });

    expect(afterAi.messages).toEqual([userMessage, aiMessage]);
    expect(afterAi.status).toBe("idle");
  });

  it("replaces the current messages with a loaded conversation's full history, not appending to them (AC-06/SC-07)", () => {
    const afterUser = chatReducer(initialChatState, {
      type: "user-message-sent",
      message: userMessage,
    });

    const loadedMessages: ChatMessageItem[] = [
      { id: "10", role: "user", content: "First question" },
      { id: "11", role: "assistant", content: "First answer" },
      { id: "12", role: "user", content: "Second question" },
    ];
    const afterLoad = chatReducer(afterUser, {
      type: "conversation-loaded",
      messages: loadedMessages,
    });

    expect(afterLoad.messages).toEqual(loadedMessages);
    expect(afterLoad.status).toBe("idle");
    expect(afterLoad.error).toBeNull();
    expect(afterLoad.generation).toBe(afterUser.generation + 1);
  });

  it(
    "drops a stale AI response that resolves after the conversation was " +
      "switched, instead of showing a reply in the wrong (newly opened) " +
      "conversation (Linear TTO-10: same race New Chat's reset already guards)",
    () => {
      const afterUser = chatReducer(initialChatState, {
        type: "user-message-sent",
        message: userMessage,
      });
      expect(afterUser.generation).toBe(0);

      const loadedMessages: ChatMessageItem[] = [
        { id: "20", role: "user", content: "Older question" },
      ];
      const afterLoad = chatReducer(afterUser, {
        type: "conversation-loaded",
        messages: loadedMessages,
      });
      expect(afterLoad.generation).toBe(1);

      const afterStaleAi = chatReducer(afterLoad, {
        type: "ai-response-received",
        message: aiMessage,
        generation: 0,
      });

      expect(afterStaleAi).toEqual(afterLoad);
      expect(afterStaleAi.messages).toEqual(loadedMessages);
    },
  );
});
