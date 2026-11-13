# API performance and quality-of-service sample (Capstone 2)

This is a **small, local** latency sample for Student Outcome 2. It measures five read-only API routes on a developer machine. It is **not** a scalability study, a production load test, or a measure of full page load time in the browser.

## Scope

**In scope**

- `GET /api/health`
- `GET /api/dashboard/summary` (authenticated)
- `GET /api/workouts` (authenticated list)
- `GET /api/nutrition` (authenticated list)
- `GET /api/goals?status=active` (authenticated)

**Out of scope**

- Google Gemini (`/api/nutrition/estimate`, `/api/insights`)
- Production (Vercel) or MongoDB Atlas
- Concurrent load or stress testing
- Frontend rendering, Playwright, or Vite dev-server time

## Methodology

| Setting | Value |
| --- | --- |
| When | 2026-11-11 (UTC) |
| Where | Local only — Express on `127.0.0.1`, ephemeral MongoDB Memory Server |
| Data | One test account, 10 workouts, 5 nutrition entries, 1 active goal |
| Requests | 25 per endpoint, **sequential** (concurrency 1) |
| Timing | `fetch` round-trip in Node.js (`performance.now()`), ms |
| Auth | JWT from `POST /api/auth/signup`; sample password generated in the script |
| Production | Not measured |

Reproduce:

```bash
node scripts/perf-qos-sample.mjs --requests 25 --csv docs/capstone-2/performance-evaluation-sample.csv
```

Requires `backend/node_modules` and `tests/node_modules` (for `mongodb-memory-server`). Raw rows are in [performance-evaluation-sample.csv](performance-evaluation-sample.csv).

## Results (milliseconds)

| Endpoint | Success | min | p50 | avg | p95 | max |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `GET /api/health` | 25/25 (HTTP 200) | 0.14 | 0.16 | 0.18 | 0.24 | 0.41 |
| `GET /api/dashboard/summary` | 25/25 (HTTP 200) | 0.63 | 0.85 | 1.12 | 2.56 | 5.07 |
| `GET /api/workouts` | 25/25 (HTTP 200) | 0.44 | 0.52 | 0.53 | 0.66 | 0.99 |
| `GET /api/nutrition` | 25/25 (HTTP 200) | 0.37 | 0.50 | 0.53 | 0.74 | 1.06 |
| `GET /api/goals?status=active` | 25/25 (HTTP 200) | 0.39 | 0.46 | 0.48 | 0.62 | 0.82 |

All listed routes returned **HTTP 200** on every attempt. No 5xx responses in this sample.

## Quality of service (observed)

| Topic | Observation |
| --- | --- |
| Success rate | 100% for measured routes under this sample |
| Authentication | `GET /api/workouts` **without** a token returned **401** (checked once after the sample) |
| Authorization | Routes use `requireAuth`; data was seeded for the signed-in user only (not exercised across accounts in this script) |
| Caching | Dashboard, workouts, nutrition, and goals list handlers set `Cache-Control: no-store` |
| Errors | Integration tests cover validation and 4xx paths; this sample did not re-run those tests |

## Limitations

- Sample size is 25 requests per route on one machine (Node v24.12.0, macOS 27.0.1).
- Ephemeral in-memory MongoDB is faster and different from shared Atlas on Vercel.
- Cold start of the script includes server listen and seeding; table reflects steady-state GETs after seeding.
- `dashboard/summary` runs multiple database queries and is the slowest route in this sample; that does not predict production QoS.
- User-perceived dashboard load also includes React, assets, and parallel calls from the browser.

## Conclusion

For this local sample, read-only API routes responded in **sub‑millisecond to low single-digit milliseconds** on average, with **no failures**. The dashboard summary endpoint showed the widest spread (p95 about 2.6 ms, max about 5.1 ms), which matches its heavier server work. This evidence supports **basic API responsiveness in development** only; it does not prove production scalability or formal SLA compliance.
