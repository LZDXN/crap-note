import { redirect } from "next/navigation";
import { isAuthed, isConfigured } from "@/lib/session";
import { LoginClient } from "../_components/LoginClient";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAuthed()) redirect("/admin");
  return <LoginClient configured={isConfigured()} />;
}
