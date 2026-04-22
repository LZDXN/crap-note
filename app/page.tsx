import { listNotes, storageMode } from "@/lib/storage";
import { HomeClient } from "./_components/HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const notes = await listNotes();
  return <HomeClient initialNotes={notes} storageMode={storageMode} />;
}
