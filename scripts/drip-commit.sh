#!/bin/bash
#
# Land one prepared commit from `dev` onto `main` and push it.
#
# The commits are built and reviewed up front on `dev`; this script never
# writes code. Its only verbs are cherry-pick and push, so nothing unreviewed
# can reach the remote.
#
# It works inside a dedicated git worktree rather than checking out `main` in
# your repo — checking out main would swap your working tree back to the old
# prototype and delete this script from disk mid-run.
#
# Each commit is re-dated to the moment it lands, because the commit genuinely
# is created then; pushing the whole stack stamped with the day it was drafted
# would collapse it into one day.
#
# Exits quietly when there is nothing to do. Safe to leave scheduled.

set -euo pipefail

REPO="/Users/flaviuspantucu/Projects/repositories/manabi"
WORKTREE="/Users/flaviuspantucu/Projects/repositories/.manabi-drip"
SOURCE="dev"
BRANCH="main"
REMOTE="origin"
LOG="$REPO/scripts/drip-commit.log"
MAX_PER_RUN="${MAX_PER_RUN:-1}"

mkdir -p "$(dirname "$LOG")" 2>/dev/null || true
# A logging failure must never abort a run that has already committed.
log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG" 2>/dev/null || true; }

if [ ! -d "$WORKTREE/.git" ] && [ ! -f "$WORKTREE/.git" ]; then
  log "STOP  worktree missing at $WORKTREE — recreate with: git worktree add $WORKTREE $BRANCH"
  exit 1
fi

cd "$WORKTREE"

# Someone may be poking at the worktree; never fight a dirty tree.
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  log "SKIP  drip worktree is dirty — leaving it alone"
  exit 0
fi

current="$(git rev-parse --abbrev-ref HEAD)"
if [ "$current" != "$BRANCH" ]; then
  log "SKIP  worktree on '$current', expected '$BRANCH'"
  exit 0
fi

if ! git rev-parse --verify --quiet "$SOURCE" >/dev/null; then
  log "STOP  no '$SOURCE' branch"
  exit 1
fi

if ! git fetch --quiet "$REMOTE" "$BRANCH" 2>/dev/null; then
  log "SKIP  cannot reach $REMOTE — will retry next run"
  exit 0
fi

# Remote moved ahead of us: a human pushed. Stop rather than guess.
if ! git merge-base --is-ancestor "$REMOTE/$BRANCH" "$BRANCH" 2>/dev/null; then
  log "STOP  $REMOTE/$BRANCH has commits local $BRANCH lacks — resolve by hand"
  exit 0
fi

# Commits on dev that main does not have yet, oldest first.
#
# `--cherry-pick --right-only` compares by patch id, not commit object. Plain
# `rev-list main..dev` keeps listing commits that already landed, because
# cherry-picking creates new objects — the script would reapply them forever.
#
# Plain string, not an array: macOS ships bash 3.2, which has no `mapfile`.
pending="$(git rev-list --reverse --right-only --cherry-pick "${BRANCH}...${SOURCE}")"
if [ -z "$pending" ]; then
  log "DONE  nothing pending — every commit has landed"
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

  GIT_AUTHOR_DATE="$(date -R)" GIT_COMMITTER_DATE="$(date -R)" \
    git commit --quiet --no-edit -C "$sha" --reset-author

  log "PICK  $(git rev-parse --short HEAD)  $subject"
  landed=$((landed + 1))
done

if [ "$landed" -eq 0 ]; then
  log "NOOP  nothing landed this run"
  exit 0
fi

if git push --quiet "$REMOTE" "$BRANCH" 2>/dev/null; then
  remaining="$(git rev-list --count --right-only --cherry-pick "${BRANCH}...${SOURCE}")"
  log "PUSH  $landed to $REMOTE/$BRANCH — $remaining remaining"
else
  log "WARN  commit landed locally at $(git rev-parse --short HEAD) but push failed"
  exit 1
fi
