# Capstone 2 handoff

Notes from our team at the end of Sprint 5 (through daily scrum 5). Capstone 1 was planning and docs. Capstone 2 is when we actually build the features.

## What we finished in Capstone 1

- Requirements, MVP scope, user stories (#1–#35 planning stories)
- Architecture diagrams, workflows, wireframes, ERD
- API and database planning (`docs/api.md`, `docs/database-schema.md`)
- Component plan and implementation roadmap
- Scrum minutes in `meeting-minutes/` (Sprints 1–4 complete, Sprint 5 in progress)
- Starter project: Express API, Mongoose models, React UI with working signup/login and placeholder pages for workouts, nutrition, goals

## What is in the starter code

**Backend:** health check, auth routes (`/api/auth/*`), User/Workout/NutritionLog/Goal models. No workout/nutrition/goal routes yet.

**Frontend:** login, signup, protected dashboard routes, nav shell. Workouts/nutrition/goals pages show placeholders.

## What we plan to build first in Capstone 2

1. Workout logging — `GET/POST /api/workouts` + real Workouts page
2. Nutrition logging — `GET/POST /api/nutrition` + Nutrition page
3. Goals — `/api/goals` + progress display
4. Dashboard summaries from real data

Follow `docs/implementation-roadmap.md` and `docs/wireframes.md`. Auth middleware is already there — new routes should filter by `req.user.id`.

## Mingle story IDs

Stories #22–#35 in our meeting minutes are planning work from Sprints 4–5. When we start coding in Capstone 2 we should create new implementation stories (#36+) instead of reopening the planning ones. See `docs/story-id-reference.md`.

## Demo for Capstone 1

Show planning docs, diagrams, wireframes, and optionally run the starter (signup → dashboard → logout).

## Demo goal for Capstone 2

User can log workouts and meals, set a goal, and see summary info on the dashboard.
