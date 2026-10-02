# Goals acceptance review

Branch: `wellness-goals`.

## Project structure and implementation

- `backend/src/models/Goal.js`: Mongoose model for the `goals` collection. A goal
  has a name (`title`), a type (`category`: workout, nutrition, or wellness), a
  target value, progress (`currentValue`, starting at 0), an optional unit, a
  target date, and a status (`active` or `completed`).
- `backend/src/utils/goalValidation.js`: field-level validation shared by create
  and update, unit tested in `backend/tests/goalValidation.test.js`.
- `backend/src/routes/goals.js`: authenticated create, list, update, and delete
  routes, mounted at `/api/goals` through the existing `/api` router.
- `frontend/src/lib/api.js`: `getGoals`, `createGoal`, `updateGoal`, and
  `removeGoal`, built on the existing authenticated `apiFetch` helper.
- `frontend/src/pages/GoalsPage.jsx` and `goals.css`: the protected `/goals` page
  in the existing Dayform layout, replacing the Capstone 1 placeholder.
- `tests/goals.test.js`: Playwright and a disposable MongoDB instance exercise the
  real API, database, and UI without loading backend `.env`.

The Goals page lists active goals with the soonest target date first, plus a
Completed view. Each active goal has a progress slider that saves automatically
half a second after the last change; the Edit form sets exact values, including
progress beyond the target. Marking a goal complete raises its progress to the
target. Deleting asks for confirmation first. Goals past their target date are
labeled overdue and can still be edited or completed.

## API contract

All endpoints require `Authorization: Bearer <token>` and send
`Cache-Control: no-store`. `userId` always comes from the verified token; an owner
sent by the client is ignored.

- `POST /api/goals`: requires `title` (trimmed, 1–120 characters), `category`
  (`workout`, `nutrition`, or `wellness`), `targetValue` (a number or numeric
  string above 0, at most 10,000,000), and `targetDate` (`YYYY-MM-DD`, a real
  calendar date, today or later in the `timeZone` the browser sends). Optional
  `currentValue` (0 or more, default 0) and `unit` (up to 30 characters). New goals
  are always `active`. Returns `201 { goal }`. Invalid fields return
  `400 { message, errors }` with one message per field.
- `GET /api/goals?status=active|completed`: returns `200 { goals }`, only the
  authenticated user's goals with that status (default `active`), soonest target
  date first. Any other status returns `400`.
- `PUT /api/goals/:id`: replaces the goal's details, validated as above, plus an
  optional `status`. A goal whose date has passed may keep that date but cannot
  move to a different past date. When the resulting status is `completed`,
  progress is raised to the target (progress already above it is kept); this also
  applies to progress-only updates of a completed goal. Returns `200 { goal }`.
  Malformed IDs return `400`. Goals that don't exist or belong to another user
  return `404`.
- `DELETE /api/goals/:id`: returns `204`, or `404` for goals that don't exist or
  belong to another user.
- Missing or invalid authentication returns `401`, and the UI returns to login.

The Capstone 1 API plan listed `PATCH /goals/:id`; `PUT` is used instead to match
the existing workout routes. Target dates are stored as midnight UTC, the same way
workout dates are. The compound index is `{ userId: 1, status: 1, targetDate: 1 }`.

## Acceptance criteria

| Criterion | Verification |
| --- | --- |
| 1. Authenticated user can create a goal | Browser login and form submission; GET, POST, PUT, and DELETE without a token or with a fake one return `401`; a logged-out visit to `/goals` goes to login |
| 2. Goal contains a type/name, target value, and target date | Required by validation and the model; API assertions and direct MongoDB record inspection |
| 3. Stored in MongoDB and associated with the logged-in user | Direct database assertions after API and browser actions; owner matches the token's user; spoofed `userId` ignored |
| 4. User can view their active goals | Active list sorted by target date; completed goals listed separately; a second account sees none of the first account's goals |
| 5. User can update or delete an existing goal | Edit form, progress slider, mark complete, move back to active, and confirmed delete, each confirmed in MongoDB; edits and deletes also confirmed after reload; other users receive `404` |
| 6. Invalid input is handled appropriately | Unit tests for every field rule; API returns `400` with per-field messages and saves nothing; the form shows each message under its field |
| 7. Another team member verifies the completed workflow | **Pending human teammate verification**; checklist below |

## Reproduce automated verification

Use Node.js 22+ and the setup in [tests/README.md](../tests/README.md).

```sh
npm test --prefix backend
npm test --prefix frontend
node --test tests/goals.test.js
npm test --prefix tests
npm run build --prefix frontend
```

Screenshots and API/database evidence are generated in `tests/artifacts/goals-*`.
Reviewed copies and the test results are in
[goals evidence](evidence/goals/README.md). The JSON evidence contains generated
test account IDs and goal records; it does not contain passwords, JWTs, or
database credentials.

## Design decisions

- Completed goals are kept with a `completed` status instead of being deleted, so
  they can be reviewed or reopened.
- Marking a goal complete raises its progress to the target. This is enforced by
  the server, so every completed goal in the database has full progress.
- Progress may go past the target (for example, 25 of 20 miles).
- The slider moves in whole steps for whole-number targets, hundredths for decimal
  targets, and about 100 to 1,000 steps in total for targets above 1,000.
- The unit is free text with suggestions (miles, workouts, glasses, and so on).
- "Today" for date checks is the user's own day, based on the browser's timezone.

## Teammate workflow verification — pending

Run the app with a development MongoDB database (see "Persistent local development
database" in [tests/README.md](../tests/README.md)) and verify:

1. While logged out, open `/goals` and confirm you are sent to the login page.
2. Log in as account A, open Goals, and add a goal with a name, type, target,
   unit, and target date. Confirm it appears with 0 progress.
3. Click Add goal with an empty form, then try a target of 0 and a past date.
   Confirm a clear message for each and that no goal is added.
4. Move the progress slider. Confirm "Saved" appears and the value remains after a
   refresh.
5. Edit the goal's name, target, and date. Confirm the changes remain after a
   refresh.
6. Mark the goal complete. Confirm it leaves Active goals and shows full progress
   under Completed, then move it back to active.
7. Delete a goal. Confirm Keep goal cancels and Delete goal removes it, including
   after a refresh.
8. Log out, log in as account B, and confirm account A's goals are absent.
9. Inspect MongoDB and confirm each goal's owner is the account that created it.
   From `backend/`, with the development database running:

   ```sh
   node --input-type=module -e "
   import mongoose from 'mongoose';
   await mongoose.connect('mongodb://127.0.0.1:27017/fitness-wellness-tracker');
   const db = mongoose.connection.db;
   const users = await db.collection('users').find().toArray();
   const goals = await db.collection('goals').find().toArray();
   console.table(users.map((u) => ({ id: String(u._id), email: u.email })));
   console.table(goals.map((g) => ({ title: g.title, owner: String(g.userId), status: g.status, progress: g.currentValue, target: g.targetValue })));
   await mongoose.disconnect();
   "
   ```

- Reviewer: **pending**
- Date: **pending**
- Result / observations: **pending**
- Reviewed GitHub commit: **pending**

Automated verification does not substitute for this team member sign-off.
