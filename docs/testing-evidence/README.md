# Test run logs

Plain-text output from `npm test` in each package. Filenames include the run date.

These logs do not contain `.env` values or live API keys. Integration runs use
generated secrets and do not call the real Gemini API.

| Date | Backend | Frontend | Integration | Notes |
| --- | --- | --- | --- | --- |
| 2026-11-02 | 58/58 | 15/15 | 73/73 | Before Sprint 5 merge |
| 2026-11-11 | 58/58 | 15/15 | 73/73 | Pre–PR #16 closeout work |
| 2026-11-13 | 61/61 | 15/15 | 85/85 | Sprint 5 closeout on synchronized `main` (includes release QA and Google sign-in suites) |

Reproduce with the commands in the root [README](../../README.md#testing).
