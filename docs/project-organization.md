# Project Organization

Sprint 3 deliverable (User Story #21). How the team organizes repo artifacts, GitHub work, and documentation updates.

## Repository Layout

| Path | Purpose | Update when |
|------|---------|-------------|
| `docs/` | Requirements, planning, acceptance criteria | Any story refinement or new feature spec |
| `diagrams/` | Mermaid architecture, workflows, ERD | Schema or system design changes |
| `meeting-minutes/` | Sprint ceremony PDFs | After each scrum, planning, review, retro |
| `backend/` | Express API and Mongoose models | New endpoints or schema fields |
| `frontend/` | React UI | New pages, components, or routes |
| `README.md` | Project entry point | Stack or setup changes |

## Documentation Index

Full list: [README.md](./README.md)

**Sprint 3 additions:**

- [implementation-roadmap.md](./implementation-roadmap.md) — phased dev plan
- [component-planning.md](./component-planning.md) — module map
- [user-journeys.md](./user-journeys.md) — narrative user flows
- [project-organization.md](./project-organization.md) — this file

## GitHub Project Board (recommended columns)

| Column | Contents |
|--------|----------|
| **Backlog** | Groomed stories not yet in a sprint |
| **Sprint backlog** | Committed stories for current sprint |
| **In progress** | Active work (limit 1–2 per person) |
| **Review** | PR open or awaiting PO acceptance |
| **Done** | Accepted in sprint review |

### Labels

| Label | Use |
|-------|-----|
| `docs` | Documentation-only changes |
| `frontend` | React / UI |
| `backend` | Express / API |
| `database` | Schema or model changes |
| `sprint-3` | Sprint 3 scope |

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable, demo-ready code |
| `feature/<short-name>` | Individual feature or doc batch |

Commit to `main` only when changes are review-ready. Use conventional commit prefixes: `docs:`, `feat:`, `fix:`, `chore:`.

## Definition of Ready (backlog grooming)

A story is ready for sprint planning when it has:

1. User story statement (As a … I want … so that …)
2. Acceptance criteria (testable bullets)
3. Links to wireframe, schema, or API doc if applicable
4. Estimated story points
5. No unresolved blockers from prior sprint

## Definition of Done (sprint review)

1. Acceptance criteria met and demoed
2. Related docs/diagrams updated if behavior or schema changed
3. Code runs locally (`npm run dev` / `npm run build`)
4. Mingle / project board story marked Accepted

## Meeting Artifacts

| Ceremony | Output location |
|----------|-----------------|
| Sprint planning | `meeting-minutes/sprint-N/Sprint Planning...pdf` |
| Daily scrum | `meeting-minutes/sprint-N/Daily Scrum...pdf` |
| Sprint review | `meeting-minutes/sprint-N/Sprint Review...pdf` |
| Retrospective | `meeting-minutes/sprint-N/Sprint Retrospective...pdf` |
| Backlog grooming | Notes reflected in `docs/user-stories.md` and story AC |

## Communication

- **Discord** — day-to-day questions and standup async updates
- **GitHub Issues / Projects** — task tracking and PR links
- **Repo docs** — source of truth for technical decisions

## Sprint 3 Documentation Checklist

| Story | Artifact | Location |
|-------|----------|----------|
| #15 Architecture | System diagram + module context | `diagrams/system-architecture.md` |
| #16 Workflows | Flowcharts + journeys | `diagrams/user-workflows.md`, `user-journeys.md` |
| #17 Wireframes | Page layouts | `wireframes.md` |
| #18 Database | Schema + ERD | `database-schema.md`, `database-erd.md` |
| #19 Components | Module map | `component-planning.md` |
| #20 Roadmap | Implementation phases | `implementation-roadmap.md` |
| #21 Organization | This guide | `project-organization.md` |
