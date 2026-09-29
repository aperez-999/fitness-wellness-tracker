# Interactive nutrition and meal estimates

This iteration adds nutrient icons, synchronized sliders and number inputs, and
an optional reference-meal estimator. The estimator collapses after applying
values; its disclaimer remains visible, and its assumptions can be reopened.

## How estimates work

This is a built-in reference lookup, not generative AI. No API key or third-party
request is involved when a person enters a meal. Five reference recipes are
included. Matching is case-insensitive and supports explicit aliases. Unknown
meals, extra ingredients, and quantities embedded in a name do not silently map
to a partial match. Use the serving control for quantities instead.

1. Enter a supported meal name (for example, Oatmeal with berries) or select one.
2. Review the assumed ingredients and portion, and set the serving multiplier.
3. Click **Fill with estimate**. If values already exist, the button explicitly
   says **Replace values with estimate**. Merely selecting a meal changes no numbers.
4. Adjust any value with its slider or number input and save.

The reference recipes are only starting points. Brands, portions, added oils,
preparation, and substitutions can change the actual nutrition. The interface
shows this disclaimer before and after filling values. No nutrition targets or
health scores are inferred from these numbers.

Each source is linked beside its portion assumptions. Published per-serving
values are in `shared/nutritionEstimates.mjs`, checked on 2026-09-28:

- [Oatmeal with berries — NHS](https://www.nhs.uk/healthier-families/recipes/porridge-with-yoghurt-and-berries/)
- [Yogurt berry parfait — USDA MyPlate](https://myplate-stg.kwaps.platform.usda.gov/recipes/yogurt-berry-parfait)
- [Scrambled eggs on toast — NHS](https://www.nhs.uk/healthier-families/recipes/super-scrambled-eggs/)
- [Chicken wrap — NHS](https://www.nhs.uk/healthier-families/recipes/tasty-chicken-wraps/)
- [Roast chicken dinner — NHS](https://www.nhs.uk/healthier-families/recipes/roast-dinner/)

## Persistence and validation

POST accepts optional `estimate: { referenceId, servings }`. The backend checks
that the reference exists and servings is a number between 0.25 and 10. It derives
an `edited` flag by comparing the submitted values with the scaled reference,
ignoring any client-supplied flag. All existing nutrient validation still applies.
GET returns this metadata only with the current user's records. The history
shows **Estimated** or **Estimate, adjusted**, the reference name, and multiplier.
Manual and older entries continue to work without estimate metadata.

Changing the food name alone does not overwrite numbers. If a reference has
already been applied, its original name remains in the estimate notice and
saved provenance, even if the user renames the entry. Changing the reference or
servings applies new numbers only when the estimate button is clicked.

## Verification

- Backend and frontend unit suites: 20 passed.
- Nutrition API/MongoDB/browser suite: 9 passed.
- Production frontend build: passed.
- Desktop/mobile accessibility checks: no violations in the tested states.
- Browser tests cover exact inputs, keyboard sliders, values beyond the initial
  slider scale, portion scaling, unsupported meals, invalid portions, explicit
  replacement, manual corrections, MongoDB persistence, and private provenance.

[Desktop screenshot](nutrition-interactive-desktop.png) ·
[Mobile screenshot](nutrition-interactive-mobile.png)

The original teammate acceptance review remains pending; these automated checks
and screenshots do not count as an independent human sign-off.
