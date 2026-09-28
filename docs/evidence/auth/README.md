# Signup and password controls

Verified on 2026-09-28.

The reported "Failed to fetch" was a connection failure: Vite responded on 5173,
while the API on 5000 and local MongoDB on 27017 refused connections. Starting
persistent local MongoDB restored the API, confirmed by `GET /api/health` = 200.

The development database can be restarted with `npm --prefix tests run db:local`.
It keeps data in the Git-ignored `backend/.local-data/mongodb/` directory. Start
only one database on 27017, and keep the backend and frontend running separately.

## Changes

- Open/closed eye buttons for login, signup, and password confirmation.
- Live checkmarks for eight characters, a number, and a symbol.
- Subtle invalid-field background and border transitions, with inline guidance.
- Validation on blur/submission; errors clear as the field is corrected.
- Clear connection errors without incorrectly marking valid credentials invalid.
- Duplicate emails identify the email field; failed requests preserve input.

## Evidence

- [Completed password checklist](signup-checklist-complete.png)
- [Mismatched password field](signup-field-error.png)
- [Connection error on mobile](signup-network-error.png)

Generated test accounts are shown; passwords remain masked.

## Checks

- Two authentication browser tests passed: checklist additions/removals,
  independent show/hide controls, invalid-field styles, mismatch correction,
  duplicate-email handling, network failure/retry, account creation, and redirect.
- Seven nutrition integration tests passed after shared form/API changes.
- Authentication and nutrition axe scans reported no violations in tested states.
- Frontend production build passed.

```sh
node --test --test-name-pattern="branded authentication|signup shows connection" tests/dashboard.test.js
node --test tests/nutrition.test.js
npm run build --prefix frontend
```
