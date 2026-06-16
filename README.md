# Fitness & Wellness Tracker

Capstone 1 project for CIS 3950.

## Team Members

- Alejandro Perez (Product Owner / Team Lead)
- Ahanaf Akif
- Josue Gamon Fortes
- Allen Cruz

## Project Overview

The Fitness & Wellness Tracker is a web application that helps users track workouts, nutrition, wellness goals, and progress over time.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, Tailwind CSS, React Router |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |

## Repository Structure

```
├── backend/           # Express REST API
├── frontend/          # React UI
├── docs/              # Requirements, auth, schema, wireframes, MVP scope
├── diagrams/          # Architecture, workflow, and ERD diagrams (Mermaid)
└── meeting-minutes/   # Sprint ceremony PDFs
```

## Documentation

- [Docs index](./docs/README.md)
- [User stories](./docs/user-stories.md)
- [Authentication](./docs/authentication.md)
- [Database schema](./docs/database-schema.md)
- [Wireframes](./docs/wireframes.md)
- [MVP scope](./docs/mvp-scope.md)
- [Implementation roadmap](./docs/implementation-roadmap.md)
- [Component planning](./docs/component-planning.md)
- [Project organization](./docs/project-organization.md)
- [Diagrams](./diagrams/README.md)

## Sprint Progress

| Sprint | Focus | Status |
|--------|-------|--------|
| Sprint 1 | Repo setup, tech stack, wireframes, database planning, auth research | Complete (planning) |
| Sprint 2 | Architecture diagrams, workflows, ERD, refined wireframes, MVP scope | Complete (documentation) |
| Sprint 3 | Documentation refinement, implementation roadmap, starter template | In progress |
| Sprint 4 | Authentication and feature CRUD | Planned |

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas) free tier)

### Backend

```bash
cd backend
cp .env.example .env   # edit MONGODB_URI and JWT_SECRET
npm install
npm run dev
```

API runs at `http://localhost:5000`.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App runs at `http://localhost:5173`.

## License

See [LICENSE](./LICENSE).
