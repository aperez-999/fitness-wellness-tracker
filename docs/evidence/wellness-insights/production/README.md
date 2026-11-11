# AI insights: production validation and privacy review

Checked November 10, 2026 · Branch `chore/ai-insights-production-validation`

The wellness insight feature was checked on the deployed app
(<https://dayform-fitness.vercel.app>, API at
<https://fitness-wellness-tracker.vercel.app/api>) with live Gemini
(`gemini-3.5-flash-lite`) and the Atlas `dayform_demo` database. The insight code was
also reviewed for security and privacy. No backend code changed.

## Result

| # | Criterion | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Verified end to end in production with a dedicated demo account | Met | Two demo accounts; insight requested through the API and the real dashboard |
| 2 | Eligible users get insights from their own workouts, nutrition, and goals | Met | Every number in the live replies matches the demo account's records |
| 3 | Insufficient-data, rate-limit, and service-error states | Met | All three seen in production, in the API and the dashboard |
| 4 | Gemini credentials stay on the backend | Met | Browser contacted only the two Dayform hosts; no key or Google endpoint in the deployed script or in responses |
| 5 | Authentication and user-data isolation | Met | 401 without a valid token; a spoofed `userId` is ignored; the other account's records never appear |
| 6 | Docs disclose the activity names and goal titles sent to Gemini | Met | [What reaches Gemini](#what-reaches-gemini); evidence README, main README, and dashboard text corrected |
| 7 | Per-instance limits of the in-memory rate limiter are documented | Met | [Rate limiter limits](#rate-limiter-limits) |
| 8 | Automated tests pass and production findings are recorded | Met | [Tests](#tests); [production-findings.json](production-findings.json) |
| 9 | No unnecessary changes to the AI integration | Met | One sentence of dashboard text changed; no backend change |

## Production checks

Two accounts were created on the deployed app for this check:
`dayform-insights-demo-736322@example.com` (4 workouts, 2 meals, 1 tracked goal) and
`dayform-insights-other-736322@example.com` (1 workout named "Zzyzx paddle"). All
records are synthetic. The accounts are still in `dayform_demo`; the app has no way to
delete an account, so remove them in Atlas if they are not wanted.

| Check | What happened |
| --- | --- |
| No token, a made-up token, a tampered token | 401 each time |
| Invalid timezone | 400 |
| Eligible account | 200 in 1.3 s with a headline and one observation each for consistency, trends, nutrition, and goals. `Cache-Control: no-store`. |
| Numbers in the reply | 4 active days; 0, 1, 1, 2 sessions and 0, 20, 40, 55 minutes per week; 1060 calories, 60 protein, 132 carbohydrates, 29 fat; 4 of 12 workouts with 10 days left. All match the seeded records. |
| Isolation | The request carried the other account's `userId`; the reply still described only the demo account. The other account's activity name, the workout note, food names, email, and user ID do not appear in the reply. |
| Other account | "You have 1 saved record from the last 28 days…" and counts for its own single workout. Gemini is not called for this reply. |
| Dashboard | Insight shown on [desktop](prod-insight-desktop.png) and [phone](prod-insight-mobile.png); [not enough data](prod-limited-mobile.png) on phone |
| Rate limit, API | 429 with `Retry-After: 60` and "Too many insight requests. Wait a minute and try again." |
| Rate limit, dashboard | Three requests succeeded and the fourth returned 429. The [dashboard](prod-rate-limit-mobile.png) showed the message and a disabled "Try again in 60s" button. |
| Service error | Not induced; Gemini failed twice on its own. One request got 503 after the 20-second timeout. One [dashboard request](prod-live-error-desktop.png) got "AI insights are unavailable right now. Try again later." Both worked on retry, and neither reply exposed provider details. |
| Credentials | During the dashboard run the browser contacted only `dayform-fitness.vercel.app` and `fitness-wellness-tracker.vercel.app`. The deployed script (349 KB) and the API replies contain no Google API key, `GEMINI_API_KEY`, `x-goog-api-key`, or Gemini endpoint. |

What production cannot show: the exact text sent to Gemini (there is no access to the
provider request from outside). The automated tests capture that request and check it
field by field. The 502 reply for an insight that fails the number check, and the 503
for a missing key, are also covered only by the automated tests.

## What reaches Gemini

The backend sends one JSON summary per request. Nothing else about the user is sent.

| Sent | Detail |
| --- | --- |
| Workout totals | Sessions, active days, minutes, sessions and minutes for each of the last four weeks, days since the last workout |
| **Activity names** | The user's three most common workout names, as typed, cut to 40 characters, with a session count each |
| Nutrition totals | Entry count, days logged, days since the last entry, average calories, protein, carbohydrates, and fat per logged day |
| **Goal titles** | Up to five active goals: the title as typed, cut to 60 characters |
| Other goal fields | Category, current and target values, **unit as typed** (up to 30 characters), percent complete, whether workouts are counted automatically, days left, and the number of completed goals |

Never sent: workout notes, food and meal names, dates, record IDs, user ID, email,
display name, profile details, completed goals' titles, and the Gemini key (it travels
only in a request header from the backend).

Activity names, goal titles, and manual goal units are free text. A user who names a
goal after a health condition sends that wording to Google. On the free tier Google may
use submitted content to improve its products and reviewers may read it
([terms](https://ai.google.dev/gemini-api/terms)). The earlier documentation listed
activity names but not goal titles or units, and the dashboard said only that "a summary
of your activity" is sent. Both are corrected on this branch. The dashboard now reads:
"When you ask, a summary of your activity is sent to Google Gemini, including your
activity names and goal titles. Your notes and account details are never shared." That
sentence reaches production when this branch is deployed.

## Rate limiter limits

Limits are counted in memory inside each running copy of the backend: 3 requests per
user per minute, 10 for all users together, one request per user at a time, and a
60-second pause for everyone after Gemini reports its own limit. Meal estimates use the
same design with 5 and 20.

On Vercel the backend runs as serverless functions, so:

- **Each instance counts on its own.** When Vercel runs more than one instance, a user
  can exceed 3 requests a minute and the 10-a-minute total is not a real cap. Seen in
  production: two requests were sent at the same moment; one returned 429 and the other
  200. A single counter would have refused both, so they were most likely served by
  different instances. Around that time the demo account made at least five Gemini calls
  within a minute.
- **Counts reset on a cold start.** A new instance starts at zero. The pause after a
  Gemini 429 is lost the same way and is not shared between instances.
- **The one-at-a-time rule is per instance too.**
- **The 10-a-minute total is shared by all users.** Four accounts sending three requests
  each can use it up for everyone on that instance for the rest of the minute. Signup is
  open, so this is possible.
- **Requests that never reach Gemini are not limited.** The not-enough-data reply and the
  database reads before every insight are not counted.

The limiter still slows a single browser and usually holds in a low-traffic demo: in the
dashboard run the fourth request in a minute was refused. The real ceiling on cost and
quota is the Google project's own limit, which is why the key should stay on the Free
tier. A strict limit needs a counter shared by all instances, for example a MongoDB
collection with a TTL index or a hosted Redis. That was left out here because it changes
the AI integration.

## Security review

No change needed:

- **Access.** `requireAuth` runs before anything else on the route. Every query filters
  on the user ID from the verified token; nothing in the request body selects data.
- **Key handling.** The key is read from the backend environment and sent only in the
  `x-goog-api-key` header to a fixed Google host. The model name is checked against a
  pattern before it is placed in the URL. Provider errors are replaced with fixed
  messages, so no key, header, or provider text reaches the client.
- **Instructions hidden in names.** Activity names and goal titles go to Gemini as JSON
  data, and the system instruction says to ignore instructions inside them. A user can
  only affect their own insight. The reply is checked against a schema, limited in
  length, and shown as plain text.
- **Made-up numbers.** Any observation containing a digit that is not in the summary is
  dropped; if nothing is left the API returns 502.
- **Caching.** Authenticated replies carry `Cache-Control: no-store`.

Worth knowing, not changed:

- The number check reads digits only. Live replies sometimes spell numbers out ("from
  zero to two"); those were correct here but are not checked. The code already notes this.
- 401 replies do not carry `no-store`. They contain no user data and are replies to POST
  requests, which are not cached.
- Gemini's free tier failed at least 2 of about 12 requests during this check. The dashboard
  recovers with a retry, but a live demo should allow for it.

## Tests

```sh
npm test --prefix backend
npm test --prefix frontend
npm test --prefix tests
npm run build --prefix frontend
```

Results on this branch: 58 backend unit tests, 15 frontend unit tests, 73 browser and API
integration tests, and the production build all passed. They mock Gemini and load no
`.env` or real key.

## Repeating the production check

1. Sign in at <https://dayform-fitness.vercel.app> with a demo account that has at least
   three records from the last 28 days.
2. On the dashboard select **Get my insight** and compare each number with the account's
   workouts, meals, and goals.
3. Select **Refresh insight** until the fourth request in a minute is refused.
4. Sign in with an account that has fewer than three records and confirm the
   not-enough-data message.
5. In the browser's network panel, confirm requests go only to the two Dayform hosts.

Each insight uses one Gemini request from the project's free quota.
