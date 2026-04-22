"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-slate-900">
      <div
        aria-hidden
        className="select-none font-black tracking-[-0.08em] leading-none text-[40vw] md:text-[22rem]"
      >
        XD
      </div>
      <p className="mt-6 text-sm text-slate-500 text-center max-w-sm">
        Storage didn&apos;t respond. Check your Blob store or{" "}
        <code className="font-mono text-[11px] px-1 py-0.5 rounded bg-slate-100 border border-slate-200">
          BLOB_READ_WRITE_TOKEN
        </code>
        , then try again.
      </p>
      <button
        onClick={reset}
        className="mt-8 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
      >
        Try again
      </button>
      {error.digest && (
        <p className="mt-4 text-[10px] font-mono text-slate-400">digest: {error.digest}</p>
      )}
    </div>
  );
}
