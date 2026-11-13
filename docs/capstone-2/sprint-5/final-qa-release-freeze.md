# Sprint 5 — Final Application QA & Release Freeze

Story #1188 · Checked November 12, 2026

A final QA pass over the whole app before the release freeze, starting from
`main` at `4854caf` (PR #15). Every workflow was checked by the automated suites,
a new release QA test, a hand check with the local server stopped, and a
production smoke test with a made-up account. Ten issues were found. The three
P2 defects are fixed with tests: signup returned 500 for some malformed requests,
a failed session check signed users out, and a reply cut off partway blanked the
dashboard and Goals page. Two flaky dashboard tests and outdated docs are fixed
too. Nothing at P0 or P1 was found.

| Criterion | Result |
| --- | --- |
| Local repository is synchronized with the latest approved origin/main | Pass — the branch starts at `4854caf`, the newest commit on `origin/main` when checked, with a clean working tree. |
| Authentication, dashboard, workouts, nutrition, goals, profile, and AI Insights workflows are verified | Pass — covered by `core-workflow`, `google-signin`, `dashboard`, `dashboard-summary`, `nutrition`, `goals`, `profile`, and `insights` tests, by the release QA test on every page, and by hand in production. |
| Create, edit, delete, validation, and error-handling flows work as expected | Pass — the suites create, edit, and delete workouts, meals, and goals and edit the profile, and production repeated the main steps by hand. Bad input returns 400 with field messages. D1, D7, and D10 were error-handling defects and are fixed. |
| Frontend, backend, and integration test suites pass | Pass — 15 frontend, 61 backend, and 85 integration tests; both flaky dashboard tests are fixed. |
| Production frontend build succeeds | Pass — `npm run build --prefix frontend` (349.86 kB script). |
| Responsive layouts and keyboard accessibility are checked | Pass — every page at 1280, 390, 360, and 320 px: no sideways scrolling, no axe violations, Tab reaches every control with a visible focus indicator and never lands on a hidden or covered one, and the skip link works. Also checked by hand at 360 px in production. |
| Production smoke testing is completed without using private user data | Pass — a made-up `@example.com` account in a private window; see [Production checks](#production-checks). |
| Known limitations and any unresolved nonblocking issues are documented | Pass — see [Defects](#defects) and [Known limitations](#known-limitations). |
| No P0 or P1 defects remain open | Pass — none were found. The open issues are one P2 left by decision and four P3s. |

## Defects

P0: the app is down, data is lost, or one account sees another's data. P1: a
core workflow can't be completed. P2: works with a workaround, or only for
unusual requests or network conditions. P3: cosmetic or documentation.

| # | Defect | Priority | Status |
| --- | --- | --- | --- |
| D1 | Signup returned 500 when the password or display name was a number or an object | P2 | Fixed; live after the merge |
| D2 | The API accepts `@` as an email; the signup form blocks it | P3 | Open |
| D3 | `npm audit`: backend 2 critical, 1 high, 1 moderate (mongoose and Express dependencies); frontend 6 high, 2 moderate (Vite build tools and react-router); tests 1 high. Our code doesn't reach them: updates write only validated fields, Express doesn't trust proxy headers, the app redirects only to paths it set itself, and the build tools don't ship to users. | P2 | Open by decision (release freeze); run `npm audit fix` without `--force` after the release |
| D4 | The root README listed shipped features as planned and an old poster file; the Sprint 4 report said "Story ###" | P3 | Fixed |
| D5 | Signup doesn't apply the profile's 80-character display name limit; the form doesn't send a name | P3 | Open |
| D6 | Two dashboard tests each failed about one run in five to ten: the removal test checked the database before the DELETE finished, and the timeout test also saw the meals and goals card's alert | P3 | Fixed |
| D7 | Any failed session check (no network, 500, or 503) deleted the saved login, so users stayed signed out after the server recovered | P2 | Fixed |
| D8 | At 320 px the Profile tab is half hidden until the tab bar is swiped | P3 | Open |
| D9 | Deep Insight says "1 workouts more than last week" | P3 | Open |
| D10 | A success reply cut off partway was read as `{}`: the dashboard and Goals page went blank, and the Workouts page looked empty | P2 | Fixed |

## Production checks

Checked November 11–12, 2026, against `main`; production gets this branch's
fixes when it merges.

| Check | Result |
| --- | --- |
| Health | `{"status":"ok"}` |
| Requests without a valid token (session, workouts, nutrition, goals, dashboard) and with a made-up token | 401 each |
| Login with a non-text email | 400 "Email and password must be text" |
| Signup with a number password | 500: D1, fixed on this branch; 400 after the merge |
| CORS preflight from Dayform and from another origin | Both answered with `https://dayform-fitness.vercel.app` only |
| Refreshing `/dashboard` | 200 |
| Deployed frontend | Includes PR #15, with Google sign-in turned on |
| Click-through | The screenshots show the profile name, one workout of 30 minutes after a second was removed, a meal edited to 260 kcal, a counted workout goal at 1 / 3, and a manual goal at 5 / 5 under Completed ([desktop](../../evidence/final-qa-release-freeze/prod-dashboard-desktop.png), [phone](../../evidence/final-qa-release-freeze/prod-dashboard-phone.png), [completed goal](../../evidence/final-qa-release-freeze/prod-goals-desktop.png)). The signup and validation errors, refreshes, 360 px width, skip link, network panel, and logout were also checked, with no differences reported. |
| Not checked in production | Google sign-in, which needs a personal Google account (covered by `google-signin` tests with a stubbed Google check). The AI insight result was not recorded; it was [checked in production](../../evidence/wellness-insights/production/README.md) on November 11. |

**Behavior**

- Signup returns 400, not 500, when the password, its confirmation, or the
  display name isn't text.
- A success reply that can't be read counts as a network failure, so each page
  shows its own error message with Try again. Empty 204 replies to removals
  still count as success, and a read stopped by its timeout counts as a timeout.
- Only a 401 from the session check signs the user out. After no network, a 500,
  a 503, or a cut-off reply, the login page shows but the session is kept, and a
  reload signs back in once the server answers.

**Checks:** 61 backend and 15 frontend unit tests and the frontend build passed.
All 85 integration tests passed on a local MongoDB, 7 more than at the start: 6
release QA tests and 1 signup test. The release QA test caught six bugs added on
purpose (no focus outline, no timeline focus mark, a page wider than a phone, a
broken skip link, a zero-size control, and a fixed bar covering focused
controls). Each fix's test failed with the fix removed. Each flaky test failed
every time with its race forced by a delay, and passed after its fix. By hand:
production (above), and the local Workouts page with the server stopped, where a
failed save kept the draft and the list showed its error with Try again.

[Run tests](../../../tests/README.md#release-qa-checks) ·
[Screenshots](../../evidence/final-qa-release-freeze/) (also
[desktop](../../evidence/final-qa-release-freeze/release-qa-desktop-dashboard.png),
[Deep Insight](../../evidence/final-qa-release-freeze/release-qa-desktop-dashboard-deep-insight.png),
[320 px](../../evidence/final-qa-release-freeze/release-qa-narrow-dashboard.png),
[360 px goals](../../evidence/final-qa-release-freeze/release-qa-small-phone-goals.png))

## Known limitations

- During an outage the app shows the login page without saying the server is
  down; a reload signs back in once it answers.
- There is no error boundary, so an unexpected crash in one component still
  blanks the page. D10 removed the known cause.
- Logging out doesn't revoke the token on the server; it stays valid until it
  expires (7 days by default).
- The AI insight rate limit is kept per server instance.
- Nutrition and wellness goals are updated by hand. The dashboard lists three
  goals; the rest are on the Goals page. A nutrition entry that records a whole
  day counts as one meal.
- If a background refresh lands during a save, the Goals page slider can show
  the older number until the next refresh.
- On narrow phones the 4-week timeline opens at the oldest day; the card says to
  scroll.
- The made-up QA account remains in production because the app can't delete
  accounts. `CHANGELOG.md` stops at Sprint 1.

Ready for teammate review.
