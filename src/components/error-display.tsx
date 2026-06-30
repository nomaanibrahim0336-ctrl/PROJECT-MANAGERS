"use client";

import { useEffect } from "react";

export function ErrorDisplay({
  error,
  reset,
  homeHref = "/",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const code = error.digest ?? "UNKNOWN";

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="surface-card w-full max-w-lg space-y-4 p-6">
        <div className="flex items-center gap-3">
          <span className="badge bg-red-100 text-red-800">Error {code}</span>
        </div>
        <h1 className="text-[18px] font-semibold text-(--color-ink)">
          Something went wrong
        </h1>
        <p className="whitespace-pre-wrap rounded-lg bg-[#EEF1F6] p-3 text-sm text-(--color-ink)">
          {error.message || "An unexpected error occurred."}
        </p>
        <p className="text-xs text-(--color-slate)">
          If this keeps happening, share error code <strong>{code}</strong> with support.
        </p>
        <div className="flex gap-2">
          <button onClick={reset} className="btn-primary">
            Try again
          </button>
          <a href={homeHref} className="btn-secondary">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
