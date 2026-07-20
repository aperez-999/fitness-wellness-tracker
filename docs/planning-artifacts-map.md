# Planning Artifacts Map

Sprint 3 daily scrum 7 deliverable — connects architecture, workflows, components, database, and implementation docs so the team can move from planning to development without gaps.

## Artifact relationships

```mermaid
flowchart TB
    subgraph Requirements
        REQ[requirements.md]
        MVP[mvp-scope.md]
        STORIES[user-stories.md]
    end

    subgraph Design
        WF[wireframes.md]
        JOURNEYS[user-journeys.md]
        FLOW[user-workflows.md]
    end

    subgraph Architecture
        ARCH[architecture-notes.md]
        SYS[system-architecture.md]
        COMP[component-planning.md]
        API[api.md]
    end

    subgraph Data
        SCHEMA[database-schema.md]
        ERD[database-erd.md]
    end

    subgraph Execution
        ROADMAP[implementation-roadmap.md]
        S4[sprint-4-backlog.md]
        S5[sprint-5-backlog.md]
        C2[capstone-2-handoff.md]
        ORG[project-organization.md]
    end

    REQ --> MVP
    MVP --> ROADMAP
    STORIES --> S5
    STORIES --> S4
    WF --> JOURNEYS
    JOURNEYS --> FLOW
    ARCH --> SYS
    SYS --> COMP
    COMP --> API
    SCHEMA --> ERD
    ERD --> API
    ROADMAP --> C2
    ROADMAP --> S4
    API --> COMP
    ORG --> STORIES
```

## Where to look for…

| Question | Start here |
|----------|------------|
| What is in the MVP? | [mvp-scope.md](./mvp-scope.md) |
| What sprint are we on? | [user-stories.md](./user-stories.md) |
| How should pages look? | [wireframes.md](./wireframes.md) |
| How does a user move through the app? | [user-journeys.md](./user-journeys.md), [user-workflows.md](../diagrams/user-workflows.md) |
| How do frontend/backend connect? | [system-architecture.md](../diagrams/system-architecture.md) |
| Which file owns which feature? | [component-planning.md](./component-planning.md) |
| What fields are in the database? | [database-schema.md](./database-schema.md), [database-erd.md](../diagrams/database-erd.md) |
| What endpoints exist? | [api.md](./api.md) |
| What do we build next? | [capstone-2-handoff.md](./capstone-2-handoff.md), [sprint-5-backlog.md](./sprint-5-backlog.md) |
| Capstone 1 submission? | [capstone-1-submission.md](./capstone-1-submission.md) |
| How does the team organize work? | [project-organization.md](./project-organization.md) |
| Auth rules and acceptance tests | [authentication.md](./authentication.md) |

## Code ↔ documentation links

| Code path | Documentation |
|-----------|---------------|
| `backend/src/routes/auth.js` | [api.md](./api.md), [authentication.md](./authentication.md) |
| `backend/src/models/*.js` | [database-schema.md](./database-schema.md) |
| `frontend/src/context/AuthContext.jsx` | [component-planning.md](./component-planning.md) |
| `frontend/src/components/ProtectedRoute.jsx` | [authentication.md](./authentication.md) |
| `frontend/src/pages/*.jsx` | [wireframes.md](./wireframes.md) |

## Maintenance (from daily scrum 6–7)

When you change any of the following, update the linked artifacts in the same PR:

1. **New API route** → `api.md`, `component-planning.md`, `system-architecture.md`
2. **New page or route** → `wireframes.md`, `component-planning.md`, `App.jsx`
3. **Schema field** → `database-schema.md`, `database-erd.md`, Mongoose model
4. **New user flow** → `user-journeys.md`, `user-workflows.md`
5. **Sprint scope change** → `user-stories.md`, `mvp-scope.md`, `sprint-5-backlog.md`

## Sprint 5 progress (through daily scrum 5)

| Story | Artifact | Status |
|-------|----------|--------|
| #29 Architecture review | `system-architecture.md`, `component-planning.md` | In progress |
| #30 Workflows / UX | `user-workflows.md`, `user-journeys.md` | In progress |
| #31 Wireframes | `wireframes.md` | In progress |
| #32 API / DB | `api.md`, `database-schema.md` | In progress |
| #33 Roadmap / MVP | `implementation-roadmap.md`, `mvp-scope.md` | In progress |
| #34 Presentation | `installation-guide.md`, README | In progress |
| #35 Repo cleanup | `meeting-minutes/`, repo layout | In progress |
