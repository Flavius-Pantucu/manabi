/**
 * Quiz results.
 *
 * Quizzes are generated fresh from the corpus on every run
 * (`lib/quiz/generate.ts`), so there is no quiz to fetch — only the record of
 * one being taken. An attempt and its answers are written in a single
 * transaction: a half-saved attempt would show up in the history as a score
 * with nothing behind it.
 */

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { ok, readJson, route } from "@/lib/api/respond";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { quizAttempt, quizAnswer, activity, userRevision } = schema;

const answerSchema = z.object({
  questionId: z.string().min(1).max(200),
  kind: z.string().min(1).max(40),
  prompt: z.string().min(1).max(500),
  options: z.array(z.string().max(300)).max(10),
  /** Null when the learner skipped it or ran out of time. */
  chosen: z.number().int().min(0).max(9).nullable(),
  answer: z.number().int().min(0).max(9),
  durationMs: z.number().int().min(0).max(3_600_000).optional(),
});

const attemptSchema = z.object({
  /** Client-minted, so an attempt finished offline and retried lands once. */
  clientId: z.string().min(1).max(64),
  quizId: z.string().min(1).max(120),
  quizTitle: z.string().min(1).max(200),
  kind: z.string().max(40).nullable().optional(),
  level: z.string().max(8).nullable().optional(),
  startedAt: z.number().int().positive().optional(),
  completedAt: z.number().int().positive(),
  durationMs: z.number().int().min(0).optional(),
  answers: z.array(answerSchema).min(1).max(200),
});

export const POST = route(async (req: Request) => {
  const me = await requireUser();
  const body = attemptSchema.parse(await readJson(req));

  // The score is recomputed from the answers rather than taken from the
  // request. A client that miscounts — or is edited to — cannot write a
  // total that its own answers contradict.
  const score = body.answers.filter((a) => a.chosen === a.answer).length;

  const result = await db.transaction(async (tx) => {
    const [rev] = await tx
      .insert(userRevision)
      .values({ userId: me.id, value: 1 })
      .onConflictDoUpdate({
        target: userRevision.userId,
        set: { value: sql`${userRevision.value} + 1` },
      })
      .returning({ value: userRevision.value });

    const [attempt] = await tx
      .insert(quizAttempt)
      .values({
        userId: me.id,
        clientId: body.clientId,
        quizId: body.quizId,
        quizTitle: body.quizTitle,
        kind: body.kind ?? null,
        level: body.level ?? null,
        score,
        total: body.answers.length,
        durationMs: body.durationMs ?? null,
        startedAt: body.startedAt ? new Date(body.startedAt) : null,
        completedAt: new Date(body.completedAt),
        revision: Number(rev.value),
      })
      // A retry of the same attempt returns the row already stored rather
      // than failing — the client cannot tell the two apart, and shouldn't.
      .onConflictDoNothing({ target: [quizAttempt.userId, quizAttempt.clientId] })
      .returning();

    if (!attempt) {
      const [existing] = await tx
        .select()
        .from(quizAttempt)
        .where(
          and(
            eq(quizAttempt.userId, me.id),
            eq(quizAttempt.clientId, body.clientId),
          ),
        );
      return { attempt: existing, duplicate: true };
    }

    await tx.insert(quizAnswer).values(
      body.answers.map((a, i) => ({
        attemptId: attempt.id,
        position: i,
        questionId: a.questionId,
        kind: a.kind,
        prompt: a.prompt,
        options: a.options,
        chosen: a.chosen,
        answer: a.answer,
        correct: a.chosen === a.answer,
        durationMs: a.durationMs ?? null,
      })),
    );

    await tx
      .insert(activity)
      .values({
        userId: me.id,
        action: `Scored ${score}/${body.answers.length} on ${body.quizTitle}`,
        category: "Quiz",
        clientId: `quiz:${body.clientId}`,
        revision: Number(rev.value),
        createdAt: new Date(body.completedAt),
      })
      .onConflictDoNothing({ target: [activity.userId, activity.clientId] });

    return { attempt, duplicate: false };
  });

  return ok(
    { attempt: result.attempt, score, total: body.answers.length, duplicate: result.duplicate },
    { status: result.duplicate ? 200 : 201 },
  );
});

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  /** Include the per-question breakdown. Off by default — it is 20x the bytes. */
  detail: z.coerce.boolean().default(false),
});

export const GET = route(async (req: Request) => {
  const me = await requireUser();
  const url = new URL(req.url);
  const { limit, detail } = listSchema.parse({
    limit: url.searchParams.get("limit") ?? undefined,
    detail: url.searchParams.get("detail") ?? undefined,
  });

  const attempts = await db
    .select()
    .from(quizAttempt)
    .where(eq(quizAttempt.userId, me.id))
    .orderBy(desc(quizAttempt.completedAt))
    .limit(limit);

  if (!detail || attempts.length === 0) return ok({ attempts });

  const answers = await db
    .select()
    .from(quizAnswer)
    .where(
      inArray(
        quizAnswer.attemptId,
        attempts.map((a) => a.id),
      ),
    )
    .orderBy(quizAnswer.position);

  const byAttempt = new Map<string, typeof answers>();
  for (const a of answers) {
    const list = byAttempt.get(a.attemptId) ?? [];
    list.push(a);
    byAttempt.set(a.attemptId, list);
  }

  return ok({
    attempts: attempts.map((a) => ({ ...a, answers: byAttempt.get(a.id) ?? [] })),
  });
});
