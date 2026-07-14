/**
 * Pure chat state logic for the chat UI (Linear TTO-7, AC-01 / SC-01).
 *
 * Kept separate from the JSX/`chat-view.tsx` so the "append optimistic user
 * message, then append the AI response, then handle a send failure" behavior
 * can be unit-tested with plain Vitest (no DOM, no React renderer needed —
 * see `docs/engineering-standard.md` §4, module-testability).
 */

export type ChatRole = "user" | "assistant";

export interface ChatMessageItem {
  id: string;
  role: ChatRole;
  content: string;
}

export type ChatStatus = "idle" | "sending" | "error";

export interface ChatState {
  messages: ChatMessageItem[];
  status: ChatStatus;
  error: string | null;
}

export const initialChatState: ChatState = {
  messages: [],
  status: "idle",
  error: null,
};

export type ChatAction =
  | { type: "user-message-sent"; message: ChatMessageItem }
  | { type: "ai-response-received"; message: ChatMessageItem }
  | { type: "send-failed"; error: string }
  | { type: "conversation-reset" };

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "user-message-sent":
      // SC-01: the user's message is appended immediately, before any AI
      // response arrives.
      return {
        messages: [...state.messages, action.message],
        status: "sending",
        error: null,
      };
    case "ai-response-received":
      return {
        messages: [...state.messages, action.message],
        status: "idle",
        error: null,
      };
    case "send-failed":
      // Prior messages (including the just-sent user message) are left
      // untouched; no fabricated AI message is appended.
      return {
        ...state,
        status: "error",
        error: action.error,
      };
    case "conversation-reset":
      // New Chat (Linear TTO-8, AC-03/SC-04): switches this view to a new,
      // empty, active conversation. This only resets client-side view
      // state — the previous conversation's rows are untouched in the
      // database (see `src/app/api/conversations/route.ts`).
      return initialChatState;
    default:
      return state;
  }
}
