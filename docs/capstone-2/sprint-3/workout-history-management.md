# Sprint 3 — Workout History & Management

Story #611 · Checked October 12, 2026

Existing workout features meet all eight criteria. This PR adds two acceptance
tests and fixes a browser-test startup timeout. Application code is unchanged.

| Criterion | Result |
| --- | --- |
| View saved workouts | Pass — signed-in users see their records. |
| Name, date, duration | Pass — shown in history. |
| Chronological order | Pass — newest first, including tied timestamps. |
| Edit workouts | Pass — changes save; cancellation keeps the original. |
| Delete workouts | Pass — confirmation deletes the selected record. |
| MongoDB persistence | Pass — edits and deletions survive reload. |
| User privacy | Pass — other users’ records cannot be read or changed. |
| Empty history | Pass — guidance appears, including after the last deletion. |

**Checks:** 39 unit tests, 24 workout tests, and the build passed. Another 19
integration tests passed in the initial run. Its startup timeout was fixed and
the workout suite rerun. Production and load testing were not performed.

[Run tests](../../../tests/README.md#sprint-3-workout-history-acceptance) ·
[Screenshots](../../evidence/workout-history/)

Ready for teammate review. Large histories still load all records from the API.
