# Changelog

## Capstone 2 — Sprint 1

### Added

- Sprint 1 problem validation documentation
- Sprint 1 project specification
- Workout API integration
- Workout creation workflow
- Workout persistence
- Recent workout display
- End-to-end walking skeleton

### Existing Foundation from Capstone 1

- Initial frontend and backend architecture
- Authentication foundation
- Database models
- Requirements and planning artifacts
- Architecture and workflow diagrams

---

## Capstone 2 — later development (no sprint-2 notes in the repo)

Nutrition logging, goals, profile fields, the progress dashboard, Gemini meal estimates, deployment to Vercel, and the Dayform landing page landed on `main` before the sprint-3 verification documents. There is no `docs/capstone-2/sprint-2/` write-up. See Git history and `docs/evidence/` for feature-level evidence.

---

## Capstone 2 — Sprint 3 (documented October 2026)

### Verified

- Workout history management and acceptance coverage ([sprint-3/workout-history-management.md](docs/capstone-2/sprint-3/workout-history-management.md))
- Dashboard weekly rhythm and activity chart analytics ([sprint-3/charts-analytics.md](docs/capstone-2/sprint-3/charts-analytics.md); the UI label is **Activity chart**; older notes say **Deep Insight**)
- Goal progress counted from saved workouts ([sprint-3/goal-progress-integration.md](docs/capstone-2/sprint-3/goal-progress-integration.md))
- Cross-feature integration testing report and `tests/core-workflow.test.js` ([sprint-3/integration-testing.md](docs/capstone-2/sprint-3/integration-testing.md))

---

## Capstone 2 — Sprint 4 (documented October 31, 2026)

### Added

- `GET /api/dashboard/summary` for this week's meals and active goals
- Dashboard summary cards, refresh behavior, and privacy checks
- Integration tests and evidence under `docs/evidence/dashboard-nutrition-goals/`
- Sprint note: [sprint-4/dashboard-nutrition-goals.md](docs/capstone-2/sprint-4/dashboard-nutrition-goals.md)

### Also shipped before this sprint closed on `main`

- AI wellness insights (Gemini) on the dashboard, with tests and `docs/evidence/wellness-insights/` (merged in Git before the sprint-4 dashboard card work)

---

## Capstone 2 — Sprint 5 (completed, Fall 2026)

### Shipped on `main` (Allen Cruz — Story #1188, PR #16)

- Final application QA and release freeze report ([sprint-5/final-qa-release-freeze.md](docs/capstone-2/sprint-5/final-qa-release-freeze.md))
- Release QA integration tests (layout widths, axe, keyboard focus, skip link)
- Optional Google sign-in (frontend button + backend ID token verification)
- Fixes: signup 400 for non-text fields (D1), preserve session on non-401 auth errors (D7), safe handling of truncated JSON responses (D10), flaky dashboard integration races (D6)
- AI insights production validation notes under `docs/evidence/wellness-insights/production/`
- Poster PDF, README alignment, and showcase evidence screenshots for production smoke checks

### Sprint 5 closeout (repository cleanup and verification)

- Root and package README updates for the shipped app (features, env names, docs pointers)
- Capstone 2 rubric evidence map ([rubric-evidence.md](docs/capstone-2/rubric-evidence.md))
- Local API latency sample script and report ([scripts/perf-qos-sample.mjs](scripts/perf-qos-sample.mjs), [performance-evaluation.md](docs/capstone-2/performance-evaluation.md))
- Dated test run logs in [docs/testing-evidence/](docs/testing-evidence/README.md) (historical Nov 2 and Nov 11; see README for counts before the Sprint 5 merge)
- Dashboard summary resilience when refresh returns incomplete JSON; Activity chart UI label alignment; nutrition estimate undo abort; integration test timing fixes
- Acceptance review docs link to tracked `docs/evidence/` instead of gitignored `tests/artifacts/`

### Outside this repository

- Showcase slides and demo video (not stored in Git)
