/**
 * Progress sync.
 *
 *   POST /api/sync   push local changes, receive everyone else's
 *   GET  /api/sync    pull only — for a cold start or a background refresh
 *
 * POST does both halves in one round trip on purpose. This is a PWA; a device
 * coming back from offline should reconcile in one request, not two, and the
 * server has already opened a transaction and computed the new cursor by the
 * time it would have to answer a separate pull.
 */

import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { ok, readJson, route } from "@/lib/api/respond";
import { pullQuerySchema, pushSchema, type SyncResponse } from "@/lib/sync/protocol";
import { applyPush, collectChanges, currentRevision } from "@/lib/sync/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const body = pushSchema.parse(await readJson(req));

  const { revision, applied } = await applyPush(user.id, body);

  // Changes are collected against the cursor the client sent, not the revision
  // this push just created — otherwise anything another device wrote while
  // this one was offline would be skipped over and lost for good.
  const changes = await collectChanges(user.id, body.cursor, body.deviceId);

  const res: SyncResponse = {
    cursor: revision,
    applied,
    changes,
    full: body.cursor === 0,
  };
  return ok(res);
});

export const GET = route(async (req: Request) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const { deviceId, cursor } = pullQuerySchema.parse({
    deviceId: url.searchParams.get("deviceId") ?? "",
    cursor: url.searchParams.get("cursor") ?? 0,
  });

  const changes = await collectChanges(user.id, cursor, deviceId);
  const revision = await currentRevision(user.id);

  await db
    .insert(schema.syncDevice)
    .values({ userId: user.id, deviceId, cursor, lastPullAt: new Date() })
    .onConflictDoUpdate({
      target: [schema.syncDevice.userId, schema.syncDevice.deviceId],
      set: { lastPullAt: sql`now()` },
    });

  const res: SyncResponse = {
    cursor: revision,
    changes,
    full: cursor === 0,
  };
  return ok(res);
});

/**
 * Forget a device. Not a delete of its data — the learner's progress is one
 * shared account — just of the cursor bookkeeping, so signing out on a
 * borrowed laptop leaves nothing behind.
 */
export const DELETE = route(async (req: Request) => {
  const user = await requireUser();
  const deviceId = new URL(req.url).searchParams.get("deviceId");
  if (deviceId) {
    await db
      .delete(schema.syncDevice)
      .where(
        and(
          eq(schema.syncDevice.userId, user.id),
          eq(schema.syncDevice.deviceId, deviceId),
        ),
      );
  }
  return ok({ ok: true });
});
