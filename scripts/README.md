# Drip-commit

Lands one prepared commit from `queue` onto `main` and pushes it, twice a day.

The commits were built and reviewed up front on the `queue` branch. This
script never writes code — its only verbs are `cherry-pick` and `push`, so
nothing unreviewed can reach the remote.

## Status

```bash
git rev-list --count --right-only --cherry-pick main...queue   # commits left
tail scripts/drip-commit.log                                   # what happened
launchctl print gui/$UID/com.manabi.dripcommit | grep -E 'state|runs'
```

## Run one now, by hand

```bash
./scripts/drip-commit.sh              # land 1
MAX_PER_RUN=2 ./scripts/drip-commit.sh  # land 2
```

## Pause / resume / remove

```bash
launchctl bootout   gui/$UID/com.manabi.dripcommit                      # stop
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/com.manabi.dripcommit.plist  # start
rm ~/Library/LaunchAgents/com.manabi.dripcommit.plist                   # uninstall
```

## When it declines to act

It exits without doing anything if:

- the working tree is dirty — you are mid-edit, so it stays out of the way
- HEAD is not on `main`
- `origin/main` has commits local `main` does not — someone pushed; resolve by hand
- the network is unreachable
- the queue is empty

A cherry-pick conflict stops the run and leaves the tree clean.

## Schedule

09:12 and 18:41 local, one commit per run, via
`~/Library/LaunchAgents/com.manabi.dripcommit.plist`. Missed runs (laptop
asleep) are skipped, not stacked — the queue just takes a day longer.

## Note on dates

Each commit is re-authored to the moment it lands, because it genuinely is
created then. The code was written earlier in one session; the commit history
reflects when each change was published, not when it was drafted.
