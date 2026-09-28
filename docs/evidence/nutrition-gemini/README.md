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
