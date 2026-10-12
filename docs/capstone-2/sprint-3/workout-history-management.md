# Sprint 3 — Workout History & Management

Story #611 · Verified October 12, 2026 · `feat/sprint-3-workout-history`

The workout functionality already existed. This sprint added two acceptance tests
for tied-date ordering and the final-workout edit/delete/reload flow, plus screenshots.
Browser navigation timeout increased from 8 to 30 seconds to allow cold Vite startup.
Application code was unchanged.

## Acceptance criteria — all passed

| Criterion | Verified behavior |
| --- | --- |
| View saved workouts | Signed-in users see their saved records; unauthenticated requests return 401. |
| Useful details | History shows name, date, duration, and optional notes. Activity presets use the name field. |
| Chronological order | Newest first, with consistent ordering when dates and creation times match. |
| Edit workouts | Name, date, duration, and notes save correctly; cancellation and invalid input preserve records. |
| Delete workouts | Confirmation removes the exact record; cancellation keeps it. |
| MongoDB persistence | Database checks and browser reloads confirm edits persist and deletions remain deleted. |
| Ownership protection | Users cannot read, edit, or delete another account’s workouts, including with forged owner IDs. |
| Empty history | Helpful guidance appears for new accounts and after deleting the last workout; mobile accessibility passes. |

## Verification

| Check | Result |
| --- | --- |
| Backend/frontend unit tests | 39 passed |
| Workout API/browser suite, including both new tests | 24 passed |
| Other integration suites | 19 passed in the initial run |
| Production build | Passed |

The initial full run had one cold-start timeout. After the timeout fix, the complete
workout suite passed; the unchanged feature suites were not rerun. Tests used a
disposable MongoDB database and Playwright, with a fixed September 19, 2026 clock.

[Tests](../../../tests/dashboard.test.js) ·
[Run instructions](../../../tests/README.md#sprint-3-workout-history-acceptance) ·
[Screenshots, database assertions, and test output](../../evidence/workout-history/README.md)

Ready for teammate verification and Product Owner acceptance.
Production/Atlas and load testing were not performed. History still loads all of
one user’s records, displaying ten at a time.
