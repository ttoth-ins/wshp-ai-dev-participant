import { describe, expect, it, vi } from "vitest";
import { after } from "next/server";

import { createConversation, getConversation, saveMessage, updateConversationTitle } from "@/lib/db";
import type { QueryExecutor, Role, Row } from "@/lib/db";
import type { ChatMessage, ClaudeSend } from "@/lib/claude";

import { sendMessage } from "./route";

/**
 * `after()` (Linear TTO-11 fix round) requires an active Next.js request
 * scope to run for real — something these unit tests don't have, since they
 * call `sendMessage` directly rather than going through a live request. Mock
 * it to just run the registered task immediately, so the fire-and-forget
 * title-generation work still executes the same way the tests expect, while
 * a dedicated test below spies on this mock to prove the work is genuinely
 * registered through `after()` rather than left as a bare unawaited promise.
 */
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: vi.fn((task: Parameters<typeof actual.after>[0]) =>
      typeof task === "function" ? task() : task,
    ),
  };
});

/**
 * In-memory fake implementing the same `QueryExecutor` contract as the real
 * Neon client (mirrors the fake in `src/lib/db.test.ts`) so this route's
 * save -> history -> call -> save logic can be exercised without a live
 * network connection to Postgres or Anthropic.
 */
function createFakeExecutor(): QueryExecutor {
  interface ConversationRow extends Row {
    id: string;
    title: string;
    created_at: Date;
  }
  interface MessageRow extends Row {
    id: string;
    conversation_id: string;
    role: Role;
    content: string;
    created_at: Date;
  }

  const conversations: ConversationRow[] = [];
  const messages: MessageRow[] = [];
  let nextId = 1;
  let clock = 0;
  const nextCreatedAt = () => new Date(clock++);

  return async (text, params = []): Promise<Row[]> => {
    if (text.startsWith("INSERT INTO conversations")) {
      const row: ConversationRow = {
        id: String(nextId++),
        title: params[0] as string,
        created_at: nextCreatedAt(),
      };
      conversations.push(row);
      return [row];
    }
    if (text.startsWith("SELECT id, title, created_at FROM conversations WHERE")) {
      return conversations.filter((c) => c.id === params[0]);
    }
    if (text.startsWith("UPDATE conversations SET title")) {
      const row = conversations.find((c) => c.id === params[0]);
      if (!row) {
        return [];
      }
      row.title = params[1] as string;
      return [row];
    }
    if (text.startsWith("SELECT id, conversation_id, role, content, created_at FROM messages")) {
      return messages
        .filter((m) => m.conversation_id === params[0])
        .sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
    }
    if (text.startsWith("INSERT INTO messages")) {
      const row: MessageRow = {
        id: String(nextId++),
        conversation_id: params[0] as string,
        role: params[1] as Role,
        content: params[2] as string,
        created_at: nextCreatedAt(),
      };
      messages.push(row);
      return [row];
    }
    throw new Error(`Unhandled query in fake executor: ${text}`);
  };
}

