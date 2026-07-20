# Sprint 4 Implementation Backlog

**Note:** Mingle user stories #22–#28 in Sprint 4 meeting minutes are **planning stories** (architecture, wireframes, API docs). This file tracks the **implementation backlog** used for starter development. See [story-id-reference.md](./story-id-reference.md).

From [Backlog Grooming Meeting #3](../meeting-minutes/sprint-3/Backlog%20Grooming%20Meeting%20Minutes%20%233%20(Sprint%203).pdf) and Sprint 3 daily scrums 6–7.

## User Story #22 — Implement authentication API

**As a** new user, **I want** to create an account and log in securely **so that** my fitness data stays private.

### Tasks

- [x] `POST /api/auth/signup` with validation
- [x] `POST /api/auth/login` with generic errors
- [x] `GET /api/auth/me` for session check
- [x] `POST /api/auth/logout`
- [x] JWT middleware (`requireAuth`)
- [x] Password hashing (bcrypt)

### Acceptance criteria

- Signup requires email, password, confirmation
- Password: 8+ chars, 1 number, 1 symbol
- Duplicate email → clear error
- Invalid login → generic error
- JWT issued on successful signup/login

**Docs:** [authentication.md](./authentication.md), [api.md](./api.md)

---

## User Story #23 — Wire auth UI and protected routes

**As a** user, **I want** login and signup forms that work **so that** I can access my dashboard.

### Tasks

- [x] `AuthProvider` and `useAuth` hook
- [x] Live login and signup pages
- [x] `ProtectedRoute` for `/dashboard`, `/workouts`, `/nutrition`, `/goals`, `/profile`
- [x] Logout in app header
- [x] Profile shows signed-in email
- [x] Shared `FormField` component

### Acceptance criteria

- Unauthenticated users redirected to `/login`
- Session persists on page refresh (`/auth/me`)
- Logout clears session and redirects to login
- Dashboard greets user by name or email

---

## User Story #24 — Workout logging (API + UI)

**As a** user, **I want** to log workouts **so that** I can track exercise over time.

### Tasks

- [ ] `GET/POST /api/workouts`
- [ ] Workouts list on `/workouts`
- [ ] Add workout form per [wireframes.md](./wireframes.md)
- [ ] Scope all queries by `userId`

### Acceptance criteria

- User can add workout with name and date
- List shows only own workouts, newest first
- Empty state when no workouts exist

---

## User Story #25 — Nutrition logging (API + UI)

**As a** user, **I want** to log meals **so that** I can track nutrition.

### Tasks

- [ ] `GET/POST /api/nutrition`
- [ ] Nutrition list and add form
- [ ] Optional daily calorie subtotal on page

### Acceptance criteria

- User can add food name, calories, meal type, date
- Entries scoped to authenticated user

---

## User Story #26 — Goals and dashboard summaries

**As a** user, **I want** to set goals and see progress on my dashboard **so that** I stay motivated.

### Tasks

- [ ] Goal CRUD API
- [ ] Goals page with progress display
- [ ] Dashboard summary cards (counts or recent activity)
- [ ] Optional `GET /api/dashboard/summary`

### Acceptance criteria

- User can create a goal with title and target
- Dashboard reflects at least workout/nutrition counts when data exists

---

## Priority order (Sprint 4 planning)

1. #22 + #23 — Authentication (staged / in progress)
2. #24 — Workouts
3. #25 — Nutrition
4. #26 — Goals + dashboard summaries (may spill to Sprint 5)

## Related planning artifacts

- [implementation-roadmap.md](./implementation-roadmap.md)
- [planning-artifacts-map.md](./planning-artifacts-map.md)
- [user-journeys.md](./user-journeys.md)
