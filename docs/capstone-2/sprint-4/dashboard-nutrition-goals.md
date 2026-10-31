# Sprint 4 — Dashboard Nutrition & Goals Integration

Story ### · Checked October 31, 2026

The dashboard now shows this week's meals and calories and the user's active
goals next to the workout widgets. Both cards come from the signed-in user's
saved records in MongoDB, through one new endpoint. The workout charts, Deep
Insight, and the AI insight work as before.

| Criterion | Result |
| --- | --- |
| Dashboard displays the authenticated user's nutrition and goal information | Pass — "Meals this week" and "Active goals" cards sit below the workout widgets. |
| Weekly summary shows meals logged and total calories | Pass — meal count and kcal recorded, with calories rounded to whole numbers. |
| Totals use actual saved entries for the current week | Pass — saved entries dated Monday through today in the browser's timezone; last week's entries and entries dated later this week are left out. |
| Active goals show saved progress and target values | Pass — each goal shows progress / target with its unit, a bar, and its due date; goals that count workouts show their counted progress. |
| Completed goals are excluded | Pass — a goal marked complete leaves the card and the "more goals" count. |
| Empty states | Pass — "No meals logged this week." with Log a meal, and "No active goals right now." with Set a goal, including accounts with only older meals or only completed goals. |
| Users cannot see another user's data | Pass — every query uses the user ID from the login token; a `userId` in the request is ignored, and other accounts' meals and goals never appear. |
| Updates after saving changes | Pass — the cards reload when the user comes back to the dashboard or the tab, on Refresh, on a browser refresh, and when a workout is saved or removed. |
| Existing dashboard features keep working | Pass — all 26 existing dashboard tests, including Deep Insight, and the 7 insight tests still pass. |
| Responsive on desktop and mobile | Pass — side by side on desktop, stacked below 1,100 px. No horizontal scrolling at 820, 390, 360, or 320 px or on a landscape phone; links at least 44 px tall; no axe violations. |
| Automated tests | Pass — see Checks. |

**Behavior**

- `GET /api/dashboard/summary?timeZone=…` returns this week's meal count and
  calories, the three active goals due soonest, and the number of active goals.
  It requires a login and is never cached.
- The week runs Monday through today, the same week as the workout chart. A meal
  dated later this week counts once its day arrives. Each nutrition entry counts
  as one meal.
- Goals use the Goals page's order and wording, so overdue goals come first.
  Goals that count workouts show the same counted progress as the Goals page.
- The cards reload when the dashboard opens, when the user returns to the tab,
  every minute, on Refresh, and when a workout is saved or removed.

**Checks:** 54 backend unit tests (5 new), 15 frontend unit tests (5 new), and
the frontend build passed. All 67 integration tests passed on a local MongoDB,
including 9 new dashboard summary tests. The dashboard was checked by hand on
desktop and at phone widths. Production and load testing were not performed.

[Run tests](../../../tests/README.md#dashboard-summary-checks) ·
[Screenshots](../../evidence/dashboard-nutrition-goals/)

Ready for teammate review. The dashboard lists up to three goals; the rest are on
the Goals page. A nutrition entry that records a whole day counts as one meal.
