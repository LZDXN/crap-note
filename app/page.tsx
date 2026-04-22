import { listNotes, storageMode } from "@/lib/storage";
import { isAuthed, isConfigured } from "@/lib/session";
import { HomeClient } from "./_components/HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [notes, authed] = await Promise.all([listNotes(), isAuthed()]);
  return (
    <HomeClient
      initialNotes={notes}
      storageMode={storageMode}
      initialAuth={{ authenticated: authed, configured: isConfigured() }}
    />
  );
}