describe("sendMessage (chat endpoint core logic, AC-02)", () => {
  it("sends the full prior history (not just the latest message) to Claude and saves the reply (SC-02)", async () => {
    const executor = createFakeExecutor();
    const conversation = await createConversation("New Chat", executor);
    await saveMessage(conversation.id, "user", "Hello", executor);
    await saveMessage(conversation.id, "assistant", "Hi there", executor);
    // Models a conversation whose first exchange already succeeded and got
    // its real title, so this test isn't incidentally exercising title
    // generation too (that's covered by its own tests below).
    await updateConversationTitle(conversation.id, "Existing Real Title", executor);

    let receivedHistory: ChatMessage[] | undefined;
    const fakeSend: ClaudeSend = async (messages) => {
      receivedHistory = messages;
      return "I'm doing well, thanks!";
    };

    const result = await sendMessage(conversation.id, "How are you?", {
      executor,
      send: fakeSend,
    });

    expect(result.reply).toBe("I'm doing well, thanks!");
    expect(receivedHistory).toEqual([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
      { role: "user", content: "How are you?" },
    ]);

    const loaded = await getConversation(conversation.id, executor);
    expect(loaded?.messages.map((m) => ({ role: m.role, content: m.content }))).toEqual([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
      { role: "user", content: "How are you?" },
      { role: "assistant", content: "I'm doing well, thanks!" },
    ]);
  });

  it("sends the full history for a brand-new conversation (N=0 prior messages)", async () => {
    const executor = createFakeExecutor();
    const conversation = await createConversation("New Chat", executor);

    let receivedHistory: ChatMessage[] | undefined;
    const fakeSend: ClaudeSend = async (messages) => {
      receivedHistory = messages;
      return "Hello! How can I help?";
    };

    await sendMessage(conversation.id, "Hi", { executor, send: fakeSend });

    expect(receivedHistory).toEqual([{ role: "user", content: "Hi" }]);
  });

  it("keeps the saved user message and writes no assistant message when Claude fails (SC-03)", async () => {
    const executor = createFakeExecutor();
    const conversation = await createConversation("New Chat", executor);

    const fakeSend: ClaudeSend = async () => {
      throw new Error("Claude API timeout");
    };

    await expect(
      sendMessage(conversation.id, "Hello", { executor, send: fakeSend }),
    ).rejects.toThrow("Claude API timeout");

    const loaded = await getConversation(conversation.id, executor);
    expect(loaded?.messages).toHaveLength(1);
    expect(loaded?.messages[0]).toMatchObject({ role: "user", content: "Hello" });
  });

  it("generates and saves a title after the conversation's first message (AC-07, SC-08A)", async () => {
    const executor = createFakeExecutor();
    const conversation = await createConversation("New Chat", executor);

    let titlePromptContent: string | undefined;
    const fakeTitleSend: ClaudeSend = async (messages) => {
      titlePromptContent = messages[0]?.content;
      return "Trip Planning Help";
    };
    const fakeSend: ClaudeSend = async () => "Sure, I can help with that.";

    await sendMessage(conversation.id, "Help me plan a trip to Japan", {
      executor,
      send: fakeSend,
      titleSend: fakeTitleSend,
    });

    await vi.waitFor(async () => {
      const loaded = await getConversation(conversation.id, executor);
      expect(loaded?.title).toBe("Trip Planning Help");
    });

    expect(titlePromptContent).toContain("Help me plan a trip to Japan");
  });

  it("does not re-trigger title generation once the conversation already has a real title (AC-07 boundary)", async () => {
    const executor = createFakeExecutor();
    const conversation = await createConversation("New Chat", executor);
    await saveMessage(conversation.id, "user", "first message", executor);
    await saveMessage(conversation.id, "assistant", "first reply", executor);
    await updateConversationTitle(conversation.id, "Existing Real Title", executor);

    let titleSendCalled = false;
    const fakeTitleSend: ClaudeSend = async () => {
      titleSendCalled = true;
      return "Should not be used";
    };
    const fakeSend: ClaudeSend = async () => "second reply";

    await sendMessage(conversation.id, "second message", {
      executor,
      send: fakeSend,
      titleSend: fakeTitleSend,
    });

    expect(titleSendCalled).toBe(false);
    const loaded = await getConversation(conversation.id, executor);
    expect(loaded?.title).toBe("Existing Real Title");
  });

  it(
    "still attempts title generation on a retry after the first chat call failed, " +
      "instead of being permanently disabled by a stale first-message check (review finding, SC-03 recovery)",
    async () => {
      const executor = createFakeExecutor();
      const conversation = await createConversation("New Chat", executor);

      const failingSend: ClaudeSend = async () => {
        throw new Error("Claude API timeout");
      };

      await expect(
        sendMessage(conversation.id, "first message", { executor, send: failingSend }),
      ).rejects.toThrow("Claude API timeout");

      // First attempt failed before any assistant reply, and before title
      // generation ever got a chance to run - conversation history already
      // has one message at this point, which is exactly what would have
      // permanently disabled a `history.length === 1` style check.
      const afterFailure = await getConversation(conversation.id, executor);
      expect(afterFailure?.messages).toHaveLength(1);
      expect(afterFailure?.title).toBe("New Chat");

      let titlePromptContent: string | undefined;
      const fakeTitleSend: ClaudeSend = async (messages) => {
        titlePromptContent = messages[0]?.content;
        return "Recovered Title";
      };
      const fakeSend: ClaudeSend = async () => "second reply, now working";

      await sendMessage(conversation.id, "second message", {
        executor,
        send: fakeSend,
        titleSend: fakeTitleSend,
      });

      await vi.waitFor(async () => {
        const loaded = await getConversation(conversation.id, executor);
        expect(loaded?.title).toBe("Recovered Title");
      });

      expect(titlePromptContent).toContain("second message");
    },
  );

  it("does not fail the chat response or corrupt messages when title generation fails (SC-08B)", async () => {
    const executor = createFakeExecutor();
    const conversation = await createConversation("New Chat", executor);

    const fakeSend: ClaudeSend = async () => "Hi there!";
    const failingTitleSend: ClaudeSend = async () => {
      throw new Error("title generation API down");
    };

    const result = await sendMessage(conversation.id, "Hello", {
      executor,
      send: fakeSend,
      titleSend: failingTitleSend,
    });

    expect(result.reply).toBe("Hi there!");

    const loaded = await getConversation(conversation.id, executor);
    expect(loaded?.title).toBe("New Chat");
    expect(loaded?.messages).toHaveLength(2);
    expect(loaded?.messages.map((m) => ({ role: m.role, content: m.content }))).toEqual([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
    ]);
  });

  it(
    "registers title generation through next/server's after(), not as a bare " +
      "unawaited promise (review finding: Vercel waitUntil safety)",
    async () => {
      const executor = createFakeExecutor();
      const conversation = await createConversation("New Chat", executor);

      const fakeSend: ClaudeSend = async () => "Sure, I can help with that.";
      const fakeTitleSend: ClaudeSend = async () => "Trip Planning Help";

      const afterMock = vi.mocked(after);
      afterMock.mockClear();
      let capturedTask: Parameters<typeof after>[0] | undefined;
      afterMock.mockImplementationOnce((task) => {
        capturedTask = task;
      });

      await sendMessage(conversation.id, "Help me plan a trip to Japan", {
        executor,
        send: fakeSend,
        titleSend: fakeTitleSend,
      });

      expect(afterMock).toHaveBeenCalledTimes(1);
      expect(capturedTask).toBeTypeOf("function");

      // Registering isn't enough - confirm the registered task is the real
      // title-generation work (not a no-op), by running it and observing the
      // title actually gets saved. `after()` itself is mocked here (it needs
      // a live request scope this unit test doesn't have), but the callback
      // it wraps is the production code.
      const beforeRunning = await getConversation(conversation.id, executor);
      expect(beforeRunning?.title).toBe("New Chat");

      if (typeof capturedTask === "function") {
        await capturedTask();
      }

      const afterRunning = await getConversation(conversation.id, executor);
      expect(afterRunning?.title).toBe("Trip Planning Help");
    },
  );
});
