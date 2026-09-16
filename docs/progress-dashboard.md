# Progress dashboard

## Behavior

- The week runs Monday through Sunday in the browser's IANA timezone.
- A saved workout represents a completed session. New entries must be dated today
  or earlier in that timezone; workout dates are calendar dates, stored at UTC midnight.
- The dashboard shows workouts through today, recorded minutes, distinct active
  days, and three recent sessions. Missing duration is different from recorded zero.
- Select a day to see all sessions on that date. Select it again or choose
  **Show recent** to restore the recent list. Notes expand using native details controls.
- Empty days offer a logging action with the selected date prefilled. That date
  survives signing in or creating an account; invalid or future dates default to today.
- Dayform uses a shared warm theme across the dashboard and authentication screens.
  Selected days have a 4px yellow outline. Short transitions respond to interaction
  and data changes, with reduced-motion preferences respected.
- The header includes a locally served landscape photograph; its source and
  license are recorded in `frontend/src/assets/photos/README.md`. A custom SVG
  stretching mascot accompanies recorded minutes. It animates once when the
  displayed workout count increases, and stops when reduced motion is enabled.
- Workout logging offers six illustrated activity choices, editable names, duration
  presets and custom minutes, and optional collapsed notes. The date defaults to
  today or the selected dashboard date. History groups sessions by calendar date.
- **Log again** copies the name and duration into a new draft; saving remains
  explicit. Notes are not copied. Drafts and history filters reset on account changes.
  History supports searching names and notes, All time/This week filters, session
  counts and recorded minutes. Saving clears filters so the new session is visible.
  Ten sessions are shown initially; Show more reveals the next ten. Search and
  totals cover the full loaded history. A backdated new session is revealed too.
- The pencil in Your sessions opens an inline editor for name, date, duration and
  notes. Save changes updates the same record, preserving ownership and creation
  time. Validation and failed requests retain the draft; Cancel leaves data unchanged.
- Each successful save briefly fills its new history row with burgundy and one
  encouragement, then reveals the normal record after 1.5 seconds. Consecutive saves
  cycle through four phrases while the workout page is open. Refreshes never replay
  the effect; reduced motion skips it. Screen readers receive one factual save
  announcement. Failed saves keep the draft and never show success feedback.
- Recent workouts shows only the latest three sessions with activity illustrations
  and duration bars on desktop, compact illustrated rows on mobile, and a View all
  link to the full history. Artwork is selected from recognizable activity names;
  other names use the custom illustration. Exact names and durations remain visible.
  The empty state offers compact, text-only logging actions.
- A small, labeled trash button is available in history, recent sessions and
  selected-day lists. Your sessions confirms removal inside the chosen row;
  dashboard lists use a native modal. Both identify the exact session. Cancellation keeps
  the record; successful deletion refreshes summaries and lists across open tabs.
  Failed requests keep the dialog available for retry. Deletion is permanent.
- The weekly widget compares workout count against the same elapsed weekdays in
  the previous week. It does not compare a partial week against a completed week.
- Deep Insight swaps the recent preview for analytics, fetched only when opened.
  Both views expand and collapse smoothly; outgoing controls become inactive immediately.
  Inline session confirmations reveal from the clicked control and reverse on cancel.
  Reduced-motion preferences skip these transitions.
  Week comparison shows daily pairs; the four-week timeline includes daily history
  from three Mondays before this week through today. Workouts/Minutes controls,
  selectable days, keyboard access and a data table make both views inspectable.
  Missing durations are labeled and excluded from minute sums. Mobile timelines
  scroll horizontally. The entrance transition respects reduced motion.
- The first-workout invitation links to `/workouts?activity=Walk`; known activity
  presets can prefill the composer, with duration and saving still explicit.
  Unknown activity query values are ignored. Empty selected days retain their date.
- The sidebar account area uses an initials avatar, name and email, and separate
  labeled profile/logout controls below a divider. Mobile retains
  compact logout and navigation; short desktop sidebars scroll when needed.
- Existing future-dated records remain in workout history but do not count toward
  completed activity until their calendar day arrives.
- Both pages refresh on mount, return to the tab, workout-change notifications, and
  every minute while visible. Concurrent refresh triggers share a request. A change
  during a pending request invalidates its response and queues one fresh read.
- Requests time out after 20 seconds. Refresh failures retain the last loaded data;
  expired sessions clear workout data. Logout clears local authentication immediately.

## API additions

All workout routes require a bearer token and derive ownership from that token.
Responses use `Cache-Control: no-store`.

### GET /api/workouts/summary?timeZone=America%2FNew_York

Returns `today`, `weekStart`, `daily` (at most seven date/count/minutes/
`durationsRecorded` buckets), `previousWeek` (start, through, daily buckets for the
same elapsed weekdays), and `recent` (at most five workouts; the UI previews three).
The server calculates calendar boundaries, aggregates weekly data in MongoDB,
and queries recent sessions separately using the user/date/creation/id index.
The dashboard does not download a user's full workout history.

### GET /api/workouts/analytics?timeZone=America%2FNew_York

Returns `today`, `weekStart`, `windowStart`, and daily count/minutes/durationsRecorded
aggregates for at most 28 calendar days. Only the authenticated user's records are
included; future and older records are excluded. Invalid timezones return HTTP 400.

### GET /api/workouts?date=YYYY-MM-DD

Optional date filter for the selected-day view. Omitting it returns workout history.

### POST /api/workouts

Requires `name` (1–120 trimmed characters), `date` (valid YYYY-MM-DD), and
`durationMinutes` (finite, nonnegative number or numeric string). Also accepts
optional `notes` (up to 2,000 characters) and IANA `timeZone` (defaults to UTC).
Future dates are rejected using the server's current time in that timezone.
Older records without duration remain readable. New entries must supply duration.
Invalid fields return HTTP 400 with `message` and an `errors` map keyed by field.
A supplied `userId` is ignored; ownership always comes from authentication.

### PUT /api/workouts/:id

Uses the same full-field validation as POST. Updates only name, date, duration and
notes on a record owned by the token's user. Empty notes remove the old note. Returns
the updated workout, HTTP 400 for invalid details/ID, and 404 for missing or foreign
records. Ownership and creation time cannot be changed through this endpoint.

### DELETE /api/workouts/:id

Deletes a record using both its ID and the authenticated user's ID in one query.
Returns HTTP 204 on success, 400 for malformed IDs, and the same 404 response for
missing records and records owned by another user. Unauthenticated requests return 401. Client-supplied ownership fields are ignored.

See [test setup and coverage](../tests/README.md) for reproducible verification.
