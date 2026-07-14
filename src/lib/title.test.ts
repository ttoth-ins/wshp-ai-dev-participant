import { describe, expect, it } from "vitest";

import { generateTitle } from "./title";
import type { ChatMessage, ClaudeSend } from "@/lib/claude";

describe("generateTitle (title generation, AC-07)", () => {
  it("sends the first message to the injected send function and returns the trimmed reply (SC-08A)", async () => {
    let received: ChatMessage[] | undefined;
    const fakeSend: ClaudeSend = async (messages) => {
      received = messages;
      return "  Trip Planning Help  ";
    };

    const title = await generateTitle("Help me plan a trip to Japan", fakeSend);

    expect(title).toBe("Trip Planning Help");
    expect(received).toHaveLength(1);
    expect(received?.[0].role).toBe("user");
    expect(received?.[0].content).toContain("Help me plan a trip to Japan");
  });

  it("propagates a failure from the injected send function (SC-08B)", async () => {
    const fakeSend: ClaudeSend = async () => {
      throw new Error("Claude API timeout");
    };

    await expect(generateTitle("Hello", fakeSend)).rejects.toThrow("Claude API timeout");
  });
});
