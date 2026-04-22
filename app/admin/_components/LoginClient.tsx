"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function LoginClient({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.replace("/admin");
        router.refresh();
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error || `Login failed (${res.status}).`);
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center px-5">
        <div className="w-full max-w-sm">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)] mb-2">
            Admin
          </div>
          <h1 className="font-serif text-2xl leading-tight mb-6">Sign in</h1>

          {!configured ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm p-4">
              Admin auth is not configured. Set{" "}
              <code className="font-mono text-[12px]">ADMIN_USERNAME</code>,{" "}
              <code className="font-mono text-[12px]">ADMIN_PASSWORD</code>, and{" "}
              <code className="font-mono text-[12px]">ADMIN_SESSION_SECRET</code> in{" "}
              <code className="font-mono text-[12px]">.env.local</code>, then restart the
              server.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="block text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-muted)] mb-1.5"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/30 focus:border-[color:var(--color-accent)]"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-muted)] mb-1.5"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/30 focus:border-[color:var(--color-accent)]"
                />
              </div>
              {error && (
                <div className="text-[12px] px-3 py-2 rounded bg-red-50 text-red-700 border border-red-200">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting || !username || !password}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-[color:var(--color-accent)] text-white disabled:opacity-50"
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}

          <div className="mt-6 text-[12px]">
            <Link href="/" className="text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]">
              ← Back to notes
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
