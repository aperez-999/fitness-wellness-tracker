# Frontend

React application for Dayform. Vite serves it in development and builds the production site. Tailwind CSS handles styling. React Router handles the pages.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

The dev server is at `http://localhost:5173`.

`VITE_API_URL` is the API base URL, including `/api` and no trailing slash. The example file uses `http://localhost:5000/api`. If the API is on another port, change this before starting Vite.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run preview` — serve the production build locally
- `npm test` — unit tests in `tests/`

## Routes

| Route | Who can open it | What it does |
|---|---|---|
| `/` | Anyone | Landing page with links to sign up and log in |
| `/login`, `/signup` | Anyone | Account forms |
| `/dashboard` | Signed-in users | Weekly workouts, meals, goals, and an optional AI insight |
| `/workouts` | Signed-in users | Log, search, edit, and delete workouts |
| `/nutrition` | Signed-in users | Log meals, including an optional Gemini estimate |
| `/goals` | Signed-in users | Create and update goals |
| `/profile` | Signed-in users | Display name, pronouns, about me, and favorite activities |

Anything else redirects to `/`. Signed-in pages use `ProtectedRoute` and `AppLayout`. `AuthContext` keeps the current user. `lib/api.js` attaches the token to API requests.

## Source layout

```
src/
├── components/   Shared interface, including layout, workouts, nutrition, and insights
├── context/      AuthContext
├── hooks/        Data loading for workouts and the dashboard
├── lib/          API client and workout calculations
├── pages/        One folder of route pages
├── App.jsx       Route table
└── main.jsx      Entry
```
