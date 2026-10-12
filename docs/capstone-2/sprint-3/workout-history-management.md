# Sprint 3 — Workout History & Management

Story #611. Verified October 12, 2026 on `feat/sprint-3-workout-history`,
based on `9a87cc8` from `origin/main`.

## Simple review of the latest changes

What this change does: The previous nutrition branch was current with its remote,
but 17 commits behind main. The update brings in editable profiles, private wellness
goals with progress/completion controls, and Sprint 3 workflow tests and reports.

The workout feature was already implemented on the shared branch. This sprint
reuses its authenticated API, MongoDB model, searchable history, inline editor,
and removal confirmation. No application dependencies, database migrations, or
duplicate workout UI were needed.

The review traced workout reads and writes through authentication, validation,
database queries, API helpers, and the history components. Queries and mutations
include the authenticated user's ID; supplied owner IDs cannot change ownership.
Updates allow only validated workout fields and preserve the record ID and creation
time. Missing and foreign records both return 404. The history explicitly says
“newest first” and sorts by workout date, creation time, then record ID.

No application defects were found within this story's scope. Two gaps in explicit
acceptance coverage were filled: deterministic ordering when dates/timestamps tie,
and the complete last-session edit/delete/reload lifecycle. The first full test run
also exposed an eight-second cold Vite navigation timeout. Browser navigation now
allows 30 seconds; individual UI interactions retain their eight-second limit.

Assumed scale: the existing student capstone application and personal workout
histories. The API loads all of one user's history; the UI displays ten records at
a time. Server-side pagination remains a future requirement for very large histories.

## Acceptance criteria

All eight criteria pass the local API, database, and browser checks below.

| Criterion | Implementation | Verification |
| --- | --- | --- |
| Authenticated user can view previously saved workouts | Protected `/workouts` page; authenticated `GET /api/workouts` | Existing API/browser tests and the new ordered-history test retrieve saved MongoDB records. Missing/invalid credentials return 401. |
| History shows name/type, date, and duration | Workout name, calendar-date groups, minutes per session, optional notes | New browser checks assert rendered names, date attributes, and durations; desktop evidence shows all three. Activity presets are stored as names; there is no separate type field. |
| Workouts appear in clear chronological order | Descending `date`, `createdAt`, `_id`; “newest first” label | New test creates out-of-order dates and identical timestamps, verifies the exact IDs across repeated API reads, and checks the browser's name/date order. |
| User can edit an existing workout | Inline name/date/minutes/notes editor and owner-scoped `PUT` | Existing tests cover invalid inputs, retry after a failed save, cleared notes, and moving between weeks. New test verifies cancel, all persisted fields, unchanged identity, and reload. |
| User can delete an existing workout | Confirmation with exact session details and owner-scoped `DELETE` | Existing tests cover duplicate names, retry, keyboard cancellation, cross-tab updates, and totals. New test checks Keep session, confirmed final deletion, and MongoDB absence. |
| Changes persist in MongoDB and after refresh | Mongoose writes followed by fresh API reads | Direct database assertions and browser reloads verify both an edited record and its subsequent deletion. |
| User cannot view, edit, or delete another user's workouts | Token owner controls list filters and atomic update/delete queries | Existing tests reject foreign PUT/DELETE with 404 and test account switching. New history test ignores a forged `userId` query; final deletion leaves the other account's record intact. |
| Empty history is handled appropriately | “Your first session starts here” with logging guidance; separate no-match state | New test starts empty, edits/deletes its sole record, reloads, and asserts zero rows and an empty API result. Empty mobile history also passes the accessibility audit. |

## Added coverage and evidence

Both new tests are in [dashboard.test.js](../../../tests/dashboard.test.js):

- `Sprint 3 history orders calendar dates and ties consistently and keeps reads private`
- `Sprint 3 last workout edits persist and confirmed deletion restores empty history after reload`

The tests run real Express routes, a disposable MongoDB process, Vite, and Playwright
with Microsoft Edge. They use generated test accounts and a fixed application clock
of September 19, 2026. They do not load backend `.env` or use a shared database.

Evidence is stored in [docs/evidence/workout-history](../../evidence/workout-history/README.md).
Screenshots show desktop history and editing, mobile deletion confirmation, and
mobile empty history. JSON records the asserted edit/delete persistence results.

## Reproduce

From the repository root with dependencies and the test browser installed:

```sh
npm test --prefix backend
npm test --prefix frontend
node --test --test-name-pattern="Sprint 3" tests/dashboard.test.js
node --test tests/dashboard.test.js
npm test --prefix tests
npm run build --prefix frontend
```

This workspace uses Windows Node 22.20.0 through WSL, so the executed commands use
`node.exe` instead of `node`. The production build command is
`node.exe node_modules/vite/bin/vite.js build` from `frontend/`.

## Verification results

- Backend and frontend unit tests: **39 passed, 0 failed**.
- Focused Sprint 3 acceptance checks: **2 passed, 0 failed**.
- Complete workout/API/browser suite after the timeout fix: **24 passed, 0 failed**.
- Other integration suites (core workflow, goals, nutrition, profile): **19 passed,
  0 failed** in the initial full run; these files were unchanged by this sprint.
- Frontend production build: **passed**.

The initial full integration run was **40 passed, 1 failed** due to cold navigation.
The updated workout suite then passed in full, including the previously failing
test and the two new tests. The entire multi-feature command was not repeated after
the dashboard-only test changes. Raw workout results are saved with the evidence.

Verdict: Ship for teammate verification.

Production deployment, Atlas connectivity, and load testing were not performed.
Teammate verification and Product Owner acceptance remain board actions; this report
does not mark either as completed.
