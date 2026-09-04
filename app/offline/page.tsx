import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline · Manabi" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="mb-5 flex size-14 items-center justify-center rounded-full bg-muted">
        <WifiOff className="size-6 text-muted-foreground" />
      </span>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
        You&rsquo;re offline
      </h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        This page hasn&rsquo;t been cached yet. Pages you&rsquo;ve already
        visited still work, and your reviews are stored on this device — so you
        can keep studying.
      </p>
      <Link
        href="/review"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-e2 transition-colors duration-(--dur-1) hover:bg-primary-hover"
      >
        Go to review
      </Link>
    </div>
  );
}
