# REST API Reference

Bridges [architecture-notes.md](./architecture-notes.md), [component-planning.md](./component-planning.md), and [authentication.md](./authentication.md). Updated during Sprint 3 daily scrums 6–7 to connect planning artifacts with implementation.

**Base URL (development):** `http://localhost:5000/api`

## Conventions

- JSON request and response bodies
- Errors: `{ "message": "..." }` with appropriate HTTP status
- Authenticated requests: `Authorization: Bearer <token>`

## Health

### `GET /health`

| | |
|---|---|
| Auth | No |
| Response | `{ status, service, timestamp }` |

## Authentication

### `POST /auth/signup`

| | |
|---|---|
| Auth | No |
| Body | `{ email, password, confirmPassword, displayName? }` |

**Validation:** Password rules per [authentication.md](./authentication.md). Duplicate email returns `409`.

**Success `201`:** `{ token, user: { id, email, displayName, createdAt } }`

### `POST /auth/login`

| | |
|---|---|
| Auth | No |
| Body | `{ email, password }` |

**Success `200`:** `{ token, user }`  
**Failure `401`:** `{ message: "Invalid email or password" }`

### `POST /auth/logout`

| | |
|---|---|
| Auth | Yes |
| Success | `{ message: "Logged out" }` |

Client must also clear stored token.

### `GET /auth/me`

| | |
|---|---|
| Auth | Yes |
| Success | `{ user: { id, email, displayName, createdAt } }` |

## Planned — Workouts (Sprint 4–5)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/workouts` | List current user's workouts |
| POST | `/workouts` | Create workout |
| GET | `/workouts/:id` | Get one workout |
| PUT | `/workouts/:id` | Update workout |
| DELETE | `/workouts/:id` | Delete workout |

## Planned — Nutrition (Sprint 4–5)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/nutrition` | List nutrition logs |
| POST | `/nutrition` | Create log entry |

## Planned — Goals (Sprint 5)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/goals` | List goals |
| POST | `/goals` | Create goal |
| PATCH | `/goals/:id` | Update progress |

## Planned — Dashboard (Sprint 5)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard/summary` | Aggregated counts for dashboard cards |

Derived from [database-schema.md](./database-schema.md) progress strategy — no separate progress collection.
