---
name: Nocturne Editorial
colors:
  surface: '#10131c'
  surface-dim: '#10131c'
  surface-bright: '#363943'
  surface-container-lowest: '#0b0e17'
  surface-container-low: '#181b25'
  surface-container: '#1c1f29'
  surface-container-high: '#272a34'
  surface-container-highest: '#32343f'
  on-surface: '#e0e2ef'
  on-surface-variant: '#d8c3ad'
  inverse-surface: '#e0e2ef'
  inverse-on-surface: '#2d303a'
  outline: '#a08e7a'
  outline-variant: '#534434'
  surface-tint: '#ffb95f'
  primary: '#ffc174'
  on-primary: '#472a00'
  primary-container: '#f59e0b'
  on-primary-container: '#613b00'
  inverse-primary: '#855300'
  secondary: '#ffc640'
  on-secondary: '#402d00'
  secondary-container: '#e3aa00'
  on-secondary-container: '#5a4100'
  tertiary: '#d1ccc0'
  on-tertiary: '#333028'
  tertiary-container: '#b6b0a5'
  on-tertiary-container: '#46433a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffddb8'
  primary-fixed-dim: '#ffb95f'
  on-primary-fixed: '#2a1700'
  on-primary-fixed-variant: '#653e00'
  secondary-fixed: '#ffdf9f'
  secondary-fixed-dim: '#f9bd22'
  on-secondary-fixed: '#261a00'
  on-secondary-fixed-variant: '#5c4300'
  tertiary-fixed: '#e8e2d6'
  tertiary-fixed-dim: '#ccc6ba'
  on-tertiary-fixed: '#1e1b14'
  on-tertiary-fixed-variant: '#4a473e'
  background: '#10131c'
  on-background: '#e0e2ef'
  surface-variant: '#32343f'
  parchment-pure: '#f8f6f0'
  parchment-muted: '#e2ded5'
  surface-twilight: '#0f1422'
  surface-deep: '#090c15'
  border-astral: '#23293d'
  glow-amber: '#f59e0b'
typography:
  display-lg:
    fontFamily: Noto Serif
    fontSize: 56px
    fontWeight: '400'
    lineHeight: 68px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Noto Serif
    fontSize: 36px
    fontWeight: '400'
    lineHeight: 46px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Noto Serif
    fontSize: 40px
    fontWeight: '400'
    lineHeight: 52px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Noto Serif
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 38px
  headline-md:
    fontFamily: Noto Serif
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 38px
  headline-sm:
    fontFamily: Noto Serif
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 30px
  body-lg:
    fontFamily: EB Garamond
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 32px
    letterSpacing: 0.01em
  body-md:
    fontFamily: EB Garamond
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0.01em
  body-sm:
    fontFamily: EB Garamond
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Space Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.12em
  label-md:
    fontFamily: Space Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.14em
  label-sm:
    fontFamily: Space Mono
    fontSize: 9px
    fontWeight: '400'
    lineHeight: 12px
    letterSpacing: 0.18em
spacing:
  gutter: 1.5rem
  gutter-desktop: 2.5rem
  margin: 1.25rem
  margin-desktop: 4rem
  space-xs: 0.375rem
  space-sm: 0.75rem
  space-md: 1.25rem
  space-lg: 2.25rem
  space-xl: 3.5rem
---

## Brand & Style

This design system embodies a contemplative, poetic, and nocturnal editorial aesthetic. It fuses the quiet stillness of deep twilight and starlit midnight with the tactile refinement of physical literary monographs and archival dossiers. 

Targeting an audience that values deliberate pacing, quiet luxury, and philosophical resonance, the interface avoids aggressive visual noise and hyperactive feedback. Instead, it invites slow, immersive reading through expansive margins, quiet typography, and delicate ethereal accents. The stylistic foundation balances **Minimalism** with an **Editorial Monograph** atmosphere: vast midnight fields, warm ivory text layers, whisper-thin linear frames, and bracketed taxonomic identifiers such as `[ARCHIVE_01]` or `[SYSTEM_STATE]`.

## Colors

The palette is built around deep, atmospheric night tones contrasted against warm, tactile whites and glowing celestial amber accents.

- **Background & Canvas:** The default canvas is `#090c15` (deep cosmic void), with elevated surface layers utilizing `#0f1422` (midnight indigo).
- **Text & Foreground Hierarchy:** Pure white is avoided to preserve a printed, archival sensibility. Primary editorial titles and prominent narrative blocks use `#f8f6f0` (warm ivory parchment). Secondary copy, body text, and structural markings utilize `#e2ded5` and `#a39e93`.
- **Accent Glow:** `#f59e0b` and `#fbbf24` are deployed sparingly for pivotal focus states, active micro-indicators, cursor hover highlights, and luminous editorial tags.
- **Structural Lines:** Dividers, brackets, and delicate container strokes use `#23293d`, maintaining legibility without disrupting the deep tonal expanse.

