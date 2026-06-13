# User Workflow Diagrams

Sprint 2 deliverable (User Story #9). Major MVP user journeys aligned with wireframes and backlog grooming.

## 1. New User Registration

```mermaid
flowchart TD
    A[Landing / Sign Up page] --> B[Enter email, password, confirm password]
    B --> C{Validation passes?}
    C -->|No| D[Show field errors]
    D --> B
    C -->|Yes| E{Email already exists?}
    E -->|Yes| F[Show duplicate email error]
    F --> B
    E -->|No| G[Create account in database]
    G --> H[Start session / issue token]
    H --> I[Redirect to Dashboard]
```

**Outcome:** User has an account and an active session.

## 2. Returning User Login

```mermaid
flowchart TD
    A[Login page] --> B[Enter email and password]
    B --> C{Credentials valid?}
    C -->|No| D[Show generic invalid credentials message]
    D --> B
    C -->|Yes| E[Start session / issue token]
    E --> F[Redirect to Dashboard]
```

**Outcome:** User reaches the dashboard with a persisted session.

## 3. Logout

```mermaid
flowchart TD
    A[Any authenticated page] --> B[User clicks Logout]
    B --> C[Clear client session / token]
    C --> D[Optional: notify backend]
    D --> E[Redirect to Login]
```

**Outcome:** Session ends; protected routes require login again.

## 4. Dashboard Navigation (MVP)

```mermaid
flowchart LR
    D[Dashboard] --> W[Workouts]
    D --> N[Nutrition]
    D --> G[Goals]
    D --> P[Profile]
    W --> D
    N --> D
    G --> D
    P --> D
```

**Outcome:** User can reach all major MVP sections from one hub.

## 5. Log Workout (planned — future sprint)

```mermaid
flowchart TD
    A[Workouts page] --> B[Add workout form]
    B --> C[Enter name, date, duration, notes]
    C --> D{Valid input?}
    D -->|No| E[Show errors]
    E --> B
    D -->|Yes| F[Save to database]
    F --> G[Show in workout list]
    G --> H[Dashboard reflects updated activity]
```

## 6. Track Nutrition (planned — future sprint)

```mermaid
flowchart TD
    A[Nutrition page] --> B[Add food entry]
    B --> C[Enter food, calories, date]
    C --> D[Save entry]
    D --> E[Update daily summary on dashboard]
```

## 7. Manage Goals (planned — future sprint)

```mermaid
flowchart TD
    A[Goals page] --> B[Create or view goal]
    B --> C[Set title and target]
    C --> D[Save goal]
    D --> E[Update progress over time]
    E --> F[Dashboard shows goal status]
```

## Workflow Alignment

| Workflow | Sprint status | Wireframe section |
|----------|---------------|-------------------|
| Signup / Login / Logout | Documented; starter template next | Auth pages |
| Dashboard navigation | Documented; shell in starter | Dashboard, nav bar |
| Workout logging | Planned Sprint 3+ | Workouts |
| Nutrition tracking | Planned Sprint 3+ | Nutrition |
| Goal tracking | Planned Sprint 3+ | Goals |
| Profile | MVP: view only first | Profile |
