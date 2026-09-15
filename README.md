# Fitness & Wellness Tracker

Web app for logging workouts and understanding fitness progress in one place. The project began in **FIU Capstone 1** with planning, architecture, and a working React / Express / MongoDB starter (including authentication). It continues in **Capstone 2** with implementation, testing, and deployment of core features.

## Core problem

A college student wants to log workouts and understand weekly fitness progress without switching between multiple applications.

## Current implemented features

- Authentication (signup, login, logout, session via JWT)
- Workout logging
- Workout persistence (MongoDB)
- Recent workout display / end-to-end walking skeleton

## Planned features

- Progress dashboard
- Nutrition logging
- Wellness goals
- Charts and analytics
- AI recommendations
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
├── docs/
│   ├── capstone-1/          # Archived Capstone 1 planning & artifacts
│   └── capstone-2/          # Sprint docs (active Capstone 2 work)
├── Capstone-Poster-Template-CS.pdf
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

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

See [LICENSE](./LICENSE).
