import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="relative mb-6">
        <span
          aria-hidden="true"
          className="select-none text-[120px] font-bold leading-none text-primary/10 md:text-[160px]"
        >
          404
        </span>
        <span
          lang="ja"
          className="absolute inset-0 flex items-center justify-center font-jp text-6xl font-bold text-foreground md:text-8xl"
        >
          迷子
        </span>
      </div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
        Page not found
      </h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        This page doesn&rsquo;t exist, or it has moved. Head back to the
        dashboard and pick up where you left off.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-e2 transition-colors duration-(--dur-1) hover:bg-primary-hover"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>
    </div>
  );
}
