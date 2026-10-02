# Progress dashboard checks

The integration suite starts the real Express workout and authentication routes,
a disposable MongoDB instance, Vite, and a headless browser. It uses generated test
accounts and a fixed clock. It does not load the application's backend `.env` or
connect to its configured database.

## Setup

Use Node.js 22 or newer. From the repository root:

```sh
npm ci --prefix backend
npm ci --prefix frontend
npm ci --prefix tests
```

Windows uses installed Microsoft Edge by default. On Linux/macOS, install the
bundled Chromium browser once:

```sh
npm run browsers --prefix tests
```

`TEST_BROWSER_CHANNEL` can select another installed Playwright browser channel.
On Linux CI, browser system libraries may also need installation with Playwright's
`install-deps chromium` command. MongoDB downloads its test binary on the first run.

## Run

```sh
npm test --prefix backend
npm test --prefix frontend
npm test --prefix tests
npm run build --prefix frontend
```

The browser suite checks server-side ownership, summary counts and date filters,
input validation, timezone boundaries, keyboard notes, day selection, responsive
layouts, accessibility, saves during pending reads, refresh coalescing, polling,
failed requests, immediate logout, and cross-tab account switching. It also checks
Dayform authentication screens, selected-day date prefilling through signup,
the selected outline, and reduced-motion behavior. Workout checks cover activity
and duration choices, editable repeats, failed-save recovery, database persistence
after browser reload, and clearing drafts when accounts change. History checks
cover name/note searches, date filters, counts, filter reset after save, and the
inline save confirmation: one phrase per save, cycling through four phrases,
automatic dismissal, no replay on refresh, and reduced-motion behavior.
The dashboard also checks local photograph loading, an image-failure fallback,
and mascot motion on increased activity, unchanged refreshes, and reduced motion.
Recent workout checks cover keyboard notes, relative dates, three illustrated sessions,
the first-walk prefill, short-screen account navigation, and mobile empty states.
Removal checks cover authentication and ownership, exact IDs for duplicate names,
confirmation/cancellation, keyboard focus, failed-request retry, mobile dialogs,
cross-tab updates, progress totals, and the last session on a selected day.
Editing checks cover ownership, invalid inputs, preserved IDs/creation times, note
clearing, failed-save retries, reload persistence, and moving sessions between weeks.
A 29-record fixture verifies ten-at-a-time history and the three-session preview.
Analytics checks cover lazy loading, same-weekday comparisons, bounded/private data,
duration totals, keyboard timeline selection, data tables and responsive layouts.

Screenshots are written to `tests/artifacts/` (ignored by Git). Test contexts,
servers, and the temporary database are closed after the suite finishes.

## Nutrition checks

Run only nutrition integration tests with `node --test tests/nutrition.test.js`
from the repository root. `npm test --prefix tests` runs both suites.
Nutrition tests use the actual API router, a disposable MongoDB database, and
Playwright. They cover required fields, malformed requests, authentication,
owner spoofing, bounded recent history, UI saves, failed-request recovery, reload
and browser-context reopen persistence, account switching, and accessibility.
Evidence is written to `tests/artifacts/nutrition-{desktop,mobile}.png` and
`tests/artifacts/nutrition-api-evidence.json`. No backend `.env` is loaded.

## Goal checks

Run only goal integration tests with `node --test tests/goals.test.js` from the
repository root. Goal tests use the actual API router, a disposable MongoDB
database, and Playwright. They cover authentication, required fields and invalid
input, owner spoofing, privacy between accounts, editing, slider progress saves,
completion raising progress to the target, overdue goals, deletion, reload
persistence, the phone layout, and accessibility. Evidence is written to
`tests/artifacts/goals-{desktop,mobile}.png` and
`tests/artifacts/goals-api-evidence.json`. No backend `.env` is loaded.

## Persistent local development database

If MongoDB is not installed/running locally, the existing test tools can start
its downloaded executable for normal app development:

```sh
npm --prefix tests run db:local
```

Keep that terminal open, then start the backend and frontend in separate terminals.
This binds MongoDB only to `127.0.0.1:27017` and stores data persistently in
`backend/.local-data/mongodb/` (ignored by Git). It does not delete data on exit.
Use only one MongoDB process on port 27017. The disposable test suites still use
separate temporary databases and do not touch this development database.
