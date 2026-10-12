# Sprint 3 — Core Workflow Integration Testing

## 1. Overview

This ticket checks that Dayform's main workflows still work together: sign up and log in, log a workout, log nutrition, save a goal, update a profile, and see workout totals on the dashboard. The application code was not changed. Existing tests were reused, and one new API test was added for a single path that crosses those features.

## 2. Existing Test Coverage

These tests were already in the repo:

- `tests/dashboard.test.js` is a browser and API suite. It covers signup, login, logout, workout create/edit/delete, MongoDB persistence, dashboard counts and minutes, Deep Insight analytics, empty history, and invalid workout input. It uses a disposable database and a fixed clock.
- `tests/nutrition.test.js` covers creating a meal, saving nutrients in MongoDB, listing them again, rejecting bad values, and keeping one account from reading another's entries. Browser tests cover the nutrition page, reload, and sign-in.
- `tests/goals.test.js` covers creating a goal, updating progress, completing a goal (which raises progress to the target), privacy between accounts, and the goals page.
- `tests/profile.test.js` covers display name, pronouns, about me, and favorite activities, including a bad update, a MongoDB read after save, refresh, and sign-in again.
- Backend unit tests check workout, nutrition, goal, and profile validation without a database. Frontend unit tests check workout week math and nutrition estimate helpers.

What was missing was one test that walks registration, a workout, analytics, nutrition, a goal, and a profile update in the same run. `tests/core-workflow.test.js` adds that. It does not repeat the browser suites.

## 3. Testing Environment

Commands were run on October 11, 2026 from the repo.

- Backend and frontend unit tests do not open a database.
- Integration tests start MongoDB Memory Server, a temporary database that is deleted when the process exits. They do not read `.env` and do not use a shared or production database.
- Browser tests use Playwright. Accounts and passwords are generated in the test files only.
- `JWT_SECRET` for those runs is a random value set in the test process.

## 4. Test Cases and Results


| Test ID | Workflow       | Test Scenario                                                | Expected Result                                                        | Actual Result                                                                                                                                                               | Status                            |
| ------- | -------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| AUTH-01 | Authentication | Sign up, reject a bad login, then log in and call `/auth/me` | 201 with a token, 401 for the wrong password, 200 for the current user | `core-workflow.test.js` and the dashboard signup test                                                                                                                       | PASS                              |
| AUTH-02 | Authentication | Log out from the app                                         | Token is removed and protected pages return to login                   | Dashboard tests "expired logout" and "logout removes private content"                                                                                                       | PASS                              |
| AUTH-03 | Authentication | Call a workout route with no token                           | 401                                                                    | `core-workflow.test.js` and dashboard summary tests                                                                                                                         | PASS                              |
| WORK-01 | Workouts       | Create a workout, read it back, confirm the MongoDB owner    | Saved name, date, and duration; `userId` matches the token             | `core-workflow.test.js` and dashboard logging tests                                                                                                                         | PASS                              |
| WORK-02 | Workouts       | Edit duration, then delete the workout                       | Summary minutes change, then the record is gone                        | `core-workflow.test.js`; dashboard edit and removal tests                                                                                                                   | PASS                              |
| WORK-03 | Workouts       | Negative duration                                            | 400 and no new document                                                | `core-workflow.test.js` and `workoutValidation` unit tests                                                                                                                  | PASS                              |
| NUTR-01 | Nutrition      | Save a meal and list it again                                | Calories and macros match the database row                             | `nutrition.test.js` and `core-workflow.test.js`                                                                                                                             | PASS                              |
| NUTR-02 | Nutrition      | Negative calories, and another user's list                   | 400 for the bad meal; the other account sees no entries                | `nutrition.test.js`                                                                                                                                                         | PASS                              |
| GOAL-01 | Goals          | Create a goal and update `currentValue`                      | Progress is stored and listed for that user only                       | `goals.test.js` and `core-workflow.test.js`                                                                                                                                 | PASS                              |
| GOAL-02 | Goals          | Mark a goal complete                                         | `currentValue` becomes the target                                      | `goals.test.js` API and browser tests                                                                                                                                       | PASS                              |
| PROF-01 | Profile        | Update display name and read `/auth/me` again                | MongoDB and the next request show the new name                         | `profile.test.js` and `core-workflow.test.js`                                                                                                                               | PASS                              |
| PROF-02 | Profile        | Non-string display name; second user profile                 | 400; the other account's name is unchanged                             | Both profile and core-workflow tests                                                                                                                                        | PASS                              |
| DASH-01 | Dashboard      | Summary and analytics after a saved workout                  | Count and minutes match the stored duration                            | `core-workflow.test.js` and dashboard summary/Deep Insight tests                                                                                                            | PASS                              |
| DASH-02 | Dashboard      | Account with no workouts                                     | Empty daily list and the first-workout message                         | Dashboard empty-account tests                                                                                                                                               | PASS                              |
| DASH-03 | Dashboard      | Workout page accessibility after a save                      | No axe violations                                                      | Full suite failed on `.session-saved-reveal`. The same test passed when run alone. The plum and paper colors pass contrast; the scan landed while the highlight was fading. | FAIL in full suite; PASS on rerun |
| ERR-01  | Validation     | Bad signup, workout, nutrition, goal, and profile bodies     | 400 responses, no crash                                                | Unit tests plus the API integration tests                                                                                                                                   | PASS                              |


