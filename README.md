# Dayform — AI-Powered Fitness & Wellness Tracker

Web app for logging workouts and understanding fitness progress in one place. The project began in **FIU Capstone 1** with planning, architecture, and a working React / Express / MongoDB starter (including authentication). It continues in **Capstone 2** with implementation, testing, and deployment of core features.

## Production

Dayform is deployed on two **Vercel Hobby** projects from this repository, with a **MongoDB Atlas M0** cluster. The database name is `dayform_demo`.

| Surface | URL |
|---|---|
| Frontend | <https://dayform-fitness.vercel.app> |
| Backend API | <https://fitness-wellness-tracker.vercel.app/api> |
| Health check | <https://fitness-wellness-tracker.vercel.app/api/health> |

The frontend project uses the `frontend` directory, the Vite preset, and `dist` as the output. The backend project uses the `backend` directory and Vercel’s Express preset, with no custom build command or output directory. `frontend/vercel.json` sends unknown frontend paths to `index.html`, so routes such as `/dashboard` still load on refresh. API routes stay on the backend host under `/api`.

### Environment variables

Set these in the Vercel project settings. Copy the names only. Do not commit real values, and do not put a database password or `JWT_SECRET` in this file.

**Frontend** (`frontend` project). Vite reads `VITE_API_URL` at build time, so changing it requires a new frontend deployment.

```bash
VITE_API_URL=https://fitness-wellness-tracker.vercel.app/api
VITE_GOOGLE_CLIENT_ID=
```

**Backend** (`backend` project). `CLIENT_URL` must be the exact frontend origin: `https`, no path, and no trailing slash.

```bash
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/dayform_demo
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=7d
CLIENT_URL=https://dayform-fitness.vercel.app
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
GOOGLE_CLIENT_ID=
```

`MONGODB_URI`, `JWT_SECRET`, and `CLIENT_URL` are required in production. `JWT_EXPIRES_IN` defaults to `7d` when omitted. `GEMINI_API_KEY` is optional. Without it, meal estimates and wellness insights stay unavailable, and nutrition values can still be entered by hand. `GEMINI_MODEL` is optional and defaults to `gemini-3.5-flash-lite`. `PORT` is used only for local development.

#### Google sign-in (optional)

The login and signup pages show a **Continue with Google** button when a Google OAuth client ID is set. Without one the button is hidden and email and password still work.

