#!/bin/bash
#
# Land one prepared commit from the `queue` branch onto `main` and push it.
#
# The commits are built and reviewed up front on `queue`; this script never
# writes code. Its only verbs are cherry-pick and push, so nothing unreviewed
# can reach the remote.
#
# Each commit is re-dated to the moment it lands (--reset-author), because the
# commit genuinely is created then — the alternative, pushing a batch all
# stamped with the day they were drafted, would collapse into a single day.
#
# Exits quietly when the queue is exhausted; safe to leave scheduled.

set -euo pipefail

REPO="/Users/flaviuspantucu/Projects/repositories/manabi"
BRANCH="main"
QUEUE="queue"
REMOTE="origin"
LOG="$REPO/scripts/drip-commit.log"
MAX_PER_RUN="${MAX_PER_RUN:-1}"

cd "$REPO"

mkdir -p "$(dirname "$LOG")" 2>/dev/null || true
# Never let a logging failure abort the run — `set -e` would otherwise kill the
# script after a commit had landed but before it was pushed.
log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG" 2>/dev/null || true; }

# Never fight a human mid-edit: a dirty tree means work is in progress.
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  log "SKIP  working tree is dirty — not touching it"
  exit 0
fi

current="$(git rev-parse --abbrev-ref HEAD)"
if [ "$current" != "$BRANCH" ]; then
  log "SKIP  on branch '$current', expected '$BRANCH'"
  exit 0
fi

if ! git rev-parse --verify --quiet "$QUEUE" >/dev/null; then
  log "SKIP  no '$QUEUE' branch — nothing left to land"
  exit 0
fi

# Commits on queue that main does not have yet, oldest first.
#
# `--cherry-pick --right-only` compares by patch id, not commit object. Plain
# `rev-list main..queue` would keep listing commits that have already landed,
# because cherry-picking creates new objects — the script would then try to
# reapply them every run and stage nothing.
#
# Read into a plain string rather than an array: macOS ships bash 3.2, which
# has no `mapfile`, and this script must run under /bin/bash.
pending="$(git rev-list --reverse --right-only --cherry-pick "${BRANCH}...${QUEUE}")"
if [ -z "$pending" ]; then
  log "DONE  queue is empty — every commit has landed"
  exit 0
fi

if ! git fetch --quiet "$REMOTE" "$BRANCH" 2>/dev/null; then
  log "SKIP  cannot reach $REMOTE — will retry next run"
  exit 0
fi

# If the remote moved ahead, a human pushed something; stop rather than guess.
if ! git merge-base --is-ancestor "$REMOTE/$BRANCH" "$BRANCH"; then
  log "STOP  $REMOTE/$BRANCH has commits not in local $BRANCH — resolve by hand"
  exit 0
fi

landed=0
for sha in $pending; do
  [ "$landed" -ge "$MAX_PER_RUN" ] && break
  subject="$(git log -1 --format=%s "$sha")"

  if ! git cherry-pick --no-commit "$sha" >/dev/null 2>&1; then
    git cherry-pick --abort >/dev/null 2>&1 || true
    git reset --hard --quiet HEAD
    log "FAIL  conflict on ${sha:0:7} ($subject) — stopping"
    exit 1
  fi

  # An empty pick means the change is already present; drop it and move on.
  if git diff --cached --quiet; then
    git reset --hard --quiet HEAD
    log "SKIP  ${sha:0:7} already applied ($subject)"
    continue
  fi

  # Re-author to now: this commit is genuinely being created today.
  GIT_AUTHOR_DATE="$(date -R)" GIT_COMMITTER_DATE="$(date -R)" \
    git commit --quiet --no-edit -C "$sha" --reset-author

  new="$(git rev-parse --short HEAD)"
  log "PICK  $new  $subject"
  landed=$((landed + 1))
done

if [ "$landed" -eq 0 ]; then
  log "NOOP  nothing landed"
  exit 0
fi

if git push --quiet "$REMOTE" "$BRANCH" 2>/dev/null; then
  remaining="$(git rev-list --count --right-only --cherry-pick "${BRANCH}...${QUEUE}")"
  log "PUSH  $landed commit(s) to $REMOTE/$BRANCH — $remaining remaining"
else
  log "WARN  pushed nothing: push failed, commits are local at $(git rev-parse --short HEAD)"
  exit 1
fi
