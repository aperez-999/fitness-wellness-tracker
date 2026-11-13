# Capstone 2 showcase — rubric evidence map

Team #95, Fall 2026. This file points judges to **existing** repository material. Items marked **pending** are not in the repo or were not verified in this audit.

Latest `npm test` totals on the synchronized `main` branch (November 13, 2026): **61** backend unit, **15** frontend unit, **85** integration (**161** total). Dated logs and earlier runs are in [testing-evidence/](../testing-evidence/README.md). Commands are in the root [README.md](../../README.md#testing).

---

## SO1 — Problem analysis, constraints, feasibility, strategy

| Topic | Evidence in repo | Notes |
| --- | --- | --- |
| Problem statement | [problem-validation.md](sprint-1/problem-validation.md) | Capstone 2 Sprint 1 validation |
| Scope and requirements | [project-specification.md](sprint-1/project-specification.md) | Sprint 1 specification; later features are in Git history and sprint-3/4 notes |
| Historical problem and MVP scope | [capstone-1/planning/requirements.md](../capstone-1/planning/requirements.md), [mvp-scope.md](../capstone-1/planning/mvp-scope.md) | Capstone 1 planning; describes starter-era scope |
| Technology choices | Root [README.md](../../README.md#technology), [capstone-1/architecture/system-architecture.md](../capstone-1/architecture/system-architecture.md) | Stack table reflects the shipped app; Capstone 1 architecture doc is planning-level |
| Cost and hosting | Root README [Deployment](../../README.md#deployment) | Public URLs checked; Vercel Hobby and Atlas M0 described from prior notes, not re-opened in consoles |
| Time and resource estimates | Capstone 1 [implementation-roadmap.md](../capstone-1/planning/implementation-roadmap.md), meeting-minute PDFs under [capstone-1/meeting-minutes/](../capstone-1/meeting-minutes/) | Scrum and planning records |

**Pending:** Formal Fall 2026 capstone report (DOCX) if stored outside the repo. Local read-only API latency sample: [performance-evaluation.md](performance-evaluation.md) (not production load testing).

---

## SO2 — Engineering principles, design, languages, testing

| Topic | Evidence in repo | Notes |
| --- | --- | --- |
| Design documents | [capstone-1/diagrams/](../capstone-1/diagrams/README.md), [database-schema.md](../capstone-1/architecture/database-schema.md), [api.md](../capstone-1/architecture/api.md) | ERD and workflows; `api.md` is Capstone 1 starter contract — current routes are in [backend/README.md](../../backend/README.md) |
| Two or more languages | `frontend/` (JavaScript/JSX), `backend/` (JavaScript), `shared/` (`.mjs`) | Same repo, single application |
| Test suites | `backend/tests/`, `frontend/tests/`, `tests/*.test.js` | Node built-in test runner; Playwright integration |
| Integration testing narrative | [sprint-3/integration-testing.md](sprint-3/integration-testing.md) | Workflow table; some rows reflect October 2026 runs |
| Acceptance reviews | [goals-acceptance-review.md](../goals-acceptance-review.md), [nutrition-acceptance-review.md](../nutrition-acceptance-review.md), [workout-acceptance-review.md](../workout-acceptance-review.md) | Feature sign-off checklists |
| UI and API evidence | [docs/evidence/](../evidence/) | Curated screenshots and JSON exports per feature |
| Test run logs | [testing-evidence/](../testing-evidence/README.md) | Dated logs (Nov 2 and Nov 11, 2026); see each file for pass/fail counts |
| API latency sample (local) | [performance-evaluation.md](performance-evaluation.md), [performance-evaluation-sample.csv](performance-evaluation-sample.csv) | Five read-only routes (`/health`, `/dashboard/summary`, `/workouts`, `/nutrition`, `/goals`); **25 sequential requests each** (125 total). All **125** returned **HTTP 200** on 2026-11-11. Script: [scripts/perf-qos-sample.mjs](../../scripts/perf-qos-sample.mjs). **Not** production, concurrent load, or stress testing. |

**Pending:** Code coverage percentages (no coverage tool in `package.json` scripts). Production API latency, load testing, and concurrency benchmarks were not measured.

---

## SO3 — Communication (poster, slides, demonstration)

| Topic | Evidence in repo | Notes |
| --- | --- | --- |
| Posters | [Capstone2-FinalPoster.pdf](../../Capstone2-FinalPoster.pdf), [Capstone1-FinalPoster.pdf](../../Capstone1-FinalPoster.pdf) | Root of repository |
| Demo screenshots | [docs/evidence/](../evidence/) README files per feature | Desktop/mobile PNGs and API evidence JSON |
| Live demonstration | Root README [Deployment](../../README.md#deployment) | https://dayform-fitness.vercel.app and API health URL |
| Sprint feature write-ups | [sprint-3/](sprint-3/), [sprint-4/dashboard-nutrition-goals.md](sprint-4/dashboard-nutrition-goals.md) | Implementation verification notes |

**Pending:** Showcase PowerPoint or slide deck (not found in repository). Demo video or external video link (not found in repository). Capstone 2 written report PDF/DOCX if only held locally or in Canvas.

---

## SO4 — IP, ethics, privacy, security, citations

| Topic | Evidence in repo | Notes |
| --- | --- | --- |
| License | [LICENSE](../../LICENSE) | MIT |
| Gemini meal estimates — privacy and terms | [gemini-nutrition.md](../gemini-nutrition.md) | Key handling, quotas, Google terms links |
| Wellness insights — data sent and medical disclaimer | Root README (Gemini paragraph), [WellnessInsight.jsx](../../frontend/src/components/WellnessInsight.jsx), [wellnessInsight.js](../../backend/src/services/wellnessInsight.js) | Server-side summary only; UI disclaimer |
| Authentication design | [capstone-1/architecture/authentication.md](../capstone-1/architecture/authentication.md), `backend/src/middleware/auth.js` | JWT and owner scoping in routes |
| Secrets hygiene | `.gitignore` (`.env`), `backend/.env.example`, `frontend/.env.example` | No `.env` files tracked |

**Pending:** Standalone code-of-ethics or fairness write-up beyond README and Gemini docs. Third-party asset attribution list (UI SVGs are in-repo; full citation sheet not separate).

---

## SO6 — SDLC, specification, plan, requirements, design, testing, walkthroughs

| Topic | Evidence in repo | Notes |
| --- | --- | --- |
| SDLC / sprints | [docs/README.md](../README.md), `docs/capstone-2/sprint-*`, Capstone 1 [meeting-minutes/](../capstone-1/meeting-minutes/) | Sprint 2 has no sprint note file; Sprint 5 has [final-qa-release-freeze.md](sprint-5/final-qa-release-freeze.md) |
| Requirements traceability | Capstone 1 [user-stories.md](../capstone-1/planning/user-stories.md), Capstone 2 sprint tickets | Historical and incremental |
| CHANGELOG | [CHANGELOG.md](../../CHANGELOG.md) | Through Capstone 2 Sprint 5 closeout |
| Walkthrough / feature evidence | `docs/evidence/*/README.md`, acceptance reviews | Step-by-step and screenshot indexes |
| Git history | `git log` on `main` | Single repo for Capstone 1 and 2 |

**Pending:** Full capstone documentation package if held outside the repo (written report, slides).

---

## Deliverables checklist (repository)

| Deliverable | In repo? | Location or status |
| --- | --- | --- |
| Capstone 2 poster | Yes | `Capstone2-FinalPoster.pdf` |
| Capstone 1 poster | Yes | `Capstone1-FinalPoster.pdf` |
| Application source | Yes | `frontend/`, `backend/`, `shared/` |
| Architecture / ERD diagrams | Yes | `docs/capstone-1/diagrams/`, `docs/capstone-1/architecture/` |
| Testing evidence (curated) | Yes | `docs/evidence/` |
| Testing evidence (regenerated) | Local only | `tests/artifacts/` (gitignored) |
| Capstone 2 formal documentation | **Pending / external** | Not located in tracked tree |
| Showcase slides | **Pending / external** | No `.pptx` in repository |
| Demo video | **Pending / external** | No video file or README link found |
