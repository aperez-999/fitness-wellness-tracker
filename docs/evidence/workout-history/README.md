# Workout History & Management evidence

Captured October 12, 2026 from the real application using Playwright, Microsoft
Edge, and a disposable MongoDB database. The test clock is September 19, 2026;
the relative dates in the screenshots reflect that fixed clock.

See the [Sprint 3 acceptance report](../../capstone-2/sprint-3/workout-history-management.md)
for the review, implementation mapping, and reproduction commands.

| Evidence | What it demonstrates |
| --- | --- |
| [Desktop history](workout-history-desktop.png) | Names, dates, durations, newest-first ordering, and stable ordering for equal timestamps. |
| [Desktop edit](workout-history-edit.png) | Editable name, calendar date, duration, and notes with save/cancel controls. |
| [Mobile deletion](workout-history-delete-mobile.png) | Confirmation identifies the exact workout, date, and minutes; Keep session cancels. |
| [Mobile empty history](workout-history-empty-mobile.png) | Helpful empty state after the last record is deleted and the browser reloads. |
| [Database/reload assertions](workout-history-evidence.json) | Edited fields persist; deletion persists after reload; another account's record remains. |
| [Workout test results](workout-history-test-results.tap) | Complete workout/API/browser suite output, including both new acceptance tests. |

The JSON file is written only after its lifecycle assertions pass. Screenshots
illustrate the UI; privacy and persistence are established by API/database tests,
not inferred from screenshots.

## Run results

The first full integration run passed 40 of 41 tests. Its sole failure was the
first dashboard browser navigation exceeding the old eight-second timeout during
cold Vite startup. The test helper now allows 30 seconds for navigation only.
All 19 integration tests outside the dashboard suite passed in that run.

The updated complete workout suite passed **24/24** when run separately; its
individual test outcomes are preserved in the TAP file above. Unit tests passed
**39/39**, the two focused Sprint 3 tests passed **2/2**, and the production build
passed. The complete multi-feature command was not repeated after the
dashboard-only test changes.

No production data or credentials are included. Tests did not connect to Atlas,
deploy the application, or change the project board's verification/acceptance state.
