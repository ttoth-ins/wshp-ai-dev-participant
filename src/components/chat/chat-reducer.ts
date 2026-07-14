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
  // Bumped on every `conversation-reset`. `ai-response-received` and
  // `send-failed` carry the generation their Send was issued under (captured
  // by `chat-view.tsx` before its `fetch`); if it no longer matches, a New
  // Chat reset happened while that Send was in flight, so the result is
  // stale and must be dropped instead of corrupting the new conversation's
  // view (Linear TTO-8 review finding: race between Send and New Chat).
  generation: number;
}

export const initialChatState: ChatState = {
  messages: [],
  status: "idle",
  error: null,
  generation: 0,
};

export type ChatAction =
  | { type: "user-message-sent"; message: ChatMessageItem }
  | { type: "ai-response-received"; message: ChatMessageItem; generation: number }
  | { type: "send-failed"; error: string; generation: number }
  | { type: "conversation-reset" }
  | { type: "conversation-loaded"; messages: ChatMessageItem[] };

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "user-message-sent":
      // SC-01: the user's message is appended immediately, before any AI
      // response arrives.
      return {
        ...state,
        messages: [...state.messages, action.message],
        status: "sending",
        error: null,
      };
    case "ai-response-received":
      if (action.generation !== state.generation) {
        // Stale: issued for a conversation that a New Chat has since reset.
        // Drop it silently rather than showing a reply for the wrong chat.
        return state;
      }
      return {
        ...state,
        messages: [...state.messages, action.message],
        status: "idle",
        error: null,
      };
    case "send-failed":
      if (action.generation !== state.generation) {
        return state;
      }
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
      return { ...initialChatState, generation: state.generation + 1 };
    case "conversation-loaded":
      // Opening a past conversation from the sidebar (Linear TTO-10,
      // AC-06/SC-07): replaces the current messages with the selected
      // conversation's full history — it does not append to whatever was
      // showing before. Bumps `generation` exactly like `conversation-reset`
      // does, so a Send (or another switch) still in flight for the
      // conversation being switched away from can't have its late-arriving
      // result corrupt this view (same race New Chat's reset already guards
      // against).
      return {
        ...initialChatState,
        messages: action.messages,
        generation: state.generation + 1,
      };
    default:
      return state;
  }
}
