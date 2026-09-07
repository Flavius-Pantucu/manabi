/**
 * Better Auth requires an absolute base URL and throws at module evaluation on
 * anything `new URL()` rejects, which takes the whole client bundle down with
 * it rather than degrading.
 *
 * The trap is that every host variable Vercel injects — `VERCEL_URL`,
 * `NEXT_PUBLIC_VERCEL_URL`, `VERCEL_BRANCH_URL` — is a bare hostname with no
 * scheme, so copying one into `NEXT_PUBLIC_APP_URL` produces a value that
 * looks right and parses as nothing. That is what threw
 * `Invalid base URL: manabi-preview.vercel.app` on the preview deployment.
 */
function absolute(value: string | undefined): string | undefined {
  const trimmed = value?.trim().replace(/\/+$/, "");
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Loopback is the only host we would ever reach without TLS.
  const scheme = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(trimmed)
    ? "http"
    : "https";
  return `${scheme}://${trimmed}`;
}

/**
 * The server's base URL. `BETTER_AUTH_URL` wins because Better Auth reads it
 * on its own anyway; the rest are here so a deployment that only sets one of
 * them still boots.
 */
export function serverBaseUrl(): string | undefined {
  return (
    absolute(process.env.BETTER_AUTH_URL) ??
    absolute(process.env.NEXT_PUBLIC_APP_URL) ??
    absolute(process.env.VERCEL_URL)
  );
}

/**
 * The browser's base URL. Returning `undefined` is a valid answer and not a
 * failure: Better Auth falls back to `window.location.origin`, which is the
 * right origin on a preview deployment whose hostname nobody configured.
 *
 * Each variable is read as a full static expression — Next inlines
 * `NEXT_PUBLIC_*` by literal match, so destructuring or indexing `process.env`
 * here would yield `undefined` in the bundle.
 */
export function clientBaseUrl(): string | undefined {
  return (
    absolute(process.env.NEXT_PUBLIC_APP_URL) ??
    absolute(process.env.NEXT_PUBLIC_VERCEL_URL)
  );
}
