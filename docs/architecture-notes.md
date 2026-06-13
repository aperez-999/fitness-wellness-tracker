# Architecture Notes

Living document for system design decisions. Expanded during Sprint 1–2.

## Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | React 19 + Vite | Fast dev server, team familiarity, component model |
| Styling | Tailwind CSS v4 | Utility-first, responsive layouts, consistent with wireframe goals |
| Routing | React Router | Client-side navigation for dashboard sections |
| Backend | Node.js + Express | Matches course stack, simple REST API |
| Database | MongoDB + Mongoose | Flexible schema for fitness logs, aligns with Sprint 1 decision |
| Auth | JWT (Bearer token) | Simple MVP session model; documented in authentication.md |

## Repository Layout

```
fitness-wellness-tracker/
├── backend/          # Express API
├── frontend/         # React app
├── docs/             # Requirements, stories, auth, schema, wireframes
├── diagrams/         # Mermaid architecture, workflow, ERD
└── meeting-minutes/  # Sprint ceremony PDFs
```

## Request Lifecycle

1. React page calls REST API with `fetch` (JSON).
2. Express route validates input and authentication middleware when required.
3. Mongoose model reads/writes MongoDB.
4. JSON response returned; React updates UI.

See [diagrams/system-architecture.md](../diagrams/system-architecture.md) for diagrams.

## API Conventions

- Base URL: `http://localhost:5000/api` (development)
- JSON request/response bodies
- Errors: `{ "message": "..." }` with appropriate HTTP status
- Auth header: `Authorization: Bearer <token>`

## Environment Variables

**Backend (`backend/.env`):**

| Variable | Purpose |
|----------|---------|
| `PORT` | Server port (default 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Token signing secret |
| `CLIENT_URL` | Frontend origin for CORS (default `http://localhost:5173`) |

**Frontend (`frontend/.env`):**

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend API base URL |

## Security Considerations

- Passwords never logged or returned in API responses.
- CORS restricted to `CLIENT_URL` in development.
- All fitness data queries scoped by authenticated `userId`.

## Future Considerations

- Move JWT to httpOnly cookies for production hardening.
- Add request validation library (e.g. Zod) when API surface grows.
- Add integration tests before capstone demo.
