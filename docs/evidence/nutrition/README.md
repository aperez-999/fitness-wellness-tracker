# Nutrition tracking evidence

Captured on 2026-09-28 from the actual React UI and Express routes backed by a
fresh disposable MongoDB instance. Accounts and food records are test fixtures.

- [Desktop UI](nutrition-desktop.png)
- [Mobile UI](nutrition-mobile.png)
- [API response and directly queried MongoDB record](nutrition-api-evidence.json)
- [Acceptance review and teammate checklist](../../nutrition-acceptance-review.md)

## Verification results

| Check | Result |
| --- | --- |
| Backend unit tests | 9 passed |
| Frontend unit tests | 8 passed |
| Nutrition API/MongoDB/browser tests | 7 passed |
| Existing dashboard/workout integration tests | 21 passed |
| Frontend production build | Passed |
| Nutrition desktop and mobile axe scans | 0 violations |
| Mobile page overflow at 390px width | None |
| Independent teammate review | Pending |

Tests ran using Node.js 22.20.0 on Windows, Microsoft Edge through Playwright,
and mongodb-memory-server. Commands from the repository root (use `node.exe`
in WSL with the Windows runtime):

```sh
node --test backend/tests/*.test.js
node --test frontend/tests/*.test.js
node --test --test-concurrency=1 tests/nutrition.test.js
node --test --test-concurrency=1 tests/dashboard.test.js
npm run build --prefix frontend
```

The nutrition test asserts the saved document matches all supplied nutrition
values, rejects client-supplied ownership, and verifies a different account gets
an empty list. Browser checks log in, submit the form, reload, reopen a browser
context with the persisted session, and confirm the saved entry is retrieved.
Additional checks cover invalid fields/JSON, request failures and retries, account
switching, expired sessions, late history responses, and duplicate submissions.

The screenshots show the reopened page after retrieving saved entries. The API
JSON is from a separate ownership test using the same oatmeal fixture. Record IDs
are generated anew per test. No credentials or tokens are included.

To identify the evidence commit after checkout:

```sh
git log -1 --format='%H %s' -- docs/evidence/nutrition
```
