# Sprint 3 — Charts & Analytics

## Ticket overview

Authenticated users should understand their workout activity over time from their own saved workouts. The ticket covers workout charts only. Nutrition analytics, goals, profile, and AI recommendations stay out of scope.

## Existing functionality discovered

The application already had this ticket's behavior before Sprint 3 review:

- The dashboard weekly rhythm chart shows workout counts for Monday–Sunday in the browser timezone, plus a same-weekday comparison with last week.
- Deep Insight, opened from the dashboard, loads `GET /api/workouts/analytics` and shows a week-comparison bar chart and a four-week timeline. Users can switch between workout counts and recorded minutes.
- Totals come from MongoDB aggregation of the signed-in user's `workouts` documents (`date`, `durationMinutes`, and name on the underlying records). Missing duration is not treated as zero minutes.
- Adding, editing, or deleting a workout notifies open dashboard views. The summary and analytics requests also refresh on mount, when the tab becomes visible, and about once a minute while the page is visible. A browser refresh loads the current database values.
- A user with no workouts sees "Your first workout belongs here." on the dashboard and an empty recent list. Analytics for that user return an empty daily list, so charts show zeros rather than sample workouts.
- One account cannot read another's summary or analytics. The user id comes from the JWT. A `userId` query parameter is ignored.

## Changes implemented

No application code was changed. The weekly rhythm chart, Deep Insight charts, ownership checks, empty state, and refresh behavior already satisfied the acceptance criteria. Rebuilding them would have duplicated working dashboard and workout features.

## Data source

`GET /api/workouts/summary` and `GET /api/workouts/analytics` require the existing bearer token. Both aggregate `workouts` where `userId` matches `req.user.id`. Dates are calendar dates stored at UTC midnight and grouped with `timezone: "UTC"`, which matches how workout dates are saved. The week starts Monday. Analytics covers the current week and the three weeks before it, through today. Future-dated records are excluded from the charts.

## Analytics calculations

- Workout count is the number of matching documents per calendar day.
- Recorded minutes are the sum of numeric `durationMinutes` values. Sessions without a duration stay in the count and are labeled separately.
- This week is compared with the same elapsed weekdays last week, not with a completed seven-day week.
- The four-week timeline uses the same daily buckets.

## Acceptance criteria verification

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Analytics use the authenticated user's data | Met | `requireAuth` and `req.user.id` in `backend/src/routes/workouts.js`. Integration tests reject a missing token and ignore a spoofed `userId`. |
| Workout activity over time is shown in a clear chart | Met | Weekly rhythm bars on the dashboard. Deep Insight adds weekday comparison bars and a four-week timeline. |
| Charts use persisted MongoDB data | Met | `Workout.aggregate` groups stored records. Tests compare totals with inserted documents. |
| Charts update when workouts change | Met | Save, edit, and delete dispatch `fwt_workouts_changed`. Dashboard tests cover refresh, cross-tab updates, and polling. |
| Empty data is handled clearly | Met | Empty summary and analytics payloads are `[]`. The dashboard empty state invites the first workout and does not invent totals. |
| Usable on desktop and mobile | Met | Dashboard integration test checks responsive layouts, including mobile widths, without horizontal overflow. The timeline scrolls on small screens. |
| Existing dashboard and workout flows still work | Met | The existing dashboard suite passed without code changes. |

## Testing results

Run on October 9, 2026, against the current tree:

- `npm test` in `frontend`: 10 passed, 0 failed. Includes weekday comparison, empty weeks, and date grouping across DST boundaries.
- `node --test dashboard.test.js` in `tests`: 22 passed, 0 failed. Covers real summary totals, owner isolation, analytics totals, Deep Insight, add/edit/delete refresh, empty accounts, and desktop and mobile layout.

No production user records were used. The integration suite uses a temporary MongoDB instance and generated accounts.

## Remaining limitations

- Deep Insight is a second view on the dashboard. It is not a separate page, and it is fetched only after the user opens it.
- Charts summarize counts and minutes by day. They do not break totals down by workout name.
- Nutrition and goals are not part of these charts.
