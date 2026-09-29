# Inline meal estimate control

The separate Quick meal estimate panel and preset dropdown have been removed.
Food or meal now has a sparkle button inside its right edge. Pressing it uses
the entered name to find an existing local reference and fill all four nutrient
values. Sliders and exact inputs remain editable, and a portion assumption and
estimate disclaimer appear with the result.

This commit changes the UI only. The button still supports the five local
reference meals; it is not an arbitrary-description AI integration. Unknown
foods show a useful message and preserve the entered values. Empty descriptions
are handled without preventing manual nutrition entry.

An external OpenAI integration was blocked by automatic approval review pending
explicit authorization to send meal descriptions to OpenAI and make paid API
requests. No provider calls or provider integration code were added. No backend
OpenAI API key is configured. That remains a separate activation task.

## Verification

- Nine nutrition API/MongoDB/browser tests passed.
- Production frontend build passed.
- Desktop/mobile axe checks reported no violations in tested states.
- Checks cover removal of the panel/dropdown, the inline button, exact and slider
  edits, saved provenance, empty/unknown inputs, preserved values, and privacy.

[Desktop screenshot](nutrition-inline-desktop.png) ·
[Mobile screenshot](nutrition-inline-mobile.png)

Screenshots use generated test accounts and a disposable database. The earlier
interactive-estimate screenshots document the previous panel design.
