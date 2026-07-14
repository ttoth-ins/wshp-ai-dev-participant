import { createConversation as createConversationInDb } from "@/lib/db";
import { HomeView } from "@/components/chat/home-view";

// Chat UI (Linear TTO-7, AC-01) + sidebar (Linear TTO-9, AC-05). `createConversation`
// is a Server Action bootstrapping this chat's own conversation on first
// send, lazily. It is intentionally NOT the reusable `POST /api/conversations`
// endpoint added by TTO-8 (`src/app/api/conversations/route.ts`, used by the
// New Chat button) — keeping it as an inline action here (rather than a
// route) means it only runs when a message is actually sent, not during
// build or on every page load, so `/` stays statically prerenderable.
//
// The sidebar's initial list (SC-06) is fetched client-side by `HomeView`
// (`GET /api/conversations`) rather than awaited here, for the same reason:
// awaiting a direct `listConversations()` DB call in this Server Component
// would get baked into the static shell at build time (this project's
// caching model only treats `fetch`/request-time APIs as dynamic — see
// `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`),
// so every visit would see a stale, build-time snapshot of the conversation
// list instead of its current state.
export default function Home() {
  async function createConversation(): Promise<string> {
    "use server";
    const conversation = await createConversationInDb();
    return conversation.id;
  }

  return (
    <main className="flex flex-1">
      <HomeView createConversation={createConversation} />
    </main>
  );
}
