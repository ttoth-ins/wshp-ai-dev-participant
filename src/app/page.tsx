import { createConversation as createConversationInDb } from "@/lib/db";
import { ChatView } from "@/components/chat/chat-view";

// Chat UI (Linear TTO-7, AC-01). `createConversation` is a Server Action
// bootstrapping this chat's own conversation on first send, lazily — it is
// intentionally NOT the reusable `POST /api/conversations` endpoint (that
// stays TTO-8's scope, with its own contract/tests). Keeping it as an inline
// action here (rather than a route) also means it only runs when a message
// is actually sent, not during build or on every page load.
export default function Home() {
  async function createConversation(): Promise<string> {
    "use server";
    const conversation = await createConversationInDb();
    return conversation.id;
  }

  return (
    <main className="flex flex-1 flex-col items-center p-4">
      <ChatView createConversation={createConversation} />
    </main>
  );
}
