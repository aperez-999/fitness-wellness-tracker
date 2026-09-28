# Nutrition tracking acceptance review

Branch: `feat/nutrition-tracking`.

## Project structure and implementation

- `frontend/`: React 19, Vite, React Router; the protected `/nutrition` page uses
  the existing Dayform layout, authentication context, and authenticated API helper.
- `backend/`: Express routes, JWT middleware, Mongoose models, MongoDB connection.
  The nutrition router is mounted through the existing `/api` router.
- `tests/`: Playwright and a disposable MongoDB instance exercise the real API
  and UI without loading backend `.env` or touching the configured database.
- Existing workout tracking and authentication remain the foundation of the app.

The nutrition form records a calendar date, calories (kcal), protein (g),
carbohydrates (g), and fat (g). A food/meal name is optional. Zero and decimal
values are supported. The history shows up to 30 entries ordered by date,
creation time, then ID descending. Reopening the page fetches MongoDB records;
nutrition data is not stored in browser local storage. The existing JWT session
is stored there, so a still-valid session survives reopening.

## API contract

All endpoints require `Authorization: Bearer <token>` and send `Cache-Control: no-store`.

- `POST /api/nutrition`: requires `date` (`YYYY-MM-DD`, real calendar date),
  `calories`, `protein`, `carbohydrates`, and `fat` (finite nonnegative numbers or
  decimal strings, at most `Number.MAX_SAFE_INTEGER`). Optional `foodName`
  (trimmed, up to 120 characters) and `mealType` (breakfast/lunch/dinner/snack).
  Returns `201 { entry }`. Invalid fields return `400 { message, errors }`.
  `userId` always comes from the verified token; client ownership is ignored.
- `GET /api/nutrition`: returns `200 { entries }`, with only the authenticated
  user's latest 30 records. Query parameters cannot override the owner.
- `POST /api/nutrition/estimate`: accepts `{ foodName }` (1–120 characters),
  sends only that text to Gemini, and returns four values, assumed portions,
  provider/model metadata, and a signed receipt. No entry is saved until the user
  clicks Save entry. Submit `estimate: { receipt }` with the entry to retain
  verified AI provenance. Receipts are bound to the user and meal, expire after
  seven days, and cannot be used as login tokens. Quotas and provider failures
  return safe errors; entered values stay intact.
- Missing or invalid authentication returns `401`. The UI returns to login when
  the API rejects an expired session. Failed saves retain the draft for retry.

Mongoose's existing `NutritionLog` model uses the `nutritionlogs` collection.
New records require all four nutrient values. Existing records without macros
remain readable and show a dash for unknown values, not an invented zero.
The compound index is `{ userId: 1, date: -1, createdAt: -1, _id: -1 }`.

## Acceptance criteria

| Criterion | Verification |
| --- | --- |
| 1. Authenticated user can create an entry | Browser login and form submission; unauthenticated GET/POST rejected |
| 2. Date and all four nutrition values recorded | API assertions and direct MongoDB record inspection |
| 3. Stored in MongoDB for the logged-in user | Direct database assertions; spoofed user ID ignored |
| 4. User can view their own recent entries | Sorted, bounded list; second account sees none of the first account's data |
| 5. Invalid/missing values handled | Unit/API tests; form errors; failed-save draft recovery |
| 6. Data survives refresh/reopen | Browser reload and new browser context with restored login session |
| 7. Another team member verifies workflow | **Pending human teammate verification**; checklist below |

## Reproduce automated verification

Use Node.js 22+ and the setup in [tests/README.md](../tests/README.md).

```sh
npm test --prefix backend
npm test --prefix frontend
npm test --prefix tests
npm run build --prefix frontend
```

Screenshots and API/database evidence are generated in `tests/artifacts/`.
Reviewed copies and the test results are in
[current submission evidence](evidence/nutrition-gemini/README.md).
The JSON evidence contains generated test account IDs and nutrition records;
it does not contain passwords, JWTs, or database credentials.

## Interactive inputs and Gemini estimates

The entry form includes nutrient icons, synchronized sliders and exact number
inputs, plus an inline AI estimate button on the Food or meal input. Gemini uses
specified quantities or assumes a typical portion, displayed for review. The
user can edit all values. Saved estimates retain their provider, model, portions
and whether the values were adjusted. Older reference estimates remain readable.

See [Gemini setup](gemini-nutrition.md) and
[current evidence](evidence/nutrition-gemini/README.md). The earlier reference
picker and local-only inline screenshots are historical implementations.

## Teammate workflow verification — pending

Run the app with a development MongoDB database and verify:

1. Log in as account A and open Nutrition.
2. Save a dated entry with calories, protein, carbohydrates, and fat.
3. Confirm all values in Recent entries; refresh and reopen the application.
4. Try blank required fields and a negative value. Confirm useful errors and
   that no invalid record is added. Fix the fields and save successfully.
5. Log out and log in as account B. Confirm account A's entry is absent.
6. Inspect the API response or MongoDB record and confirm the owner is account A.

- Reviewer: **pending**
- Date: **pending**
- Result / observations: **pending**
- Reviewed GitHub commit: **pending**

Automated verification does not substitute for this team member sign-off.
