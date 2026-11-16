# Third-party notices and attribution

Dayform (FIU Capstone 2, Team #95). SPDX-style licenses below come from committed `package-lock.json` files unless noted as **service terms**.

This file is not legal advice. It summarizes third-party software, services, and assets referenced in this repository. Where documentation in Git is incomplete, items are noted for team follow-up.

## Application copyright

The project is released under the [MIT License](../LICENSE). The license file currently names **Alejandro Perez-Rivero** as copyright holder. Git history shows commits from all three team members. See [ethics-and-showcase-clearance.md](ethics-and-showcase-clearance.md#copyright-and-project-ownership) before changing copyright lines.

## Direct open-source dependencies (production)

| Package | License | Use in Dayform |
| --- | --- | --- |
| [react](https://www.npmjs.com/package/react) | MIT | UI |
| [react-dom](https://www.npmjs.com/package/react-dom) | MIT | UI |
| [react-router-dom](https://www.npmjs.com/package/react-router-dom) | MIT | Client routing |
| [express](https://www.npmjs.com/package/express) | MIT | REST API |
| [mongoose](https://www.npmjs.com/package/mongoose) | MIT | MongoDB access |
| [bcryptjs](https://www.npmjs.com/package/bcryptjs) | BSD-3-Clause | Password hashing |
| [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) | MIT | Session tokens |
| [cors](https://www.npmjs.com/package/cors) | MIT | CORS |
| [dotenv](https://www.npmjs.com/package/dotenv) | BSD-2-Clause | Local env loading |

**Build-time (frontend):** [vite](https://www.npmjs.com/package/vite) (MIT), [@vitejs/plugin-react](https://www.npmjs.com/package/@vitejs/plugin-react) (MIT), [tailwindcss](https://www.npmjs.com/package/tailwindcss) (MIT), [@tailwindcss/vite](https://www.npmjs.com/package/@tailwindcss/vite) (MIT).

**Transitive dependencies:** Each lockfile pulls in additional packages (on the order of 40+ frontend and 50+ backend). We did not audit every transitive package individually. Distributions of MIT software should retain upstream copyright notices per each license.

## Test and development dependencies (not shipped to end users)

| Package | License | Use |
| --- | --- | --- |
| [playwright](https://www.npmjs.com/package/playwright) | Apache-2.0 | Browser integration tests |
| [@axe-core/playwright](https://www.npmjs.com/package/@axe-core/playwright) | MPL-2.0 | Automated accessibility checks in tests |
| [mongodb-memory-server](https://www.npmjs.com/package/mongodb-memory-server) | MIT | Ephemeral MongoDB in tests |

## Runtime

| Component | License / terms | Use |
| --- | --- | --- |
| [Node.js](https://nodejs.org) | MIT | Runs API, builds, and tests |

## Hosted services and APIs (terms, not OSS licenses)

| Service | Documentation | Use in Dayform |
| --- | --- | --- |
| [MongoDB Atlas](https://www.mongodb.com/legal/terms-of-use) | Terms of use | Production database (`MONGODB_URI`) |
| [Vercel](https://vercel.com/legal/terms) | Terms of use | Frontend and API hosting |
| [Google Gemini API](https://ai.google.dev/gemini-api/terms) | API terms; see also [pricing](https://ai.google.dev/gemini-api/docs/pricing) and [data use](https://ai.google.dev/gemini-api/terms) | Optional meal estimates and wellness insights (backend only) |
| [Google Identity Services](https://developers.google.com/identity/gsi/web) | [Google APIs Terms of Service](https://developers.google.com/terms) | Optional **Continue with Google** sign-in |

Setup and privacy notes: [gemini-nutrition.md](gemini-nutrition.md), root [README](../README.md), [wellness insights production review](evidence/wellness-insights/production/README.md).

## Bundled assets and reference data

| Asset | Source | License / terms | Where used |
| --- | --- | --- | --- |
| **Manrope** variable font | [Manrope project](https://github.com/sharanda/manrope) | SIL Open Font License 1.1 — full text: [OFL-Manrope.txt](../frontend/public/fonts/OFL-Manrope.txt) | UI typography |
| **evening-trail.webp** | [Unsplash — Jacob Padilla](https://unsplash.com/photos/a-winding-path-through-a-golden-field-l7vvlM-F52Y) | [Unsplash License](https://unsplash.com/license) | Dashboard header; details in [photos/README.md](../frontend/src/assets/photos/README.md) |
| **NHS / USDA recipe numbers** | URLs cited per entry in [nutritionEstimates.mjs](../shared/nutritionEstimates.mjs) | Public recipe pages; **not** software licenses — follow each site’s content/use policy if you republish values | Optional reference matching when Gemini is unavailable |
| **favicon.svg**, **activity/*.svg**, **nutrition/salad-bowl.svg**, **Icon.jsx** inline paths | In-repository | Team reports creation or adaptation with **AI-assisted design tools** (e.g. ChatGPT image generation, **Figma**). Per-file provenance and tool terms are **not recorded in Git**. | Branding, welcome activity mascots, nutrition illustration, UI chrome icons |

These SVGs contain no embedded authorship metadata. The project MIT license applies to repository source code; it does **not** by itself establish rights for individual graphics. Confirm tool terms and redistribution requirements before reusing assets outside this repository.

## Evidence and posters

Screenshots under `docs/evidence/` and PDF posters at the repository root are team-produced captures or deliverables for the capstone, not third-party stock.

## What we did not verify here

- Full transitive npm license audit.
- Google OAuth branding guideline checklist.
- Whether poster or slide decks (outside this repo) credit every asset.
- Tool-specific terms for AI-generated or Figma-exported SVGs when reused on posters or slides.