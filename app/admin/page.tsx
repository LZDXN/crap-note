import { redirect } from "next/navigation";
import { isAuthed, isConfigured } from "@/lib/session";
import { listNotes } from "@/lib/storage";
import { AdminClient } from "./_components/AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!isConfigured()) redirect("/admin/login");
  if (!(await isAuthed())) redirect("/admin/login");
  const notes = await listNotes();
  const username = process.env.ADMIN_USERNAME || "";
  return <AdminClient initialNotes={notes} username={username} />;
}