## Typography

The typographical structure draws its cadence from poetic journals and museum monographs:

- **Headlines (`Noto Serif`):** Reserved for dramatic statements, section openings, and chapter markers. Its high structural dignity grounds the design in classic literary discipline.
- **Narrative Body (`EB Garamond`):** Generous line height and comfortable word pacing replicate fine book-printing conventions, ensuring effortless long-form readability against dark backgrounds.
- **Metadata, Brackets, & System Indicators (`Space Mono`):** Fixed-width typographic annotations like `[DOOR_01]`, `[ARCHIVE_REF]`, timestamps, and pagination counters inject a technical, observational precision that counters the warmth of the serifs. All labels render in uppercase with deliberate tracking.

## Layout & Spacing

The layout is built around deliberate, breathable whitespace that treats the screen as an open architectural gallery.

- **Grid Architecture:** A 12-column layout on desktop and tablet, collapsing to a single-column or 4-column framework on mobile devices. Gutters range from 24px on hand-held viewports up to 40px on widescreen displays to maintain an airy, uncrowded field.
- **Negative Space:** Content is purposefully offset, prioritizing generous vertical breaks (`space-xl` and higher) over tightly packed dashboard densities. Margins on desktop are substantial (up to `margin-desktop`), centering reader focus without edge-to-edge clutter.
- **Alignment:** Content aligns along strict asymmetric typographic axes; headline text often spans 6–8 columns while accompanying annotations sit cleanly segregated in outer structural columns.

## Elevation & Depth

Visual hierarchy does not rely on heavy drop shadows or thick skeuomorphic surfaces. Instead, depth is conveyed through **tonal stratification, subtle optical glow, and hairline boundaries**:

- **Tonal Layers:** Elevation begins at the baseline canvas (`#090c15`), elevating gently to container levels (`#0f1422` with an optional 0.6 opacity backdrop blur on floating overlays).
- **Hairline Outlines:** Containers and panel sections separate themselves using crisp, 1px low-contrast borders (`#23293d`). 
- **Amber Luminescence:** Active states, hovered objects, and focused interactive elements emit a soft, diffused amber aura rather than an opaque shadow (`0 0 24px rgba(245, 158, 11, 0.12)`). This evokes the ambient warmth of candlelight against the deep night sky.

## Shapes

The interface embraces a strict **sharp geometry (`roundedness: 0`)**. 

Cards, buttons, framed callouts, image containers, and popovers maintain crisp, unrounded 90-degree corners. This severe architectural framing reinforces the disciplined, monograph-inspired editorial aesthetic, echoing gallery display plinths, cut archival paper, and classic broadsheet layout design. The sole exceptions are strictly functional circular micro-dots (such as unread indicators or radio buttons).

## Components

### Buttons
Buttons adopt an architectural, bespoke silhouette with zero corner radius.
- **Primary:** Warm ivory surface (`#f8f6f0`) with deep midnight text (`#090c15`), framed in sharp edges. On hover, the background transitions to a warm luminous amber (`#f59e0b`) accompanied by a subtle amber glow.
- **Ghost / Editorial:** Transparent background framed by a hairline border (`1px solid #23293d`). Text is rendered in `Space Mono` uppercase tracking. Hover state shifts border color to `#f59e0b` and lightens text to `#f8f6f0`.

### Chips & Badges
Chips function as poetic tags and catalog numbers (e.g., `[INSPECTION_MODE]`, `[01/08]`). They use the label font (`Space Mono`), flat transparent backgrounds, subtle bracket syntax, and a 1px border. No pill shapes or pill rounding are permitted.

### Lists
Lists forgo standard bullet points. Instead, items are enumerated with monospace numerals (e.g., `01.`, `02.`, `03.`) or typographic dashes (`—`). Each list row is demarcated by a 1px bottom border in `#23293d`, with comfortable vertical padding (`space-md`). Hovering over a list item subtly activates an amber tint across the text.

### Inputs & Form Fields
Input fields reject enclosed solid text boxes. They are constructed as open, bottom-bordered lines (`1px solid #23293d`) resting on the dark background. Upon focus, the bottom border shifts to `#f59e0b` with a slight atmospheric backlight. Floating labels use `Space Mono` in muted parchment (`#a39e93`).

### Checkboxes & Radio Buttons
- **Checkboxes:** Crisp, square 16px frames with a 1px hairline stroke. Checked state reveals a solid `#f59e0b` inner square or a minimal geometric checkmark.
- **Radios:** 16px circular frames with an inner 6px amber dot when active, functioning as solitary starlike focal points.

### Cards & Dossier Panels
Cards are treated as illuminated sheets or archive folders. They feature the `#0f1422` surface tone, bounded by a 1px `#23293d` border. Headers feature bracketed classification labels (`[DOOR_01]`) in the top right or left corner. Hovering smoothly illuminates the border toward `#f59e0b` at 30% opacity without physical translation or bouncy motion.