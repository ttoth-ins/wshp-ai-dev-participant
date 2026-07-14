import { describe, expect, it } from "vitest";

import { getChatResponse, type ChatMessage, type ClaudeSend } from "./claude";

describe("getChatResponse (Claude wrapper, AC-02)", () => {
  it("sends the given message history to the injected send function and returns its reply", async () => {
    const history: ChatMessage[] = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
      { role: "user", content: "How are you?" },
    ];
    let received: ChatMessage[] | undefined;
    const fakeSend: ClaudeSend = async (messages) => {
      received = messages;
      return "I'm doing well, thanks for asking!";
    };

    const reply = await getChatResponse(history, fakeSend);

    expect(reply).toBe("I'm doing well, thanks for asking!");
    expect(received).toEqual(history);
  });

  it("propagates a failure from the injected send function (SC-03)", async () => {
    const fakeSend: ClaudeSend = async () => {
      throw new Error("Claude API timeout");
    };

    await expect(getChatResponse([{ role: "user", content: "Hi" }], fakeSend)).rejects.toThrow(
      "Claude API timeout",
    );
  });
});
