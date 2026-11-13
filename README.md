# Dayform — AI-Powered Fitness & Wellness Tracker

Dayform is a web app for logging workouts, meals, and goals in one account. It is our FIU Computer Science capstone project. The problem it addresses is simple: a student who exercises often keeps that information in separate apps, so it is hard to see whether the week is moving in the direction they wanted.

A signed-in user can record a workout, a meal, or a goal and see them together on a dashboard. Two optional features call Google Gemini from the server: estimating nutrients from a meal description, and a short note about the last 28 days of saved activity. That note is general wellness information, not medical advice.

## Features

These are the features in the current code:

- Create an account, sign in, and sign out. Passwords are hashed. The server returns a signed token that the browser stores and sends on later requests. Optional **Continue with Google** when OAuth client IDs are configured.
- Edit a profile: display name, pronouns, a short about-me note, and favorite activities.
- Log workouts with a name, date, duration, and optional notes. Edit or delete them, search the history, and open a four-week view of counts and minutes.
- Log meals with calories, protein, carbohydrates, and fat. Edit or delete entries. Optionally ask Gemini to fill those four values from the meal text. The values stay editable, and nothing is saved until the user saves.
- Create goals, update them by hand, or let a workout goal count workouts, minutes, or hours from its start date.
- Dashboard with this week's workouts, meals, and calories, the nearest active goals, an activity chart, and an on-request AI insight.
- Each account can read and change only its own records.

Not in this version: password reset, deleting an account, wearable sync, social features, and notifications.

## Technology

| Layer | What we use |
|---|---|
| Frontend | React, React Router, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | MongoDB through Mongoose. The deployed database is documented as MongoDB Atlas. |
| Auth | bcrypt password hashes, JSON Web Tokens, optional Google Identity Services (ID token verification on the API) |
| AI | Google Gemini REST API, called only from the backend |
| Tests | Node's built-in test runner, Playwright, and axe-core |
| Hosting | Two Vercel projects from this repository |

## Getting started

You need Node.js 22 or newer and a MongoDB database. The integration tests also need a one-time Playwright browser install, described under Testing.

From the repository root:

```bash
npm install --prefix backend
npm install --prefix frontend
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit the `.env` files on your machine. Do not commit them. `.gitignore` already ignores `.env`.

Backend variables:

| Name | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret used to sign tokens. Use a long random string. |
| `CLIENT_URL` | Yes | Frontend origin allowed by CORS, with no path and no trailing slash |
| `JWT_EXPIRES_IN` | No | Token lifetime. Defaults to `7d`. |
| `PORT` | No | Local API port. Defaults to `5000`. |
| `GEMINI_API_KEY` | No | Enables meal estimates and wellness insights |
| `GEMINI_MODEL` | No | Defaults to `gemini-3.5-flash-lite` |
| `GOOGLE_CLIENT_ID` | No | Same OAuth client ID as the frontend; enables Google sign-in |

`backend/.env.example` includes a local MongoDB URL. For a class demo without your own MongoDB install, this starts a local database and keeps it running:

```bash
npm install --prefix tests
npm run db:local --prefix tests
```

On macOS, AirPlay often occupies port 5000. If the API reports `EADDRINUSE`, set `PORT=5001` and point `VITE_API_URL` at that port.

Frontend variables:

| Name | Purpose |
|---|---|
| `VITE_API_URL` | API base URL, including `/api` and no trailing slash. Example: `http://localhost:5000/api` |
| `VITE_GOOGLE_CLIENT_ID` | OAuth client ID for **Continue with Google**; leave empty to hide the button |

Vite reads `VITE_*` variables when the frontend starts or builds. Changing them means starting or building the frontend again.

#### Google sign-in (optional)

The login and signup pages show **Continue with Google** when `VITE_GOOGLE_CLIENT_ID` is set. Without it the button is hidden and email and password still work.

