# Backend

Postgres + Drizzle + Better Auth, behind Next route handlers. The app was
entirely client-side before this: auth was a `setTimeout` that ignored the
password, and every card, review and streak lived in one localStorage key.

## Getting it running

```bash
cp .env.example .env.local     # fill in DATABASE_URL and BETTER_AUTH_SECRET
pnpm db:migrate                # apply drizzle/*.sql
pnpm dev
```

`BETTER_AUTH_SECRET` signs session cookies and reset tokens —
`openssl rand -base64 32`. Changing it invalidates every session and every
outstanding reset link.

Without `RESEND_API_KEY`, password-reset emails are printed to the server log
with the link intact, which is enough to exercise the whole flow locally.

Any Postgres 13 or newer works (`gen_random_uuid()` is built in from 13).

| script | what it does |
| --- | --- |
| `pnpm db:generate` | diff the schema, write a new migration |
| `pnpm db:migrate` | apply pending migrations (non-interactive, CI-safe) |
| `pnpm db:studio` | browse the data |

## The tables

Eighteen, in four groups. Everything cascades from `user`, so deleting an
account really does remove all of it.

**Auth** — `user`, `session`, `account`, `verification`. Owned by Better Auth;
the column names are its contract, not free choices. The one addition is
`user.role`, declared with `input: false` so a sign-up request cannot set it.

**Scheduling** — `srs_card`, `review_log`, `daily_stat`, `srs_setting`,
`sync_device`, `user_revision`.

**Learning** — `learning_profile`, `bookmark`, `content_status`, `activity`.

**Quizzes and custom cards** — `quiz_attempt`, `quiz_answer`, `custom_deck`,
`custom_card`.

### Why `card_id` is text and not a foreign key

Cards are derived from content, not stored as rows. `lib/srs/decks.ts` mints
ids like `vocab:食べる@たべる:meaning` — keyed on the content itself, so
regenerating `public/data/` from JMdict cannot silently reassign a learner's
schedule to a different word. A numeric FK would reintroduce exactly the
fragility that naming scheme exists to avoid, and would mean the 8,034-word
corpus had to live in Postgres to be referenced at all.

The consequence: a card id that no longer appears in any deck keeps its row and
stops being scheduled, because the queue iterates over content and looks state
up, never the reverse. Orphans are inert, not broken.

## Sync

Offline-first. Review happens on trains; the server cannot arbitrate a grade
given without a network. So redux and localStorage stay the write path exactly
as before, and sync reconciles afterwards.

```
POST /api/sync    push what changed here → merge → receive what changed elsewhere
GET  /api/sync    pull only, for a cold start
```

One round trip, because a PWA on a bad connection should not need two.

### Ordering

Each synced row carries a `revision`, and the client keeps the highest it has
seen as its cursor. The counter is per user and lives in a row
(`user_revision`), not in a sequence:

- a timestamp ties — rows written in one transaction share `now()`, so
  `> cursor` drops a row that tied and `>=` resends forever;
- a global sequence leaves gaps — transaction A takes 100, B takes 101 and
  commits first, a reader takes 101 while A is still uncommitted, and row 100 is
  never seen again.

Bumping a row counter takes a row lock, so one learner's pushes serialise and
gaps cannot open, while different learners never contend.

### Conflicts

The rules are the ones `lib/srs/backup.ts` already used for file imports:

| data | rule |
| --- | --- |
| cards | most recently reviewed wins, whole row |
| review log | append-only, de-duplicated on (card, timestamp) |
| daily counters | per-field maximum |
| settings, profile | most recent edit wins |
| lifetime counters | maximum — they only ever go up |

Cards never merge field by field. A card is one coherent scheduling state;
taking `stability` from one device and `due` from another produces a card no
sequence of reviews could have created.

The server compares with `>=` and the client with `>`. The asymmetry is
deliberate: a device may hold edits it has not pushed yet, and a tie should not
let the server's older copy overwrite them.

Idempotency comes from the unique index on
`review_log (user_id, card_id, reviewed_at)`, so a client that loses its
acknowledgement can re-push a batch with no bookkeeping and no duplicates.

## Endpoints

| method | path | notes |
| --- | --- | --- |
| `*` | `/api/auth/*` | Better Auth: sign-up, sign-in, sign-out, session, forgot/reset password, change email/password, delete account |
| `POST` `GET` `DELETE` | `/api/sync` | push+pull, pull, forget a device |
| `GET` `PATCH` | `/api/me` | account, settings, headline counts |
| `GET` | `/api/progress` | retention, forecast, maturity, heatmap, leeches — aggregated in SQL |
| `GET` `POST` | `/api/quiz/attempts` | history; record an attempt with its answers |
| `GET` `POST` | `/api/decks` | custom decks |
| `GET` `PATCH` `DELETE` | `/api/decks/[id]` | one deck |
| `GET` `POST` | `/api/decks/[id]/cards` | cards, singly or in a batch |
| `PATCH` `DELETE` | `/api/decks/[id]/cards/[cardId]` | one card |
| `GET` `POST` | `/api/activity` | the feed |
| `GET` | `/api/admin/stats` | aggregates only; 404 to non-admins |

Handlers throw; `lib/api/respond.ts` turns `ApiError` and `ZodError` into one
consistent body and never leaks an internal message.

`/api/progress` exists even though the client can compute all of it locally,
because local state cannot answer honestly: the client caps its review log at
5,000 entries, and a learner on three devices has three partial histories.

## Custom flashcards

The only content Postgres owns — everything else is static JSON on the CDN, so
a learner's own cards are the one thing with nowhere else to live. They
schedule through the same FSRS code: a custom card's state is an ordinary
`srs_card` row keyed `custom:<uuid>`, which the scheduler, the queue builder
and the review screen never have to learn about.

## Deletions

Tombstones, not `DELETE`. A pull asks what changed after cursor N, and a
removed row is not a change — the learner's other devices would go on showing a
deck they deleted last week.

## Known limitations

- Avatar uploads are inlined as data URLs on the user row, capped at 96 KB.
  That was the existing behaviour; the string now rides in every session
  payload, so object storage is the real fix.
- Email verification is off (`requireEmailVerification: false`). Turn it on once
  a sending domain is configured; `sendVerificationEmail` is already wired.
- A client is trusted with its own scheduling state. The server stores the
  review log as the record of truth and can re-derive card state by replaying
  `lib/srs/scheduler.ts`, which is pure — but it does not do so today.
