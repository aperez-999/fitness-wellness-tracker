# Frontend

React + Vite + Tailwind CSS UI for the Fitness & Wellness Tracker.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

App runs at `http://localhost:5173`.

## Environment

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL (default `http://localhost:5000/api`) |

## Pages (starter template)

| Route | Purpose |
|-------|---------|
| `/` | Landing + API health check |
| `/login` | Login wireframe (auth Sprint 3) |
| `/signup` | Signup wireframe (auth Sprint 3) |
| `/dashboard` | Dashboard shell with summary cards |
| `/workouts` | Workout section placeholder |
| `/nutrition` | Nutrition section placeholder |
| `/goals` | Goals section placeholder |
| `/profile` | Profile placeholder |

Layouts match [../docs/wireframes.md](../docs/wireframes.md).

## Structure

```
src/
├── components/   # Layout, cards, shared UI
├── pages/        # Route pages
├── lib/api.js    # API helpers
├── App.jsx       # Routes
└── main.jsx      # Entry
```
