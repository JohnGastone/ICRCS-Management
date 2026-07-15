# ICRCS Theme Starter

Drop-in design system extracted from the ISDMP portal. Gives another app the
same palette, typography, shadows, motion, and Tailwind class vocabulary
(`bg-icrcs-navy`, `text-primary`, `border-border`, `shadow-card`, …).

## Contents
- `theme/icrcs-theme.js` — canonical tokens (Tailwind 3 source of truth).
- `theme/icrcs-theme.css` — same tokens as a Tailwind 4 `@theme {}` block.
- `index.css` — global base styles + utility helpers (`.card-shadow`, `.animate-fade-in`, `.min-touch-target`, …).
- `tailwind.config.snippet.js` — Tailwind 3 config wiring.
- `inter-font.snippet.html` — the Inter webfont link (missing in the original).
- `icrcs-style-reference.standalone.html` — open in a browser to see the palette + components.

## Install — Tailwind 3 (CRA / Vite)
1. Copy `theme/` to `src/theme/`.
2. Merge `tailwind.config.snippet.js` into your `tailwind.config.js`.
3. Use `index.css` as your global stylesheet (imported once at app entry).
4. Add `inter-font.snippet.html` to `public/index.html` `<head>`.

## Install — Tailwind 4 (Next.js)
1. In `globals.css`: `@import "tailwindcss";` then paste the whole contents of
   `theme/icrcs-theme.css` (the `@theme` block + keyframes).
2. Copy the `@layer base` and `@layer utilities` blocks from `index.css`.
3. Load Inter (next/font/google or the link snippet).

## Class conventions (match the source app)
- Radii: cards/inputs `rounded-xl`, panels/modals `rounded-2xl`, pills `rounded-full`.
- Card: `bg-white rounded-2xl border border-gray-200/60 shadow-xl shadow-black/[0.04]`.
- Input: `rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy transition-all`.
- Primary button: `rounded-xl bg-icrcs-navy text-white font-semibold hover:bg-icrcs-navy-light shadow-md`.
- Badge: `text-xs px-2.5 py-0.5 rounded-full border font-semibold` + tinted token (`bg-icrcs-navy/10 text-icrcs-navy border-icrcs-navy/30`).
- Sidebar: `bg-icrcs-navy` with a `bg-icrcs-gold` top accent bar; active item `bg-icrcs-gold text-icrcs-navy`, inactive `text-white/70 hover:bg-white/10`.
- Depth via alpha tints (`/10`, `/20`, `white/[0.03]`) rather than many discrete colors.

## Keep in sync
`icrcs-theme.js` and `icrcs-theme.css` hold the same values in two formats.
Change a color in one, change it in the other.
