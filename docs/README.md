# Documentation

This folder holds Capstone course documentation. Application source code lives in `frontend/` and `backend/` at the repository root and is shared across Capstone 1 and Capstone 2.

## Capstone 1 (`capstone-1/`)

Archived planning and design artifacts from Capstone 1:

- **architecture/** — system architecture, API contracts, authentication design, database schema
- **diagrams/** — Mermaid ERD, workflows, and related diagram notes
- **planning/** — requirements, user stories, MVP scope, wireframes, roadmap, project organization
- **meeting-minutes/** — dated scrum, planning, review, and retrospective PDFs
- **user-guides/** — installation and user-manual materials from Capstone 1

## Capstone 2 (`capstone-2/`)

Sprint-specific implementation, verification, and development documentation:

- **sprint-1/** — problem validation and project specification
- **sprint-2/** — no notes were added
- **sprint-3/** — workout history, charts verification, goal progress, and integration testing
- **sprint-4/** — dashboard meals and goals
- **sprint-5/** — final QA, release freeze, and production smoke evidence ([final-qa-release-freeze.md](capstone-2/sprint-5/final-qa-release-freeze.md))
- **[rubric-evidence.md](capstone-2/rubric-evidence.md)** — showcase rubric map to files in this repository

## Showcase evidence

- **[evidence/](evidence/)** — tracked screenshots and JSON used for feature verification (auth, workouts, nutrition, goals, dashboard, insights).
- **[testing-evidence/](testing-evidence/README.md)** — dated `npm test` logs for showcase reference
- **`tests/artifacts/`** — Playwright output from integration runs; listed in `tests/.gitignore`, not committed.

## Application code

`frontend/` and `backend/` are the same application across both courses. Capstone 1 left authentication and the data models in place. Capstone 2 added the logging, dashboard, and AI features on that code.
