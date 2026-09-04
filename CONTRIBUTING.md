# Contributing Guide

Thank you for taking the time to contribute! Please read this guide before opening issues or submitting pull requests.

---

## Table of Contents

- [Commit Messages](#commit-messages)
- [Branch Naming](#branch-naming)
- [Pull Requests](#pull-requests)
- [Releases & Tags](#releases--tags)

---

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

### Types

| Type       | When to use                                      |
|------------|--------------------------------------------------|
| `feat`     | A new feature                                    |
| `fix`      | A bug fix                                        |
| `docs`     | Documentation changes only                      |
| `style`    | Formatting, whitespace — no logic change         |
| `refactor` | Code restructure without feature or fix          |
| `test`     | Adding or updating tests                         |
| `chore`    | Build process, tooling, dependency updates       |
| `perf`     | Performance improvements                         |
| `ci`       | CI/CD configuration changes                     |
| `revert`   | Reverting a previous commit                      |

### Rules

- Use the **imperative mood**: `add feature` not `added feature`
- Keep the summary **under 72 characters**
- **Capitalize** the first letter after the colon
- **No period** at the end of the summary line
- Reference issues in the footer: `Closes #42` or `Refs #42`

### Examples

```
feat(auth): add OAuth2 login support
fix(cart): correct item count on page refresh
docs(readme): update local setup instructions
refactor(api): simplify error handling middleware
chore(deps): bump lodash from 4.17.20 to 4.17.21
test(user): add unit tests for registration flow

fix(checkout): prevent duplicate order submissions

The submit button was not being disabled after the first click,
causing multiple POST requests to be fired.

Closes #87
```

---

## Branch Naming

### Format

```
<type>/<short-description>
```

With a ticket or issue number (recommended):

```
<type>/<ticket-id>-<short-description>
```

### Types

| Type       | Purpose                              |
|------------|--------------------------------------|
| `feat`     | New feature development              |
| `fix`      | Bug fix                              |
| `hotfix`   | Urgent production fix                |
| `chore`    | Tooling, maintenance, dependencies   |
| `docs`     | Documentation updates                |
| `test`     | Test additions or refactors          |
| `release`  | Release preparation                  |

### Rules

- All **lowercase**
- Words separated by **hyphens** (no underscores or spaces)
- Keep it **short and descriptive** (3–5 words)
- Always include a **type prefix**

### Examples

```
feat/user-authentication
fix/PROJ-123-login-redirect-loop
hotfix/payment-crash
chore/upgrade-to-node-20
docs/api-reference-update
release/v2.4.0
```

---

## Pull Requests

### Title

Match the commit format: `type(scope): description`

```
feat(auth): add OAuth2 login support
fix(cart): correct item count on page refresh
```

### Checklist before opening a PR

- [ ] Branch is up to date with `main` (or the target base branch)
- [ ] All existing tests pass
- [ ] New code is covered by tests where applicable
- [ ] Documentation is updated if needed
- [ ] PR is linked to a relevant issue

### Guidelines

- **Keep PRs small and focused** — one concern per PR makes review faster and safer
- Use **draft PRs** for work in progress — this signals it's not ready for review
- Add a clear description explaining *what* changed and *why*
- Request at least **one reviewer** before merging

### Linking issues

Use GitHub keywords in the PR description to auto-close issues on merge:

```
Closes #42
Fixes #10
Refs #55
```

---

## Releases & Tags

We use [Semantic Versioning](https://semver.org/): `vMAJOR.MINOR.PATCH`

| Segment  | When to bump                              |
|----------|-------------------------------------------|
| `MAJOR`  | Breaking changes                          |
| `MINOR`  | New backwards-compatible features         |
| `PATCH`  | Backwards-compatible bug fixes            |

### Examples

```
v1.0.0   – first stable release
v1.1.0   – new feature added
v1.1.1   – bug fix
v2.0.0   – breaking change introduced
```

Tags should always be created from the `main` branch and accompanied by a GitHub Release with a changelog.
