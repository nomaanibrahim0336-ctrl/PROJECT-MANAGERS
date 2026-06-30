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

  const code = error.digest ?? "UNKNOWN";

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-[#EEF1F6] p-8 font-sans text-[#1E293B]">
        <div className="w-full max-w-lg space-y-4 rounded-xl border border-red-200 bg-white p-6 shadow-sm">
          <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
            Error {code}
          </span>
          <h1 className="text-[18px] font-semibold">A critical error occurred</h1>
          <p className="whitespace-pre-wrap rounded-lg bg-[#EEF1F6] p-3 text-sm">
            {error.message || "An unexpected error occurred."}
          </p>
          <p className="text-xs text-slate-500">
            If this keeps happening, share error code <strong>{code}</strong> with support.
          </p>
          <div className="flex gap-2">
            <button
              onClick={reset}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Try again
            </button>
            <a
              href="/"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
