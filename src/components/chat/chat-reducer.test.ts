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
    });

    expect(afterFailure.messages).toEqual([userMessage]);
    expect(afterFailure.status).toBe("error");
    expect(afterFailure.error).toBe("Failed to get a response from Claude");
  });
});
