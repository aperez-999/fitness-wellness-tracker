# AI wellness insights evidence

Checked October 27, 2026 · Branch `feat/ai-wellness-insights`

The dashboard's **Get my insight** button asks `POST /api/insights` for a short
Gemini insight about the signed-in user's last 28 days.

## How it works

- The route requires a login and reads only the token owner's workouts, nutrition
  entries, and goals. A `userId` in the request is ignored.
- The server reduces those records to totals before anything reaches Gemini: sessions
  and minutes per week, active days, the three most common activity names, nutrition
  entry counts and daily averages, and goal progress. Notes, food names, record IDs,
  email, and display name are never sent.
- Fewer than three records in the window returns a fixed message. Gemini is not called.
- Gemini is told to use only facts and numbers from the summary and to give general
  wellness information, never diagnoses or treatment. The server drops any observation
  containing a number that isn't in the summary. If nothing usable is left, the API
  returns 502 and the user can try again.
- The key stays in `backend/.env` as `GEMINI_API_KEY`, the same key as meal estimates.
  Missing key: 503. Google rate limit: 429 with `Retry-After`, and insights pause for
  everyone for 60 seconds. Each user gets 3 requests a minute (10 in total), one at a time.
- Meal estimates are unchanged.

## Acceptance criteria

| # | Criterion | Evidence |
| --- | --- | --- |
| 1 | Authenticated users can request an insight | Integration: login required, dashboard button |
| 2 | Uses saved workouts, nutrition, and goals | Integration: summary built from seeded records, tracked goal progress included |
| 3 | Summarized on the backend | Unit + integration: exact summary sent to Gemini |
| 4 | Consistency, trends, nutrition, goals | One observation per topic; [screenshots](#screenshots) |
| 5 | No fabricated records or values | Unit + integration: invented numbers are dropped or rejected (502) |
| 6 | Limited or no data | Integration: fixed message, no Gemini call |
| 7 | Key stays on the backend | Key sent only in a server-side header; never in responses or frontend code |
| 8 | No access to another user's data | Integration: spoofed `userId` ignored; other users' records never sent |
| 9 | Errors, outages, rate limits | Unit + integration: 503, 502, 429 with retry countdown |
| 10 | General wellness only | System instruction and on-screen "not medical advice" notice |
| 11 | Meal estimates still work | Unit + integration estimate checks |
| 12 | Automated tests | See below |

## Tests

```sh
npm test --prefix backend
npm test --prefix frontend
npm test --prefix tests
npm run build --prefix frontend
```

Results: 49 backend unit tests (9 new), 10 frontend unit tests, 58 browser and API
integration tests (7 new), and the production build all passed. Automated tests mock
Gemini and load no `.env` or real key. The browser checks cover 1440, 820, 390, and
320 px wide screens plus a landscape phone, with no horizontal scrolling, touch targets
at least 44 px tall, and no axe violations.

## Screenshots

Live Gemini (`gemini-3.5-flash-lite`) through the real dashboard, with synthetic data
in a throwaway database. Every number in the replies matches the seeded records.

- [Full dashboard](insights-live-dashboard.png) and [phone](insights-live-mobile.png)
- [Summary sent and replies received](live-gemini-check.json)

From the automated tests, with Gemini mocked:

- [Not enough data yet](insights-limited-mobile.png)
- [Rate limit with retry countdown](insights-rate-limit-mobile.png)
- [Summary sent for one user while another user's records stay out](insights-api-evidence.json)
