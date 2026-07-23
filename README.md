# Fitness & Wellness Tracker

CIS 3950 Capstone I — Alejandro Perez, Ahanaf Akif, Josue Gamon Fortes, Allen Cruz.

Web app for tracking workouts, nutrition, and wellness goals. Capstone 1 focused on planning, documentation, and a React / Express / MongoDB starter with working login. Feature CRUD is planned for Capstone 2.

## Capstone 1 submission

Graded lite ZIP includes dated scrum minutes here:

```
Documents/Scrum_Minutes/
```

**ZIP name:** `fitness-wellness-tracker.zip` (Team Leader submits on Canvas).

## What we did each sprint

**Sprint 1** — Repo, stack, wireframes, auth research.

**Sprint 2** — Architecture, workflows, ERD, MVP scope.

**Sprint 3** — Final planning docs + starter template.

**Sprint 4** — Polished architecture, API docs, roadmap.

**Sprint 5** — Final doc review and Capstone 1 submission prep.

## Tech stack

- Frontend: React, Vite, Tailwind, React Router
- Backend: Node.js, Express
- Database: MongoDB + Mongoose

## Repo layout

```
Documents/Scrum_Minutes/   Capstone 1 minutes (named by date)
backend/                   Express API
frontend/                  React UI
docs/                      Planning docs
diagrams/                  Architecture, workflows, ERD
```

## Running the starter

```bash
# Backend — copy .env.example to .env first (needs MongoDB Atlas or local MongoDB)
cd backend && cp .env.example .env && npm install && npm run dev

# Frontend — new terminal
cd frontend && cp .env.example .env && npm install && npm run dev
```

On some Macs, port 5000 is used by AirPlay — set `PORT=5001` in `backend/.env` and `VITE_API_URL=http://localhost:5001/api` in `frontend/.env`.

Full steps: [docs/installation-guide.md](./docs/installation-guide.md)

## Docs

- [docs/README.md](./docs/README.md) — index of planning documents
- [docs/user-stories.md](./docs/user-stories.md)
- [docs/mvp-scope.md](./docs/mvp-scope.md)
- [docs/installation-guide.md](./docs/installation-guide.md)

## License

See [LICENSE](./LICENSE).
