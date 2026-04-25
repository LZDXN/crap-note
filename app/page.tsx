import { listNotes, storageMode } from "@/lib/storage";
import { isAuthed, isConfigured } from "@/lib/session";
import { effectiveVisibility } from "@/lib/types";
import { HomeClient } from "./_components/HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [notes, authed] = await Promise.all([listNotes(), isAuthed()]);
  const configured = isConfigured();
  const showAll = !configured || authed;
  const visible = showAll
    ? notes
    : notes.filter((n) => effectiveVisibility(n) === "public");
  return (
    <HomeClient
      initialNotes={visible}
      storageMode={storageMode}
      initialAuth={{ authenticated: authed, configured }}
    />
  );
}
