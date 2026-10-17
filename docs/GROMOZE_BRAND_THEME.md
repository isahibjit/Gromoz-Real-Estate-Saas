# Gromoze brand and theme review

Update, 17 October 2026: the default artwork was replaced with the supplied transparent `gromoze-logo-removebg-preview.png` (577 × 433), preserved byte-for-byte. `BrandLogo` now frames this asset's full lockup and symbol; the login fallback no longer adds a white backing. Customer logo overrides and the theme palette are unchanged. The review below records the original 15 October artwork and validation.

Date: 15 October 2026. Based on the supplied final logo, `Gromoze Real Estate Logo.png` (1448 × 1086).

## Findings

The previous product theme combined two navy/blue tones, a red accent, orange lettering in the old sidebar logo, and an independent blue–green login-button gradient. Active navigation, notification badges and login actions consequently expressed different identities. The existing white sidebar, neutral cards, compact Manrope typography and shared component system remain appropriate for a real-estate sales workspace.

The approved Gromoze artwork has two dominant pixel colors: navy `#0B335B` and teal `#009998`. Navy provides structure and readable headings; teal identifies actions and selection. A quiet cool canvas separates working areas from white cards without competing with lead data.

## Color roles

| Role | Color | Application |
| --- | --- | --- |
| Logo navy | `#0B335B` | Headings, foreground, supporting actions, chart navy |
| Logo teal | `#009998` | Original artwork and chart accents |
| Accessible action teal | `#007C7B` | Primary buttons, links, active navigation, focus and caret |
| Action hover | `#006563` | Hover state for primary actions |
| Canvas | `#F4F8FA` | Workspace background |
| Soft teal surface | `#EAF5F5` | Subtle surfaces, navigation hover and badge backgrounds |
| White | `#FFFFFF` | Sidebar, header and cards; labels on teal actions |
| Supporting text | `#4B6274` | Secondary content and navigation labels |

Red continues to mean destructive action/error. Success, warning and third-party provider colors retain their existing meanings; they are not replaced with teal just to match the logo. Chart palettes still need multiple distinguishable categories.

## Contrast decisions

| Pair | Contrast ratio |
| --- | --- |
| Navy / white | 12.81:1 |
| Action teal / white | 5.04:1 |
| White / hovered action teal | 6.90:1 |
| Supporting text / white | 6.37:1 |
| Navy / canvas | 11.99:1 |
| Original logo teal / white | 3.49:1 |

The original teal is preserved in the artwork. Its darker derivative is used for small text and white-label controls to meet the 4.5:1 AA text threshold. These are measured color pairs, not a claim that every pre-existing screen has undergone a complete accessibility audit.

## Implementation and reuse

- Centralized colors in `apps/web/src/styles/global.css`; the existing Tailwind configuration and shared components consume the updated semantic tokens. Primary and tertiary roles now use accessible teal, secondary uses logo navy. No brand hex values were added to individual screen styles.
- Added `BrandLogo` as the single renderer for the supplied artwork. Its SVG viewBox frames either the complete lockup or the symbol without changing, stretching, redrawing or recoloring the source PNG. The shipped file is byte-for-byte identical to the supplied file.
- Replaced the built-in expanded and collapsed sidebar logos. The full logo retains its tagline; the collapsed rail uses the symbol. Active badges now use white/teal rather than red.
- Applied the same fallback logo to authentication and the login CMS preview. Updated the built-in product title/headline to Gromoze. Saved customer logos and CMS content retain precedence.
- The responsive check found an existing sidebar visibility defect. Closed navigation is now hidden at phone widths; opening the drawer shows the complete logo even when the desktop rail had been collapsed. Controls have explicit accessible names.
- Reused `DashboardSidebar`, its mobile/expanded state, shared buttons, existing tenant branding storage, and login CMS overrides. No business routes, API contracts, backend services, database schema or saved tenant records were changed.

Workspace brand settings are independent customer configuration. This change updates the product's theme and default artwork; it does not rewrite customer-selected colors, uploaded logos, support contacts, company documents or stored CMS content.

## Verification

- Inspected the real sidebar and shared controls in Chrome using a temporary local visual fixture with clearly labeled illustrative data. Checked the expanded desktop sidebar, 80-pixel collapsed rail, 390-pixel mobile viewport, closed mobile state and open mobile drawer. Browser viewport restored afterward; temporary preview sources removed.
- Regression coverage checks the default lockup, collapsed symbol and preservation of both expanded and collapsed tenant logos. Authentication tests use the new accessible logo name.
- Web production build passes; the existing bundle-size warning remains.
- Full frontend results: 256 passing tests, with the same 30 existing failed cases as the pre-change baseline. No additional failing case names.
- Shared logo and touched authentication components/tests pass lint. The sidebar/CMS files retain the same 18 pre-existing lint findings; no new lint diagnostics were introduced.
- Mechanical design detector returned no findings for the changed UI targets. Pixel-file identity, semantic color resolution and the contrast pairs above were checked independently.

Evidence is stored in `.git/gromoze-brand-review/`: `desktop.png`, `collapsed.png`, `mobile.png`, build/test/lint logs and `verification.json`. The fixture verifies layout and branding; it is not an authenticated CRM workflow or backend test. No deployment was performed.
