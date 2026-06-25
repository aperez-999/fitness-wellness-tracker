# Backend

Express REST API for the Fitness & Wellness Tracker.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

## Environment

| Variable | Description |
|----------|-------------|
| `PORT` | API port (default `5000`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs (Sprint 3 auth) |
| `CLIENT_URL` | Frontend URL for CORS |

## Structure

```
src/
├── config/db.js       # MongoDB connection
├── middleware/        # Auth and error handling
├── models/            # Mongoose schemas (User, Workout, NutritionLog, Goal)
├── routes/            # API route modules
└── index.js           # App entry point
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/signup` | Register |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout (auth required) |
| GET | `/api/auth/me` | Current user (auth required) |

See [../docs/api.md](../docs/api.md) for full contracts.

## Models

Schemas match [../docs/database-schema.md](../docs/database-schema.md) and [../diagrams/database-erd.md](../diagrams/database-erd.md).
