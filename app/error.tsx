"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span
        lang="ja"
        aria-hidden="true"
        className="mb-6 select-none font-jp text-8xl font-bold leading-none text-destructive/15 md:text-9xl"
      >
        エラー
      </span>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
        Something went wrong
      </h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        We couldn&rsquo;t load this page. Trying again usually fixes it; if it
        keeps happening, reload the browser.
      </p>
      {/* The digest is the only handle support has on a specific failure, so
          it is shown rather than swallowed into the console. */}
      {error.digest && (
        <p className="mb-6 font-mono text-xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-e2 transition-colors duration-(--dur-1) hover:bg-primary-hover"
      >
        <RotateCcw className="size-4" />
        Try again
      </button>
    </div>
  );
}
