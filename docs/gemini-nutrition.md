# Gemini nutrition estimates

The sparkle button sends the entered food/meal text through the authenticated
backend to Google Gemini and fills calories, protein, carbohydrates and fat.
No account details or existing nutrition records are sent. Portions are shown,
values remain editable, and saving is an explicit separate action.

## Local setup

In `backend/.env` (ignored by Git):

```dotenv
GEMINI_API_KEY=your-key-from-google-ai-studio
GEMINI_MODEL=gemini-3.5-flash-lite
```

Never place the key in a `VITE_` variable, frontend code, screenshots, or commits.
Restart the backend after changing `.env`:

```sh
npm --prefix backend run dev
```

Keep the frontend and MongoDB running as described in the main README.
Open http://localhost:5173/nutrition, enter a meal with portions, then click the
sparkle. For example: `1 cup cooked oatmeal with half a cup of blueberries`.

## Free tier and data use

Use a Google AI Studio project on the **Free** tier. The application cannot
inspect or enforce your Google billing tier; a key from a paid project can incur
charges. There is no automatic model fallback or retry. The server limits
estimates to five per user and twenty total per minute. Google's own quotas may
be lower. This in-memory limiter suits the single-process demo; shared deployments
would need a shared limiter. If a request fails, manual nutrition entry still works.

Google's unpaid-service terms allow submitted content and responses to improve
its products and undergo human review. Do not submit personal, sensitive or
medical information. The UI explains that the description is sent to Google.
AI nutrition values are approximate, especially without ingredient weights.

- [Pricing and free-tier availability](https://ai.google.dev/gemini-api/docs/pricing)
- [Project quotas](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Data-use terms](https://ai.google.dev/gemini-api/terms)
- [API keys](https://ai.google.dev/gemini-api/docs/api-key)

## Failure handling and persistence

The server validates model output, applies a 20-second timeout, and never returns
provider error bodies or keys. Blank descriptions are rejected before an outbound
request. Editing an input cancels the pending UI estimate so stale results cannot
overwrite the draft. Auth changes cancel requests and clear private state.

A signed receipt binds returned values and assumptions to the account and meal.
The backend derives whether saved values were adjusted, then stores provenance
with the entry in MongoDB. It does not store the receipt or API key in the entry.
Older local reference estimates remain compatible.

Automated tests mock Google while using real Express, MongoDB and browser flows;
the live provider check is documented separately in the evidence folder.
