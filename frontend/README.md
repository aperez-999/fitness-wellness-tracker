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
| `/` | Landing page + API health check |
| `/login` | Login |
| `/signup` | Sign up |
| `/dashboard` | Dashboard shell (summary cards) |
| `/workouts` | Workout logging (list + create) |
| `/nutrition` | Placeholder — Capstone 2 |
| `/goals` | Placeholder — Capstone 2 |
| `/profile` | Signed-in user info |

Auth uses `AuthContext`, `ProtectedRoute`, and `lib/api.js`. Layouts follow [../docs/capstone-1/planning/wireframes.md](../docs/capstone-1/planning/wireframes.md).

## Structure

```
src/
├── components/   # Layout, cards, ProtectedRoute, FormField
├── context/      # AuthContext (login session)
├── pages/        # Route pages
├── lib/api.js    # API helpers
├── App.jsx       # Routes
└── main.jsx      # Entry
```
