# Commit Conventions

Commit messages must follow the format defined in docs/commit_standard.md:

```
commit-message = keyword "(" main-area [ "/" sub-area ] ")": message
keyword = "feat" | "fix" | "refactor" | "docs" | "test" | "chore"
```

## Allowed Keywords

| Keyword | Meaning |
|---------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code refactor (no behavior change) |
| `docs` | Documentation only |
| `test` | Add or correct tests |
| `chore` | Maintenance / build / tooling |

## Frontend Main Areas

`features`, `core`, `ui`, `pages`, `api`

## Rules

- Use imperative mood ("add" not "added")
- Keep subject under 50 characters
- No trailing period on subject line
- `[sub area]` is optional
- Breaking changes: add `!` after the scope, or use a `BREAKING CHANGE:` footer in the body

## Example Messages

```
feat(features/auth): add sign-out flow and protected routes
fix(ui): address accessibility and responsive issues
feat(pages): implement public home page and update routing
test(features/jobs): cover job discovery flows
chore(frontend): pass production quality checks
feat(api)!: remove deprecated endpoint
```

## Validation

Every commit is validated by the native Git commit-msg hook at `.githooks/commit-msg`. Activate it with:

```sh
git config core.hooksPath .githooks
```

Messages that don't match the format are rejected at commit time.
