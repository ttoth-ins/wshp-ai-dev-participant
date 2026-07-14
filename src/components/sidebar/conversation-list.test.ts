import { describe, expect, it } from "vitest";

import {
  addConversation,
  isActiveConversation,
  type SidebarConversation,
} from "./conversation-list";

const first: SidebarConversation = { id: "1", title: "New Chat" };
const second: SidebarConversation = { id: "2", title: "New Chat" };

describe("isActiveConversation", () => {
  it("is false when there is no active conversation yet", () => {
    expect(isActiveConversation(first, null)).toBe(false);
  });

  it("is true only for the conversation matching the active id", () => {
    expect(isActiveConversation(first, first.id)).toBe(true);
    expect(isActiveConversation(second, first.id)).toBe(false);
  });
});

describe("addConversation (SC-06: sidebar updates on creation)", () => {
  it("prepends a newly created conversation, most-recent-first", () => {
    const result = addConversation([first], second);

    expect(result.map((c) => c.id)).toEqual([second.id, first.id]);
  });

  it("adds to an empty list", () => {
    const result = addConversation([], first);

    expect(result).toEqual([first]);
  });

  it("does not duplicate a conversation that is already in the list", () => {
    const result = addConversation([first], first);

    expect(result).toEqual([first]);
  });
});
