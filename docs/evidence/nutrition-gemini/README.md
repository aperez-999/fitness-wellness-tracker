# Nutrition tracking submission evidence

Branch: `feat/nutrition-tracking`  
Verified implementation: `22bb5fda12fd09e2d00896aaaf0977af1a4dcadd`  
Verification date: September 28, 2026

## Required evidence

| Requirement | Evidence | Result |
| --- | --- | --- |
| Working UI screenshot | [Desktop](nutrition-gemini-desktop.png) and [mobile](nutrition-gemini-mobile.png) | Shows editable nutrition values, Gemini estimate, saved entry, and the final tray design |
| Database/API evidence | [API response and MongoDB record](nutrition-api-evidence.json) | POST returned 201; MongoDB contains the date, all nutrients and authenticated owner; the second account sees no entries |
| Tests | [28 unit tests](unit-tests.tap) and [13 workflow tests](workflow-tests.tap) | 41 passed, zero failures |
| Production build | [Build output](frontend-build.txt) | Passed |
| GitHub commit | Local implementation commit above; evidence stored in the commit containing this README | Remote branch publication is pending approval; a local commit alone does not fulfill this requirement |

## What the tests verify

Authenticated creation, required fields, safe invalid-input handling, MongoDB
persistence, ownership isolation, newest 30 entries, reload/reopen persistence,
editable AI estimates and saved provenance, Undo, input guardrails, quota errors,
and canceled requests. Desktop/mobile axe scans found no violations and mobile
had no horizontal overflow.

Tests use generated accounts and a disposable MongoDB database. The screenshots
and API JSON show separate test scenarios, so their nutrient values differ.
Google responses are mocked during automated tests; no backend `.env` or live
credentials are loaded. The earlier successful live provider check is recorded
separately in [live-gemini-check.json](live-gemini-check.json).

## Reproduce

From the repository root with dependencies installed and Node.js 22+:

```sh
node --test backend/tests/*.test.js frontend/tests/*.test.js
node --test --test-concurrency=1 tests/nutrition.test.js
npm --prefix frontend run build
```

## Remaining verification

The GitHub branch must be published to `aperez-999/fitness-wellness-tracker` and
the resulting commit URL supplied. Another human teammate must independently
verify the workflow and fill in the [acceptance review](../../nutrition-acceptance-review.md).
Automated tests do not substitute for that sign-off.
