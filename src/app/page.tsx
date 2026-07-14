import { createConversation as createConversationInDb } from "@/lib/db";
import { ChatView } from "@/components/chat/chat-view";

// Chat UI (Linear TTO-7, AC-01). `createConversation` is a Server Action
// bootstrapping this chat's own conversation on first send, lazily. It is
// intentionally NOT the reusable `POST /api/conversations` endpoint added by
// TTO-8 (`src/app/api/conversations/route.ts`, used by the New Chat button)
// — keeping it as an inline action here (rather than a route) means it only
// runs when a message is actually sent, not during build or on every page
// load, so `/` stays statically prerenderable.
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
