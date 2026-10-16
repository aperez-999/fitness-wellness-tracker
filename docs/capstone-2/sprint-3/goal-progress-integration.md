# Sprint 3 — Goal Progress Integration

Story #610 · Checked October 15, 2026

Workout goals can now count their progress from the user's saved workouts instead
of a number the user sets. A goal can count workouts, workout minutes, or workout
hours from a start date through its target date. Manual goals work as before.

| Criterion | Result |
| --- | --- |
| Existing saved goals are retrieved correctly | Pass — only the signed-in user's goals load; goals saved before this change load as manual with their saved progress. |
| A supported goal is compared against tracked data | Pass — workout count, minutes, and hours goals are counted from the user's saved workouts. |
| Current progress and target are clearly displayed | Pass — each card shows progress / target with the unit, a bar, and the date counting starts. |
| Progress updates when activity data changes | Pass — adding, editing, or deleting a workout changes progress; an open Goals page refreshes when workouts change in another tab and when the user returns to it. |
| Completed goals are visually distinct | Pass — separate Completed list, "Completed" badge, and honey-colored bar; active goals at their target show "Target reached". |
| Users without a goal get an empty state | Pass — "No active goals yet" with a New goal button. |
| Progress uses only the authenticated user's data | Pass — the workout query uses the user ID from the login token; other accounts' workouts never count. |
| Existing goal creation and editing still work | Pass — the existing goal tests and the core workflow test pass unchanged. |

**Behavior**

- Only workout goals can be tracked. Tracked goals need a start date on or before
  the target date. The unit is set automatically: workouts, minutes, or hours.
- Workouts count from the start date through today, never past the target date.
  Future-dated workouts wait for their day. Workouts without a duration count as
  workouts but add no minutes. Hours are minutes divided by 60.
- Progress is calculated each time goals load and is not saved. "Today" uses the
  browser's timezone, sent as `GET /api/goals?timeZone=…`, or UTC if none is sent.
- Completed tracked goals keep their real count. Manual goals are still raised to
  the target when completed.
- Goals now have `tracking` (`manual`, `workoutCount`, `workoutMinutes`, or
  `workoutHours`) and `startDate`. For tracked goals, `currentValue` in API
  responses is the counted progress.

**Checks:** 38 backend unit tests, 10 frontend tests, and the frontend build passed.
All 46 integration tests passed on a local MongoDB, including 3 new goal progress
tests. Goal pages were checked by hand on desktop and at phone widths. Production
and load testing were not performed.

[Run tests](../../../tests/README.md#goal-progress-checks) ·
[Screenshots](../../evidence/goal-progress/)

Ready for teammate review. Nutrition and wellness goals are still updated by hand,
and goal progress appears only on the Goals page. If a background refresh finishes
just as a slider change saves, the slider can show the older number until the next
refresh; the saved value is correct.
