# Fitness & Wellness Tracker

CIS 3950 capstone project — Alejandro Perez, Ahanaf Akif, Josue Gamon Fortes, Allen Cruz.

We are building a web app where users can track workouts, nutrition, and wellness goals. Capstone 1 was mostly planning and documentation. We also set up a starter React/Express/MongoDB project so we are ready to code features in Capstone 2.

## What we did each sprint

**Sprint 1** — Set up the GitHub repo, picked our stack (React, Express, MongoDB), wrote initial requirements, wireframe ideas, and auth research. See `meeting-minutes/sprint-1/`.

**Sprint 2** — Added architecture and workflow diagrams, refined wireframes, planned the database (ERD), and wrote up MVP scope. See `meeting-minutes/sprint-2/`.

**Sprint 3** — Finalized architecture docs, user journeys, wireframes for dashboard/workouts/nutrition, database schema, component planning, and the implementation roadmap. We also scaffolded the backend and frontend starter. See `meeting-minutes/sprint-3/`.

**Sprint 4** — Polished all of the above: architecture, workflows, wireframes, API planning, and roadmap. Accepted stories #22–#28 in our sprint review. See `meeting-minutes/sprint-4/`.

**Sprint 5 (in progress)** — Final pass on documentation before submission. Through daily scrum 5 we have been reviewing architecture, API docs, wireframes, and repo organization. Stories #29–#35. Daily scrums 6–10 and review/retro still to come. See `meeting-minutes/sprint-5/`.

## Tech stack

- Frontend: React, Vite, Tailwind, React Router
- Backend: Node.js, Express
- Database: MongoDB with Mongoose

## Repo layout

```
backend/            Express API + Mongoose models
frontend/           React UI
docs/               Planning docs we wrote during sprints
diagrams/           Architecture, workflows, ERD
meeting-minutes/    Scrum ceremony PDFs by sprint folder
```

## Docs worth reading

- [docs/README.md](./docs/README.md) — index of everything we wrote
- [docs/user-stories.md](./docs/user-stories.md) — Mingle story list
- [docs/mvp-scope.md](./docs/mvp-scope.md) — what is in the MVP
- [docs/installation-guide.md](./docs/installation-guide.md) — how to run the starter locally

## Running the starter (optional)

Capstone 1 only requires scrum minutes in the ZIP. The code here is practice for our team — not graded for Capstone 1.

```bash
cd backend && cp .env.example .env && npm install && npm run dev
cd frontend && cp .env.example .env && npm install && npm run dev
```

Backend: `http://localhost:5000` — Frontend: `http://localhost:5173`

Right now signup/login works and the dashboard pages are placeholders for workouts, nutrition, and goals. We will build those in Capstone 2.

## Capstone 1 submission

The Team Leader (Alejandro) submits `fitness-wellness-tracker.zip` on Canvas.

**Required:** `Documents/Scrum_Minutes/` with all ceremony minutes named by date. Our PDFs live in `meeting-minutes/` for now, organized by sprint. After Sprint 5 ends we will copy them into `Documents/Scrum_Minutes/` with one file per date for the ZIP.

Everything else in this repo (code, docs, diagrams) is optional practice per the syllabus.

See [docs/capstone-1-submission.md](./docs/capstone-1-submission.md) for the checklist.

## License

See [LICENSE](./LICENSE).
