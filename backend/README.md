# Backend

Express API for Dayform. Route handlers validate input, limit each query to the signed-in user, and store records with Mongoose.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

`npm run dev` restarts the API when files change. `npm start` runs it once. `npm test` runs the unit tests in `tests/`.

Copy variable names from `.env.example`. Do not commit `.env`.

| Name | Purpose |
|---|---|
| `PORT` | Local port. Defaults to `5000`. |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign tokens |
| `JWT_EXPIRES_IN` | Token lifetime. Defaults to `7d`. |
| `CLIENT_URL` | Frontend origin for CORS |
| `GEMINI_API_KEY` | Optional. Meal estimates and wellness insights stay off when this is empty. |
| `GEMINI_MODEL` | Optional. Defaults to `gemini-3.5-flash-lite`. |

## Layout

```
src/
├── config/db.js     MongoDB connection, reused across requests on one instance
├── middleware/      Token check and error handler
├── models/          User, Workout, NutritionLog, Goal
├── routes/          HTTP routes mounted under /api
├── services/        Gemini meal estimates and wellness insights
├── utils/           Validation and goal-progress calculation
├── app.js           Express app, including the Vercel entry
└── index.js         Local server
```

## Routes

Every route below is under `/api`. Except health, signup, and login, the caller must send `Authorization: Bearer <token>`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Process is up |
| POST | `/auth/signup`, `/auth/login` | Create an account or sign in |
| POST | `/auth/logout` | Acknowledges sign-out. The browser deletes the token. |
| GET, PATCH | `/auth/me` | Read or update the signed-in profile |
| GET, POST | `/workouts` | List or create workouts |
| PUT, DELETE | `/workouts/:id` | Edit or delete one of the caller's workouts |
| GET | `/workouts/summary`, `/workouts/analytics` | Weekly totals and the four-week view |
| GET, POST | `/nutrition` | List the latest entries or create one |
| PUT, DELETE | `/nutrition/:id` | Edit or delete one of the caller's entries |
| POST | `/nutrition/estimate` | Estimate nutrients from meal text |
| GET, POST | `/goals` | List or create goals |
| PUT, DELETE | `/goals/:id` | Edit or delete one of the caller's goals |
| GET | `/dashboard/summary` | This week's meals and calories, plus the nearest active goals |
| POST | `/insights` | Wellness insight for the last 28 days |

The Capstone 1 API notes in `docs/capstone-1/architecture/api.md` describe the planned starter. The table above is the API this server implements.
