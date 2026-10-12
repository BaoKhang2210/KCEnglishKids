---
kind: frontend_style
name: Tailwind CSS v4 + Custom Theme for Kids-Friendly UI
category: frontend_style
scope:
    - '**'
source_files:
    - client/src/index.css
    - client/src/App.css
    - admin/src/index.css
    - client/package.json
    - admin/package.json
    - admin/vite.config.ts
---

## System / Approach

Both frontend applications (`client/` and `admin/`) are styled with **Tailwind CSS v4** (v4.3.3) via the `@tailwindcss/vite` plugin, imported through `@import "tailwindcss"` in each app's root stylesheet. There is no separate `tailwind.config.js` — configuration lives directly in the CSS using Tailwind v4's `@theme` block.

- **Client (child/teacher SPA)**: heavily customized theme with playful, kid-friendly design tokens, custom animations, 3D button/card primitives, and accessibility helpers for preschoolers.
- **Admin SPA**: minimal Tailwind setup with Inter/Outfit fonts; no custom theme beyond base font overrides.

No other CSS framework or component library is used. The only styling-related runtime dependency is `tailwind-merge` (for conditional class merging in components).

## Key Files

- `client/src/index.css` — primary style entry point; defines the full child-facing theme, animations, and reusable primitives.
- `client/src/App.css` — leftover Vite scaffold styles (not part of the production UI).
- `admin/src/index.css` — admin portal base styles (Inter + Outfit fonts).
- `client/package.json` — declares `tailwindcss`, `@tailwindcss/vite`, and `tailwind-merge`.
- `admin/package.json` — same Tailwind v4 stack.
- `admin/vite.config.ts` — registers `tailwindcss()` plugin.

## Architecture and Conventions

### Design Tokens (via `@theme`)

In `client/src/index.css`:

```css
@theme {
  --font-sans: 'Nunito', 'Quicksand', system-ui, -apple-system, sans-serif;
  --font-display: 'Quicksand', 'Nunito', system-ui, sans-serif;
  --font-body: 'Nunito', system-ui, -apple-system, sans-serif;
}
```

Fonts are loaded from Google Fonts (referenced by name). Nunito is the body font; Quicksand is reserved for headings/display text.

### Responsive Strategy

Root `font-size` scales across breakpoints to keep touch targets readable on all devices:

| Breakpoint | Root size | Intended device |
|---|---:|---|
| `<640px` | 15px | Mobile |
| `≥640px` | 15.5px | Tablets |
| `≥1024px` | 16px | Laptops/Desktops |
| `≥1536px` | 16.5px | Large screens & interactive classroom whiteboards |

The `.child-ui` class bumps the base font to 18px for the child-facing pages.

### Animation System

A large set of named `@keyframes` is defined at the top level of `index.css` and exposed as utility classes prefixed with `animate-`:

- `soft-bounce`, `gentle-wobble`, `pop-in`, `star-spin`, `float-slow`, `mascot-wave`, `sound-ripple`, `pulse-glow`, `sunburst-spin`, `badge-float`, `shimmer-sweep`, `jelly-press`, `ribbon-flutter-left/right`, `active-stone-halo`, `holo-shift`, `float`

These are applied via Tailwind's arbitrary animation utilities or direct class names in JSX.

### Reusable Primitives (CSS-only)

The client defines a small set of shared visual primitives as plain CSS classes, intended to be composed with Tailwind utility classes in JSX:

- Buttons: `.btn-kid`, `.btn-3d-amber`, `.btn-3d-emerald`, `.btn-3d-sky`, `.btn-3d-pink` — 3D puffy buttons with gradient backgrounds, bottom border shadows, and press-down transforms.
- Cards: `.card-kid` — lift-on-hover card primitive.
- Flashcards: `.perspective-1000`, `.transform-style-preserve-3d`, `.backface-hidden`, `.rotate-y-180` — 3D flip utilities.
- Badges/Medals: `.medal-coin-gold/silver/bronze/diamond/locked` — radial-gradient coin faces.
- Stickers: `.puffy-sticker`, `.holographic-foil` — tactile sticker effects.
- Scrollbars: `.custom-scrollbar`, `.no-scrollbar` — thin amber scrollbar or hidden scrollbar.

### Component-Level Styling

Components under `client/src/components/child/` compose Tailwind utility classes directly in JSX (e.g., `className="bg-amber-50 ..."`). No per-component CSS files are used. The `clsx` and `tailwind-merge` packages are present for conditional class composition.

### Admin vs Client Separation

The two frontends share no CSS code. Each has its own `index.css` and Tailwind instance. The admin uses Inter (body) + Outfit (headings); the client uses Nunito + Quicksand. There is no shared design token package or monorepo-wide style config.

## Conventions and Constraints

- **Tailwind v4 syntax only** — both apps import Tailwind via `@import "tailwindcss"` and configure themes with `@theme`; no `tailwind.config.*` file exists.
- **Child-facing UI uses CSS-only primitives** — reusable visual building blocks (3D buttons, medals, stickers, flashcards) live in `client/src/index.css` rather than being encapsulated in a component library.
- **Animations are centralized** — all keyframe definitions and their `animate-*` aliases are declared in `client/src/index.css` and reused across components.
- **Responsive scaling is breakpoint-driven on the root font-size**, not via a fluid type scale function.
- **No dark mode, no CSS variables for colors** — brand colors are hardcoded as Tailwind palette tokens (amber, emerald, sky, pink) and explicit hex values in the 3D button gradients.
- **Accessibility baseline** — `user-select: none`, `-webkit-tap-highlight-color: transparent`, and `text-rendering: optimizeLegibility` are applied globally in the `base` layer.
- **Admin portal is intentionally minimal** — it relies on default Tailwind spacing/colors with only font-family overrides; no custom theme tokens are defined.