1. In the [Google Cloud console](https://console.cloud.google.com/apis/credentials), create an **OAuth client ID** of type **Web application**. Configure the consent screen first if asked.
2. Under **Authorized JavaScript origins**, add `https://dayform-fitness.vercel.app`, and `http://localhost:5173` and `http://localhost` for local development. No redirect URI is needed.
3. Set the client ID as `VITE_GOOGLE_CLIENT_ID` in the frontend and `GOOGLE_CLIENT_ID` in the backend. The values must be identical. A client ID is public; there is no client secret to store.

The backend checks each Google ID token's signature, audience, issuer, and expiry, and requires a verified email. A first Google sign-in creates an account with no password. If a password account already uses that email, Google sign-in is refused and the user logs in with the password: signup does not verify email addresses, so linking the two automatically would let whoever registered the address first keep access.

Run the API and the site in two terminals:

```bash
npm run dev --prefix backend
npm run dev --prefix frontend
```

The site is at `http://localhost:5173`. The health check is `http://localhost:5000/api/health`, or port 5001 if you changed it.

If signup says it cannot reach the server, check that the API and MongoDB are both running. With the test dependencies installed, `npm run db:local --prefix tests` keeps a persistent local MongoDB database open alongside the backend and frontend. See [tests/README.md](tests/README.md#persistent-local-development-database).

`GEMINI_API_KEY` stays in `backend/.env` only. Do not put it in a `VITE_` variable. Without the key, meal estimates and insights explain that they are unavailable, and manual logging still works.

Gemini receives only part of what the user typed. A meal estimate sends the meal description. A wellness insight sends a summary computed on the server: weekly totals, the three most common activity names, nutrition averages, and up to five goal titles with their progress. Notes, food names, email, and the display name are not included. The insight screen says the text was written by Google Gemini and is not medical advice.

For optional AI meal estimates, see [Gemini setup](docs/gemini-nutrition.md). For wellness insight production checks, see [wellness insights evidence](docs/evidence/wellness-insights/README.md) and the [production validation and privacy review](docs/evidence/wellness-insights/production/README.md).

## Testing

There is no separate lint or type-check script. The main commands are:

```bash
npm test --prefix backend
npm test --prefix frontend
npm test --prefix tests
npm run build --prefix frontend
```

Before the integration suite, install its dependencies and the browser once:

```bash
npm install --prefix tests
npm run browsers --prefix tests
```

`npm test --prefix tests` runs `node --test --test-concurrency=1 *.test.js`. That suite starts the Express app, a temporary MongoDB, and Chromium through Playwright. It does not read `backend/.env` or call the real Gemini API. Backend and frontend tests are unit tests and do not need a database password.

Screenshots from the browser suite are written to `tests/artifacts/`, which Git ignores. More detail is in [tests/README.md](tests/README.md), including the release QA layout and accessibility checks added in Sprint 5.

For a small **local API latency sample** (not production benchmarking), run:

```bash
node scripts/perf-qos-sample.mjs --requests 25 --csv docs/capstone-2/performance-evaluation-sample.csv
```

The script starts Express on `127.0.0.1` with an ephemeral MongoDB Memory Server, seeds sample data, and times five read-only routes. Results and methodology are in [docs/capstone-2/performance-evaluation.md](docs/capstone-2/performance-evaluation.md).

## Capstone development

Capstone 1 and Capstone 2 share this repository. We did not split them into separate codebases.

Capstone 1 (summer 2026) was planning and a starter. The team wrote requirements, architecture notes, diagrams, wireframes, and scrum minutes under `docs/capstone-1/`. The starter application had account signup and login, Mongoose models, and pages that did not yet log workouts, meals, or goals. The Capstone 1 user guides in that folder describe that starter, not the current app.

Capstone 2 (fall 2026) is the implementation on the same `frontend/` and `backend/` tree. We added workout logging and history, nutrition logging and meal estimates, goals, profile editing, the dashboard, AI wellness insights, deployment, Google sign-in, final QA, and the test suites. Sprint notes for that work are in `docs/capstone-2/`. See [CHANGELOG.md](CHANGELOG.md) for a short history; older detail is in Git.

## Project structure

```
fitness-wellness-tracker/
├── frontend/          React application
├── backend/           Express API
├── shared/            Meal text checks and reference estimates used by both sides
├── tests/             API and browser integration tests
├── docs/
│   ├── capstone-1/    Capstone 1 planning, diagrams, minutes, and starter guides
│   ├── capstone-2/    Capstone 2 sprint notes and rubric evidence map
│   ├── evidence/      Tracked screenshots and JSON for showcase verification
│   └── testing-evidence/  Dated test run logs (when committed)
├── Capstone1-FinalPoster.pdf
├── Capstone2-FinalPoster.pdf
├── CHANGELOG.md
└── LICENSE
```

[docs/README.md](docs/README.md) lists what is inside each docs folder.

## Deployment

Checked on November 11, 2026, without signing in: the site and the health check responded, and a protected API route rejected the request.

| Surface | URL |
|---|---|
| Site | https://dayform-fitness.vercel.app |
| API | https://fitness-wellness-tracker.vercel.app/api |
| Health check | https://fitness-wellness-tracker.vercel.app/api/health |

The frontend Vercel project builds `frontend/`. `frontend/vercel.json` serves `index.html` for client-side routes such as `/dashboard`. The backend project runs `backend/` with Vercel's Express preset. Set the environment variables in the Vercel project settings, not in Git. `CLIENT_URL` must be `https://dayform-fitness.vercel.app`. `VITE_API_URL` must be `https://fitness-wellness-tracker.vercel.app/api`. For production Google sign-in, set matching `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID` values.

On the Atlas cluster, allow network access from anywhere if the host requires it. Vercel Hobby does not provide a fixed outbound address. Keep the Atlas user limited to `dayform_demo`.

Earlier deployment notes describe two Vercel Hobby projects and an Atlas M0 database named `dayform_demo`. This cleanup checked the public URLs only. We did not open the Vercel or Atlas account pages, and we did not confirm whether a push still redeploys.

Do not upload a folder that contains `.env`.

## Team

Alejandro Perez-Rivero, Ahanaf Akif, and Allen Cruz. FIU Computer Science, Team #95.

The project is released under the MIT license. See [LICENSE](LICENSE).
