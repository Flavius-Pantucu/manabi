"use client";

/**
 * Drives sync.
 *
 * Renders nothing. It watches the store and the session, and decides when to
 * talk to the server:
 *
 *   on sign-in         a full push — this browser may hold months of work done
 *                      before the learner ever had an account, and it must not
 *                      be stranded by the act of creating one
 *   after a change     debounced, so a 40-card session is one request and not
 *                      forty
 *   on reconnect       the queued work from being offline
 *   on hide/unload     a last flush, because a phone that gets locked mid-
 *                      session may not run another timer
 *
 * Everything is best-effort. A failed sync never surfaces as an error the
 * learner has to deal with mid-review — the state is safe in localStorage
 * either way, and the next attempt resends it.
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { mergeRemote, resetSrsState } from "@/lib/store/features/srs-slice";
import {
  mergeRemoteLearning, resetLearningState,
} from "@/lib/store/features/learning-slice";
import { useAuth } from "@/lib/auth-context";
import {
  claimState, clearSyncState, pushAndPull, readCursor, stateOwner, writeCursor,
} from "./client";

/** Long enough to coalesce a burst of reviews, short enough to feel live. */
const DEBOUNCE_MS = 4_000;

export type SyncStatus = "idle" | "syncing" | "offline" | "error" | "signed-out";

interface SyncContextValue {
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
  /** Force a round trip now — the "Sync" button on the profile page. */
  syncNow: (opts?: { full?: boolean }) => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const srs = useAppSelector((s) => s.srs);
  const learning = useAppSelector((s) => s.learning);

  const [status, setStatus] = useState<SyncStatus>("signed-out");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Held in refs so the sync callback can read current state without being
  // rebuilt on every keystroke — which would restart the debounce each time
  // and, in a long review session, mean it never fired at all.
  const stateRef = useRef({ srs, learning });
  stateRef.current = { srs, learning };

  const inFlight = useRef(false);
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(
    async (opts?: { full?: boolean }) => {
      if (!user) return;
      if (inFlight.current) {
        // Coalesce rather than queue: the next run reads current state
        // anyway, so a backlog of runs would all send the same thing.
        pending.current = true;
        return;
      }
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setStatus("offline");
        return;
      }

      inFlight.current = true;
      setStatus("syncing");
      try {
        const res = await pushAndPull({
          srs: stateRef.current.srs,
          learning: stateRef.current.learning,
          full: opts?.full,
        });

        // Only dispatch when something actually came back. An empty merge
        // still produces a new state object, which re-renders every screen
        // reading the store — during a review session, on a timer.
        const c = res.changes;
        if (c.cards.length || c.reviews.length || c.daily.length || c.settings) {
          dispatch(mergeRemote(c));
        }
        if (c.learning || c.statuses.length || c.bookmarks.length) {
          dispatch(mergeRemoteLearning(c));
        }

        setLastSyncedAt(Date.now());
        setError(null);
        setStatus("idle");
      } catch (e) {
        const message = e instanceof Error ? e.message : "Sync failed.";
        // A 401 means the session lapsed. Not an error worth showing — the
        // shell already renders a signed-out state.
        if (message.includes("401") || /sign in/i.test(message)) {
          setStatus("signed-out");
        } else {
          setError(message);
          setStatus(navigator.onLine === false ? "offline" : "error");
        }
      } finally {
        inFlight.current = false;
        if (pending.current) {
          pending.current = false;
          void run();
        }
      }
    },
    [dispatch, user],
  );

  // ── first sync after sign-in ──────────────────────────────────────────────
  const bootstrapped = useRef<string | null>(null);
  useEffect(() => {
    if (!user) {
      setStatus("signed-out");
      bootstrapped.current = null;
      return;
    }
    if (bootstrapped.current === user.id) return;
    bootstrapped.current = user.id;

    const owner = stateOwner();

    if (owner && owner !== user.id) {
      /**
       * A different account signed in on this browser.
       *
       * The persisted store still holds the previous learner's cards, streak
       * and quiz history. Left alone it would show up as this account's
       * progress — and worse, the push below would upload one person's study
       * history into another person's account. So it is thrown away first;
       * it is safe on the server under the account that owns it.
       */
      dispatch(resetSrsState());
      dispatch(resetLearningState());
      clearSyncState();
      writeCursor(0);
      claimState(user.id);
      void run();
      return;
    }

    /**
     * No owner recorded: whatever is here was accumulated signed-out.
     *
     * Adopting it is usually right — a week of study before signing up should
     * survive the act of signing up. But "there is state here" is not the same
     * as "there is study here": a prototype build of this app seeded fabricated
     * counters into localStorage, and adopting those wrote a streak and 42
     * words learned into a brand-new account.
     *
     * The review log is the honest test. Grading a card is the only thing that
     * appends to it, so a non-empty log means someone actually studied;
     * counters alone mean someone once loaded a page.
     */
    const studied = (stateRef.current.srs.log?.length ?? 0) > 0;

    if (!owner && !studied) {
      dispatch(resetSrsState());
      dispatch(resetLearningState());
    }

    claimState(user.id);
    void run({ full: studied && (!owner || readCursor() === 0) });
  }, [user, run, dispatch]);

  // ── debounced sync on change ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void run(), DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [srs, learning, user, run]);

  // ── reconnect, and leaving the page ───────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const onOnline = () => void run();
    const onHide = () => {
      if (document.visibilityState === "hidden") void run();
    };

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onHide);
    // `pagehide` fires on iOS where `beforeunload` does not — which is exactly
    // the platform most likely to kill the tab mid-session.
    window.addEventListener("pagehide", onHide);

    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [user, run]);

  const value = useMemo<SyncContextValue>(
    () => ({ status, lastSyncedAt, error, syncNow: run }),
    [status, lastSyncedAt, error, run],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used within SyncProvider");
  return ctx;
}

export { clearSyncState };
