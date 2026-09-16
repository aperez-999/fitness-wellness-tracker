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