DASH-03 is an existing dashboard test. The workout itself was saved. The failure is the color check running while the short "saved" highlight is still on screen. See section 7.

## 5. Cross-Feature Integration

`tests/core-workflow.test.js` uses the real Express routes and a temporary MongoDB database:

1. Reject a signup whose passwords do not match.
2. Register and log in.
3. Reject a workout with a negative duration, then save a 30-minute walk for today.
4. Read the workout list, the weekly summary, and analytics. Count is 1 and minutes are 30.
5. Change the duration to 45 and confirm the summary minutes. Delete the workout and confirm the count is 0.
6. Reject a negative calorie value, then save a meal and read it back.
7. Create a goal, set progress to 4, and read it back from MongoDB.
8. Reject a bad profile update, save a display name, and read `/auth/me`.
9. Sign up a second user and confirm their workout, nutrition, and goal lists are empty.

Logout in this test checks `POST /auth/logout`, which returns "Logged out". The server does not revoke the JWT. The dashboard browser tests check that the app deletes `fwt_token` and leaves the protected page.

## 6. Test Execution Summary


| Command                                                                             | Result | Passed | Failed | Skipped |
| ----------------------------------------------------------------------------------- | ------ | ------ | ------ | ------- |
| `npm test` in `backend`                                                             | Pass   | 29     | 0      | 0       |
| `npm test` in `frontend`                                                            | Pass   | 10     | 0      | 0       |
| `npm run build` in `frontend`                                                       | Pass   | n/a    | n/a    | n/a     |
| `npm test` in `tests`                                                               | Fail   | 40     | 1      | 0       |
| `node --test --test-name-pattern="logging has labels" dashboard.test.js` in `tests` | Pass   | 1      | 0      | 0       |


`npm test` in `tests` is `node --test --test-concurrency=1 *.test.js`. That run included `core-workflow.test.js`, `dashboard.test.js`, `goals.test.js`, `nutrition.test.js`, and `profile.test.js`.

The nutrition suite prints a JSON parse error while it sends a broken request body on purpose. That test still passed and expects HTTP 400.

There is no lint script in the package files.

## 7. Acceptance Criteria Verification

- [x] 1. Authentication workflow is tested. Evidence: AUTH-01, AUTH-02, and AUTH-03.
- [x] 2. Workout workflow is tested from creation through persistence and display. Evidence: WORK-01, WORK-02, and the dashboard browser tests.
- [x] 3. Nutrition logging is tested from creation through persistence and display. Evidence: NUTR-01 and NUTR-02.
- [x] 4. Wellness goal workflow is tested from creation through saved progress. Evidence: GOAL-01 and GOAL-02. Completing a goal sets progress to the target. That behavior is already on `main` and was tested. It is not a separate unfinished progress-sync feature.
- [x] 5. Profile update workflow is tested through MongoDB persistence. Evidence: PROF-01 and PROF-02.
- [x] 6. Dashboard and analytics consume persisted user data. Evidence: DASH-01 and DASH-02.
- [x] 7. At least one invalid-input case is tested. Evidence: ERR-01, plus the negative duration, calorie, and profile cases in the new test.
- [x] 8. Results are documented in `docs/capstone-2/sprint-3/` with pass/fail evidence. This file is that record. DASH-03 is recorded as FAIL for the full-suite run.

## 8. Manual Verification Checklist

These steps were not performed in a browser for this ticket. Browser coverage for the same workflows comes from the Playwright tests listed above. Use a local backend, frontend, and a development database. Do not use production data.

1. Sign up with a new email. Sign out. Sign in again. Confirm protected pages redirect to login after sign out.
2. Log a workout for today. Refresh the dashboard and confirm the weekly count and minutes include it.
3. Edit the duration, then delete the workout. Confirm the dashboard totals follow each change.
4. On Nutrition, save a meal and refresh. The same calories and macros should still be listed.
5. On Goals, create a goal, move the progress control, refresh, and confirm the saved value.
6. On Profile, change the display name, refresh, and sign in again. The new name should remain.
7. Try a workout with a negative duration, or a profile name that is not text. The form should show an error and should not save that value.

## 9. Conclusion

Sign-up, login, logout, workouts, nutrition, goals, profile updates, and dashboard totals were exercised with isolated data. The new cross-feature API test passed. Backend tests (29), frontend tests (10), and the frontend production build passed. The full integration command passed 40 tests and failed 1 existing dashboard accessibility check; that same check passed when run by itself. It is now fixed and covered. No application code was changed. Nothing in this tree was waiting on an unmerged goals or nutrition branch; those features are already on `main`. If Allen or Ahanaf later merge more goal or nutrition work, rerun `npm test` in `tests` after that merge.