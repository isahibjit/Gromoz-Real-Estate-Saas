# Gromoze CRM design system

## Visual authority

The approved Gromoze logo defines the product's brand palette: navy structure, teal actions, white surfaces and cool, quiet neutrals. The authenticated product shell remains the visual source of truth for layout: compact Manrope typography, crisp borders and restrained depth. Red is reserved for destructive actions and error states.

The interface is an operational SaaS workspace. Scanability, stable layouts, clear hierarchy, and fast task completion take priority over decoration.

## Theme source

Brand and neutral colors are owned by `apps/web/src/styles/global.css`. The supplied artwork's dominant navy is `#0B335B` and teal is `#009998`. Keep these primitives in `--brand-navy` and `--brand-teal`. Use the darker derived teal `#007C7B` for white-label controls and small link text; the original teal alone does not meet AA text contrast on white. Hover teal is `#006563`.

Use semantic Tailwind classes:

- `primary` for teal navigation selection, primary actions, links and focus.
- `secondary` for navy structure, supporting actions and strong body headings.
- `tertiary` is a compatibility alias to accessible teal for existing brand accents and notification emphasis.
- `success`, `warning`, and `destructive` only for their semantic states.
- `background`, `surface`, `card`, `muted`, `border`, and `foreground` for neutral UI.

Do not add brand hex values to components. Runtime customer-selected colors and provider-owned brand marks are the only exceptions.

The shared `BrandLogo` component uses the supplied transparent PNG (577 × 433), framing the full lockup or symbol with an SVG viewBox. Preserve the alpha channel without adding a background behind the logo. Do not recreate the wordmark, recolor it, stretch it, or render the complete wordmark as the collapsed icon. Preserve customer-supplied expanded and collapsed logos and saved login CMS overrides.

## Typography

- Use Manrope through `font-sans`.
- Use sentence case for headings, labels, actions, table headers, tabs, and status copy.
- Preserve uppercase only inside factual data such as acronyms, tax identifiers, and generated codes.
- Do not use uppercase transforms or wide tracking for hierarchy.
- Page titles use the shared `PageHeader` or `crm-page-heading` treatment.

## Shape and spacing

- Small details: `rounded-xs` or `rounded-sm`.
- Inputs and buttons: `rounded-md`.
- Cards and panels: `rounded-lg`.
- Dialogs: `rounded-xl`.
- Status badges may remain compact, but should not be decorative pills.
- Authenticated pages use the padding and maximum width supplied by `DashboardWorkspaceFrame`; screens must not add a second page shell.

## Shared components

Reuse the components exported by `packages/ui` for buttons, cards, inputs, textareas, selects, searchable selects, checkboxes, dialogs, tabs, badges, and tables. Extend a shared component when a genuinely reusable variant is missing.

Data tables stay full width, keep headers and cells on one line, and use horizontal scrolling rather than compressed columns. KPI surfaces reuse the existing dashboard KPI components.

## Interaction and accessibility

- Keep visible keyboard focus and accessible names on every control.
- Preserve content during background refreshes; reserve full skeletons for the initial load.
- Use toast messages for form-level errors and field styling for local validation.
- Respect reduced-motion preferences.
- Preserve manual workflows when optional integrations such as maps are unavailable.

## Platform login

The platform login extends this system with the user's architectural composition. Retain Manrope, semantic navy/teal tokens, the unchanged `BrandLogo`, and the existing `AuthLayout`, `AuthBrandPanel`, `AuthCard`, `LoginFormCard`, `SupportBox`, and shared controls. Keep the styling scoped to the platform variant in `apps/web/src/screens/auth/login/platform-login.css`; tenant login and CMS previews retain their existing layout and saved branding.

On desktop, the photograph supports the introduction, four feature cards and trust panel on the left. The supplied curved navy artwork supports the white account-access card on the right, with sales, download, support and legal links. Use `apps/web/src/assets/platform-login-background.png` (the supplied `Golden Hour Apartment Boulevard.png`) and `apps/web/src/assets/platform-login-wave.png` (the supplied transparent `Deep Blue Curved Wave Panel.png`) directly. Preserve the photograph and the wave's original contour and transparency; do not replace the wave with CSS geometry.

Below the desktop breakpoint (1024px), use a short branded photographic header followed by the usable form on navy. Hide the wave and optional feature/trust content, and place sales after the form and legal links. Keep the white form readable, controls labelled and keyboard focus visible at every size.

The platform variant is selected only after the shared cached hostname lookup resolves without a tenant. Preserve existing credential validation, password visibility, loading/error states, two-factor verification, and the no-remember-me policy. `Forgot password?` and `Contact sales` use the existing support email; they do not represent a password-reset API or a separate sales service. These composition rules apply only to the platform login, not the authenticated product shell or tenant identities.
