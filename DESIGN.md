# Design system

## Direction

**Quiet ink on paper, day or night.** The site is a stack of letters on a desk:
soft neutral paper in light mode, deep charcoal paper in dark mode, dark or
off-white ink, one muted violet accent, hairline rules, and generous silence.
Typography carries the character; effects carry nothing.

Light is the default. Dark is a separately tuned companion, not an inversion.

- **Home** is Persuade: one clear statement, two actions, a short index of recent
  notes.
- **Browse, Submit, View** are Operate: scanning, writing, and reading outrank
  expression. Familiar patterns win.

The old particle field, gradient text, glowing buttons, glass panels, colour
extraction, and hover-flip cards are anti-references. None of them return in
another costume.

## Palette

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#f7f7f5` | `#0b0d14` | Page ground |
| `surface` | `#ffffff` | `#12151f` | Cards, forms, raised panels |
| `surface-raised` | `#f1f1ee` | `#1a1e2b` | Inputs, hover surfaces |
| `line` | `#e3e3de` | `#2a3040` | Hairline borders and dividers |
| `line-strong` | `#c8c8c1` | `#414a60` | Hover borders, scrollbar thumb |
| `ink` | `#1b1c1a` | `#f1f0f5` | Primary text |
| `muted` | `#5d5f5a` | `#aeb0c2` | Secondary text, metadata, placeholders |
| `accent` | `#6248bd` | `#b6a4ff` | Links, focus rings, active nav |
| `accent-strong` | `#5636b8` | `#6d4acb` | Primary button fill |
| `accent-hover` | `#6a4fd0` | `#7d5bdd` | Primary button hover |
| `accent-weak` | `#f1edfb` | `#1d1833` | Quiet accent tint |
| `danger` | `#b3261e` | `#ff9b94` | Errors |
| `on-accent` | `#ffffff` | `#ffffff` | Text on accent fills |

No gradients. No glows. No coloured halos. Colour appears on actions, links,
focus, and state, and nowhere else.

## Typography

- **UI and body:** Inter (`--font-inter`). Weights 400 and 500 only.
- **Voice:** Newsreader (`--font-newsreader`) for page titles, story names, and
  the message itself. Regular weight, italic only for emphasis inside a heading.

| Role | Size | Line height |
|---|---|---|
| Page title | `text-3xl` → `text-4xl` | tight, `-0.02em` tracking |
| Home statement | `text-4xl` → `text-6xl` | `1.08`, `-0.02em` tracking |
| Section title | `text-xl` | snug |
| Body | `text-base` | `1.75` |
| UI / labels | `text-sm` | `1.5` |
| Metadata | `text-xs` | `1.5` |

Body copy stays within `65–75ch` (`max-w-prose`). Headings use
`text-wrap: balance`; paragraphs use `text-wrap: pretty`.

## Space and shape

- 4/8px rhythm. Page padding `px-4 sm:px-6 lg:px-8`; content width `max-w-6xl`
  (forms `max-w-3xl`).
- Section spacing `py-16` mobile, `py-24` desktop. Tight groups, generous
  separation.
- Radii: `8px` controls, `12px` cards and panels. Pills are reserved for small
  controls; there are none by default.
- Elevation is declared once: a `1px` border. Cards do not also carry a shadow.
- No nested cards.

## Components

- **Primary button:** solid `accent-strong`, white text, `h-11`, `rounded-lg`,
  hover a lighter violet, disabled at 60% with a wait cursor.
- **Secondary button:** transparent, `line` border, `ink` text, hover
  `surface-raised`.
- **Inputs:** `surface-raised` fill, `line` border, `rounded-lg`, `h-11`, focus
  border `accent` plus a soft `accent/30` ring. Visible labels; hints below the
  label; placeholders end in `…`.
- **Card:** `surface` fill, `line` border, `rounded-xl`; album art, recipient,
  track, four-line message excerpt, and one clear "Read story" link. The whole
  card is not a click target; the link is.
- **Navigation:** 64px bar, wordmark in Newsreader, two text links with 44px
  targets and `aria-current` on the active route.
- **Pagination:** previous / page input / next, 44px targets, disabled states
  at 40% opacity.
- **States:** skeleton grid while loading, inline error with a retry action,
  empty state with a next step, and a visible focus ring everywhere.

## Motion

Colour and border transitions only (`transition-colors`), plus one compositor
friendly arrow nudge on hover. No entrance animations, no looping decoration,
no parallax. Everything collapses under `prefers-reduced-motion: reduce`.

## Bans

Particles, gradient backgrounds, gradient text, gradient borders, glowing
buttons or cards, neon accents, decorative blur or glass, hover-flip cards,
colour extraction from album art, animated GIF decoration, emoji as icons,
kickers above headings, one-sided accent bars, hard offset shadows, and nested
cards.
