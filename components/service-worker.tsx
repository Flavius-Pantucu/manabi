"use client";

import { useEffect } from "react";

/**
 * Service-worker lifecycle.
 *
 * In production it registers `/sw.js` and, when a new version is waiting,
 * activates it and reloads once so a stale bundle is never left in charge.
 *
 * In development it does the opposite: it **unregisters** any worker and
 * deletes its caches. A worker registered by an earlier `next start` on the
 * same origin keeps controlling `localhost` afterwards, so `next dev` gets
 * served cached production assets — code changes appear to do nothing, which
 * is indistinguishable from a bug that was never fixed.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        if (!regs.length) return;
        Promise.all(regs.map((r) => r.unregister()))
          .then(() =>
            typeof caches !== "undefined"
              ? caches.keys().then((keys) =>
                  Promise.all(
                    keys.filter((k) => k.startsWith("manabi-")).map((k) => caches.delete(k)),
                  ),
                )
              : null,
          )
          .then(() => {
            console.info(
              "[manabi] Removed a service worker left over from a production build. Reloading.",
            );
            window.location.reload();
          })
          .catch(() => {});
      });
      return;
    }

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // A worker in `waiting` means a newer build is ready but the old one
          // is still serving. Hand over immediately rather than next session.
          const promote = (w: ServiceWorker | null) => {
            if (w?.state === "installed" && navigator.serviceWorker.controller) {
              w.postMessage({ type: "SKIP_WAITING" });
            }
          };
          promote(reg.waiting);
          reg.addEventListener("updatefound", () => {
            const nw = reg.installing;
            nw?.addEventListener("statechange", () => promote(nw));
          });
        })
        .catch(() => {
          // Registration failing is not worth interrupting a learner over;
          // the app works online regardless.
        });

      let reloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      });
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
