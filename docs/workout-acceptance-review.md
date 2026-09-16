# Workout tracking and progress dashboard acceptance review

## Scope

Both requested stories are implemented. The following checks concern workout
tracking and progress; they do not claim that Nutrition, Goals, or Profile editing
are complete.

| Acceptance criterion                          | Implementation and verification                                                                                             |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Add a workout with name, date, duration       | Composer and POST validation require all three; integration tests reject missing/invalid fields.                            |
| Save to the database                          | POST creates a Mongoose Workout; integration tests inspect records in a disposable MongoDB database.                        |
| Retrieve and display saved workouts           | Authenticated GET feeds searchable, date-grouped history and the recent preview.                                            |
| Associate the correct user                    | Creation takes the owner from the validated token, ignoring supplied user IDs.                                              |
| Prevent another user's records from appearing | List, summary, and removal queries filter by authenticated owner; tests cover spoofing and account switches.                |
| Persist after refresh                         | Browser reload tests retrieve the same saved database records.                                                              |
| Show recent workouts                          | Dashboard previews the latest three completed sessions; View all opens full history.                                        |
| Show a weekly progress metric                 | The dashboard shows weekly workout count, recorded minutes, and distinct active days.                                       |
| Use real backend data                         | Dashboard summaries aggregate MongoDB records; empty states never invent workouts or totals.                                |
| Update after additions                        | Save notifications refresh lists and summary, including cross-tab changes. Focus and visible-tab polling also refresh data. |
| Only show logged-in user's progress           | Summary aggregation uses the token owner; logout and account-switch tests prevent stale private content.                    |

## Additional behavior

- Remove actions confirm the exact record and delete only an owned workout.
- History saves show one brief inline encouragement, cycling phrases across saves.
- Reduced motion skips the visual celebration; factual success remains accessible.
- Recent duration bars represent the displayed sessions, not a weekly target or trend.
- Inline editing corrects a saved session without creating another record.
- History shows ten records at a time; the recent preview stays at three even with
  20+ workouts. Search operates across the full loaded history.
- Previous-week comparisons match elapsed weekdays. Deep Insight adds a bounded
  four-week timeline, metric controls, keyboard selection and a data table.

## Optional next decisions

These are outside the two original acceptance lists:

- Hide unfinished Nutrition/Goals navigation until those flows work, or prioritize
  their implementation for the next release.
- Consider a user-selected weekly target if people want one; avoid inventing goals.
- Store activity category independently from its editable name for reliable artwork
  and future activity breakdowns.
- Add server-side history pagination when larger volumes justify it. The current
  progressive display limits rendered rows but still loads the user's full history.

See [test setup and coverage](../tests/README.md) for commands and isolation details.
