# Ethics, privacy, and showcase clearance (Capstone 2)

Team #95 — Dayform. Concise notes for the Week 13 Provenance and Ethics Clearance assignment and the December 4, 2026 showcase. This is **not** a professional security audit or legal review.

## Privacy and user data (ACM 1.6 — Respect privacy)

Dayform stores per-account workouts, meals, goals, and optional profile fields in **MongoDB**. Routes use `requireAuth` and filter by `req.user.id` so one signed-in user cannot read or change another user’s records.

We designed optional **Gemini wellness insights** so the provider receives a **server-built summary** of the last 28 days, not full documents:

- Workout **names**, dates, and duration minutes (not workout notes).
- Nutrition **daily averages** from logged days (not individual meal names or notes).
- Up to **five active goal titles**, categories, progress, and target dates (not free-text goal notes).

**Meal estimates** send only the **meal description text** the user typed for that request (validated on the server). Email, display name, password, and existing log history are not included in either Gemini call. See `backend/src/services/wellnessInsight.js` (`summarizeActivity`) and `backend/src/services/mealEstimate.js` (`estimateFood`).

AI nutrition and wellness text is **approximate** and **not medical advice**; the UI states that insights are from Google Gemini.

For Google’s handling of API content, see links in [gemini-nutrition.md](gemini-nutrition.md). Users should not submit sensitive personal or medical information in meal descriptions.

**Retention:** Data remains in the team’s MongoDB until deleted through application features (where implemented) or database administration. There is no separate “delete my account” workflow in the current app; capstone demo accounts may persist on Atlas.

## Security hygiene (repository review)

- `.env` is gitignored; `backend/.env.example` and `frontend/.env.example` use placeholders only.
- Tracked sources scanned for common secret patterns; no live Gemini keys (`AIza…`) were found in committed files. A local `backend/.env` may exist on a developer machine — it must never be committed or screenshared.
- `GEMINI_API_KEY` is read only on the server. JWTs are sent as `Bearer` tokens; Google ID tokens are verified server-side.
- Server logs (`db.js`, `index.js`) print connection/port messages only, not request bodies or tokens.

## AI in the product and in development

**In the product (user-facing):** Optional Google Gemini for meal nutrient estimates and dashboard wellness insights, as described above and in the root README.

**In development (not user-facing):** Team members used **ChatGPT** and **Cursor** for troubleshooting, test ideas, documentation drafts, and code review assistance. Humans on Team #95 made implementation decisions, wrote and ran tests, and merged changes. Assistant tools did not replace acceptance testing or production configuration.

## Licensing and attribution

Open-source dependencies and bundled assets are summarized in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). MIT dependencies require retaining copyright notices in distributions; we do not yet ship a compiled `NOTICE` file with the Vercel deployment.

## Copyright and project ownership

[LICENSE](../LICENSE) is MIT with copyright **(c) 2026 Alejandro Perez-Rivero**. Git `shortlog` shows substantial commits from all three listed team members.

**Do not change the LICENSE file** (copyright line or license text) without **written agreement from Alejandro Perez-Rivero, Ahanaf Akif, and Allen Cruz**. That includes adding co-authors, renaming the copyright holder, or switching to another license. The MIT license does not by itself state **who owns** the original application code; it only grants permissions subject to the named notice.

**Git history scan (follow-up):** No committed `.env` files, no `AIza…` Gemini keys, and no non-placeholder `mongodb+srv://…` connection strings were found in tracked history across all commits (scan used path and pattern matching only; secret values were not printed). Local ignored `.env` files are out of scope for Git but must stay off stage and out of uploads.

## Verified engineering claims (keep accurate in README and slides)

| Claim | Evidence |
| --- | --- |
| Automated tests (latest on `main`) | **61** backend, **15** frontend, **85** integration (**161** total) on **2026-11-13** — [testing-evidence/README.md](testing-evidence/README.md) |
| Performance sample | **125** sequential local HTTP 200 responses (25 × 5 read-only routes); **not** production load or concurrency — [capstone-2/performance-evaluation.md](capstone-2/performance-evaluation.md) |
| Google Sign-In | Implemented; requires `VITE_GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_ID` in deployment |
| Gemini features | Require `GEMINI_API_KEY` on the API host |

Historical test counts before Sprint 5 merge remain in the same testing-evidence table and must stay labeled by date.

## Demo and showcase checks still requiring a person

- Live production env vars (Atlas, JWT, Gemini, Google OAuth) on Vercel.
- Whether demo accounts shown on stage use **fictional** `@example.com` or fresh throwaway emails only.
- Poster/slide credits for photo (Jacob Padilla / Unsplash), font (Manrope OFL), SVG mascots/icons (AI-assisted / Figma — see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)), and Open Graph–style stack logos if shown.
- Product Owner **written approval** of what may be shown publicly (not stored in this repo).
- Rehearsed walkthrough: Google button, Gemini flows, and offline fallback messaging.
- Color-only information: release QA used axe and keyboard tests; manual demo should still confirm contrast for projected displays.