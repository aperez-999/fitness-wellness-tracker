# Gemini nutrition estimate evidence

Verified September 28, 2026 on `feat/nutrition-tracking`.

- 28 backend/frontend unit tests passed.
- 13 nutrition integration/browser tests passed against real Express and a
  disposable MongoDB database. Google responses were mocked in this suite;
  no local `.env` or live credentials were used by automated tests.
- Desktop and mobile axe accessibility scans found no violations; mobile had no
  horizontal overflow. Screenshots below show the mocked estimate workflow.
- Production frontend build passed.
- A separate live request using the configured server key succeeded with
  `gemini-3.5-flash-lite`. The generic input and returned estimate are recorded
  in [live-gemini-check.json](live-gemini-check.json). No credential is included.
- Tests cover authentication, owner isolation, saving adjusted AI values and
  provenance to MongoDB, reload, quota failures, invalid output, and cancellation
  of stale estimates. Signed estimate receipts cannot act as login tokens.
- Guardrail coverage verifies local rejection of links, email addresses and
  non-word input; international food names; one in-flight request per user;
  provider quota cooldown and recovery; an inline retry countdown; and Undo
  restoring all nutrient values and prior estimate provenance. Manual entry and
  saving stay available during cooldown. No extra live provider calls were
  needed to verify these protections.

[Desktop screenshot](nutrition-gemini-desktop.png) ·
[Mobile screenshot](nutrition-gemini-mobile.png)

Human teammate workflow verification remains pending in the acceptance review.

## Portion note design update

The estimate now presents its assumed portion as the main content, with a plate
icon, a compact AI heading, an Undo action, and a quieter adjustment reminder.
The two relevant existing browser tests passed again after this presentation-only
change, including Undo/provenance behavior, desktop/mobile axe scans and mobile
overflow checks. The frontend production build also passed. Screenshots above
show the updated layout.

The heading now uses a custom salad-bowl SVG in the existing workout illustration
palette. The desktop/mobile workflow and accessibility checks, plus the frontend
build, passed again for this icon update.

The four nutrient controls now sit inside a square molded tray with a rolled rim, subtle surface grain,
recessed compartments and cast shadows. The existing desktop/mobile workflow, accessibility and
overflow checks passed, and the frontend build passed. Screenshots are updated.

## Matte tray and compact guidance

The tray uses softer rim lighting and shadows, with lightly inset number fields
that retain visible keyboard focus. The Gemini disclosure and portion note are
more compact, preserving the assumed portion, approximation reminder and Undo.
Nutrient labels remain unchanged. Three focused browser tests passed, covering
editable estimates, Undo/provenance, quota recovery and desktop/mobile accessibility;
the production build also passed. Screenshots above show this version.