1. In the [Google Cloud console](https://console.cloud.google.com/apis/credentials), create an **OAuth client ID** of type **Web application**. Configure the consent screen first if asked.
2. Under **Authorized JavaScript origins**, add `https://dayform-fitness.vercel.app`, and `http://localhost:5173` and `http://localhost` for local development. No redirect URI is needed.
3. Set the client ID as `VITE_GOOGLE_CLIENT_ID` in the frontend and `GOOGLE_CLIENT_ID` in the backend, then redeploy both. The values must be identical. A client ID is public; there is no client secret to store.

The backend checks each Google ID token's signature, audience, issuer, and expiry, and requires a verified email. A first Google sign-in creates an account with no password. If a password account already uses that email, Google sign-in is refused and the user logs in with the password: signup does not verify email addresses, so linking the two automatically would let whoever registered the address first keep access.

On the Atlas cluster, allow network access from anywhere. Vercel Hobby does not provide a fixed outbound address. Keep the Atlas user limited to `dayform_demo`.

### Deploy and redeploy

1. Push the branch that each Vercel project tracks. Both projects deploy from this GitHub repository.
2. Confirm the frontend root directory is `frontend` and the backend root directory is `backend`.
3. Deploy the backend first. Open `/api/health` and confirm `"status": "ok"`.
4. Set the frontend `VITE_API_URL` to `https://fitness-wellness-tracker.vercel.app/api`, then deploy the frontend.
5. Set the backend `CLIENT_URL` to `https://dayform-fitness.vercel.app` and redeploy the backend if that value changed.

Later code changes redeploy when pushed to the tracked branch. A new environment variable on the frontend does not reach the browser until that project is redeployed. Use **Redeploy** in the Vercel dashboard to repeat a deployment without a new commit. Deploy from Git. Do not upload a folder that contains `backend/.env` or `frontend/.env`.

### Production smoke test

- Open <https://dayform-fitness.vercel.app> and confirm the Dayform home page loads.
- Refresh `/login` and `/signup` directly. Each refresh should stay on that page.
- Open <https://fitness-wellness-tracker.vercel.app/api/health> and confirm `{"status":"ok"}`.
- Create a demo account, or sign in with an existing demo account, and confirm the dashboard loads.
- If `VITE_GOOGLE_CLIENT_ID` is set, sign out, select **Continue with Google** on the login page, and confirm the dashboard loads.
- Log a workout and confirm it remains after a refresh.
- Open Nutrition, save a manual entry, and confirm it remains after a refresh.
- If `GEMINI_API_KEY` is set, estimate one meal. If it is empty, confirm the page explains that estimates are unavailable and manual entry still saves.
- If `GEMINI_API_KEY` is set, select **Get my insight** on the dashboard. An account with fewer than three records should see a "not enough data" message instead of an insight.
- Create or view a goal, then open Profile and confirm the signed-in account’s details.
- Sign out and confirm private workout, nutrition, and goal data is no longer shown.
- In the browser developer tools, confirm API calls go to `https://fitness-wellness-tracker.vercel.app/api` and that failed responses are not caused by a CORS origin mismatch.

## Core problem

A college student wants to log workouts and understand weekly fitness progress without switching between multiple applications.

## Current implemented features

- Authentication (signup, login, logout, session via JWT), with optional Google sign-in
- Workout logging
- Workout persistence (MongoDB)
- Recent workout display / end-to-end walking skeleton
- Workout history with search, date filters, editing, and removal
- Progress dashboard with the week's workouts, minutes, and active days, plus a week comparison and 4-week timeline (Deep Insight)
- Nutrition logging with calories and macros, private recent history, and MongoDB persistence
- Wellness goals with progress set by hand or counted from logged workouts (count, minutes, or hours)
- AI wellness insights on the dashboard, written by Gemini from a server-side summary of the user's last 28 days (the summary includes activity names and goal titles)
- Dashboard summary of the week's meals and calories and the three soonest active goals
- Profile with display name, pronouns, about me, and favorite activities

## Planned features

- Notifications

## Tech stack

- **Frontend:** React, Vite, Tailwind CSS, React Router
- **Backend:** Node.js, Express
- **Database:** MongoDB Atlas (or local MongoDB) with Mongoose
- **Auth:** JWT

## Project structure

```
fitness-wellness-tracker/
├── backend/                 # Express API
├── frontend/                # React + Vite UI
├── shared/                  # Nutrition helpers used by the frontend and backend
├── tests/                   # Browser and API integration tests
├── docs/
│   ├── capstone-1/          # Archived Capstone 1 planning & artifacts
│   └── capstone-2/          # Sprint docs (active Capstone 2 work)
├── Capstone1-FinalPoster.pdf
├── Capstone2-FinalPoster.pdf
├── CHANGELOG.md
├── README.md
├── LICENSE
└── .gitignore
```

See [docs/README.md](./docs/README.md) for how Capstone 1 vs Capstone 2 documentation is organized.

## Local development

You need Node.js 20+ and a MongoDB connection (Atlas or local).

### Backend

```bash
cd backend
cp .env.example .env   # if you do not already have .env
npm install
npm run dev
```

Scripts (from `backend/package.json`):

- `npm run dev` — start API with file watch (`node --watch src/index.js`)
- `npm start` — start API once (`node src/index.js`)

Configure `backend/.env` from `.env.example` (`MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, optional `PORT`).

On some Macs, AirPlay uses port **5000**. If the API fails with `EADDRINUSE`, set `PORT=5001` in `backend/.env`.

If signup says it cannot reach the server, check that the API and MongoDB are
both running. With the test dependencies installed, `npm --prefix tests run db:local`
from the repository root starts a persistent local MongoDB database; keep it open
alongside the backend and frontend terminals. See [local database setup](tests/README.md#persistent-local-development-database).

Health check: `http://localhost:5000/api/health` (or `:5001` if you changed the port).

### Frontend

```bash
cd frontend
cp .env.example .env   # if you do not already have .env
npm install
npm run dev
```

Scripts (from `frontend/package.json`):

- `npm run dev` — Vite development server
- `npm run build` — production build
- `npm run preview` — preview the production build

Set `VITE_API_URL` in `frontend/.env` to match the backend (for example `http://localhost:5001/api` if the API uses port 5001).

App: `http://localhost:5173`

Full Capstone 1 setup notes: [docs/capstone-1/user-guides/local-setup-guide.md](./docs/capstone-1/user-guides/local-setup-guide.md)

## Capstone 1 vs Capstone 2 docs

| Area | Location | Purpose |
|------|----------|---------|
| Capstone 1 archive | `docs/capstone-1/` | Requirements, architecture, diagrams, planning, meeting minutes, original guides |
| Capstone 2 sprints | `docs/capstone-2/sprint-N/` | Sprint problem validation, specs, and ongoing development docs |
| Application | `frontend/`, `backend/` | Continuous codebase across both courses |

Sprint status is tracked on the Capstone website board (not in a repo status file).

## Nutrition verification

See [nutrition acceptance review](docs/nutrition-acceptance-review.md) for the API
contract, test commands, evidence, and the teammate verification checklist.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

See [LICENSE](./LICENSE).

For optional AI meal estimates, see [Gemini setup](docs/gemini-nutrition.md). Wellness insights use the
same key; see [wellness insight evidence](docs/evidence/wellness-insights/README.md) and the
[production validation and privacy review](docs/evidence/wellness-insights/production/README.md).
