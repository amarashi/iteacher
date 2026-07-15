---
name: fragapane-teaching-style
description: Visual design system for HTML teaching materials, inspired by Federica Fragapane's data-humanist illustration style. Use this skill whenever creating, styling or decorating HTML lessons, tutorials, worksheets, handouts, slides-as-HTML, course pages or documentation that should look hand-crafted rather than corporate. Trigger on any request mentioning teaching materials, lesson pages, decorated documents, doodles, marginalia, field-notebook style, or "make it not boring". Apply it even if the user only says "use our house style".
---

# Fragapane teaching style

A closed design system for HTML teaching materials. The goal: pages that feel like a naturalist's field notebook crossed with a star atlas. Warm paper (or deep ink) backgrounds, hairline hand-drawn ornament, small constellations in the margins, short marginalia. Decoration is quiet and precise, never clip-art. Every mark looks drawn with a fine pen by a patient hand.

Follow this file exactly. Do not invent new motifs, colours or fonts. Consistency comes from the closed vocabulary below.

## Core principles

1. **Closed motif vocabulary.** Only the 8 motifs defined here. Never emoji, never icon libraries, never stock illustrations.
2. **Semantic decoration.** Each motif has a fixed meaning. Decoration teaches the reader a visual grammar; it is never random garnish.
3. **Hairline discipline.** Strokes 0.75 to 1px. Fills rare, accent colours only, max 15% opacity.
4. **Deliberate imperfection.** Every motif instance gets a small jitter (rotation, scale, or path wobble). No two instances identical.
5. **Density budget.** Max 3 motifs per viewport height. One anchor motif per section. Whitespace is a feature.
6. **Ornament never overlaps text.** Motifs live in margins, gutters, corners and section breaks.

## Design tokens

Always define these in `:root` and reference them everywhere. Never hard-code colours or stroke widths elsewhere.

```css
:root {
  /* Paper theme (default) */
  --bg: #f7f3ec;
  --ink: #2b2b33;
  --line: rgba(43, 43, 51, 0.6);      /* hairlines: ink at 60% */
  --line-faint: rgba(43, 43, 51, 0.3);

  /* Accents: desaturated, semantic, sparing */
  --accent-rose: #c9a0a0;
  --accent-sage: #a3b18a;
  --accent-ochre: #c9a227;
  --accent-teal: #7a9e9f;
  --accent-lavender: #b8b8d1;

  --stroke: 0.75px;
  --stroke-heavy: 1px;                 /* the absolute maximum */

  --font-body: "Karla", "Work Sans", system-ui, sans-serif;
  --font-marginalia: "Cormorant Garamond", Georgia, serif;
  --font-label: var(--font-body);      /* small caps, letterspaced */

  --measure: 62ch;                     /* body text max width */
  --margin-col: 11rem;                 /* right margin column for notes */
}

/* Ink theme (inverted, optional) */
[data-theme="ink"] {
  --bg: #0d1b2a;
  --ink: #e9e4d8;
  --line: rgba(233, 228, 216, 0.55);
  --line-faint: rgba(233, 228, 216, 0.28);
}
```

Load fonts from Google Fonts: Karla (300, 400, 600) and Cormorant Garamond (italic 500). If offline, fall back gracefully; never substitute a geometric or heavy typeface.

## Typography rules

- Body: Karla 300/400, 1.05rem, line-height 1.7, colour `var(--ink)`, max-width `var(--measure)`.
- Headings: Karla 400 (not bold), modest sizes (h1 ~1.6rem, h2 ~1.25rem, h3 ~1.05rem small caps). Hierarchy comes from spacing and ornament, not size or weight.
- Marginalia and captions: Cormorant Garamond italic, 0.78rem, colour `var(--line)`.
- Labels and key terms: Karla, small caps via `font-variant: small-caps`, `letter-spacing: 0.08em`, 0.72rem.
- Emphasis: never `<strong>` heavy bolding. Key terms get a curved dotted SVG underline in an accent colour (see motif semantics).

## The motif vocabulary

Eight motifs, each with a fixed semantic role. Author them once as inline SVG `<symbol>` definitions and reuse with `<use>`. All use `stroke: var(--line); stroke-width: var(--stroke); fill: none;` unless noted.

| Motif | Description | Semantic role |
|---|---|---|
| `satellite-dot` | Small circle (r 3-4) with 1-2 tiny orbiting dots (r 0.8) | List item bullet |
| `ringed-node` | 2-3 concentric hairline circles, unevenly spaced radii | Definition or glossary entry |
| `tick-burst` | Circle (r 4) with 5-9 short radiating ticks at irregular angles | Key term / important concept |
| `constellation` | 3-6 dots joined by thin lines, exactly one dot filled | Linked or prerequisite concepts |
| `tendril` | Long thin cubic bezier with a single dot terminal | Pointer from margin note to body text |
| `stipple-field` | Loose scatter of 10-20 tiny dots, density fading to one side | Page-corner texture, chapter openers |
| `crescent-arc` | Partial circle, 90 to 270 degrees of sweep | Opens an exercise or activity |
| `marginal-rule` | Short horizontal hairline (5-7rem) with one dot terminal | Section divider (replaces `<hr>`) |

Copy this sprite verbatim into the top of `<body>` (it renders nothing on its own):

```html
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <symbol id="satellite-dot" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3.6"/>
      <circle cx="19.5" cy="8.5" r="0.9" fill="currentColor" stroke="none"/>
      <circle cx="6" cy="17.5" r="0.7"/>
    </symbol>
    <symbol id="ringed-node" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3.1"/>
      <circle cx="12" cy="12" r="6.4"/>
      <circle cx="12" cy="12" r="10.2"/>
    </symbol>
    <symbol id="tick-burst" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="4.5" x2="12" y2="1.5"/>
      <line x1="18.2" y1="7.5" x2="20.6" y2="5.6"/>
      <line x1="19.6" y1="13.8" x2="22.6" y2="14.4"/>
      <line x1="15.8" y1="18.6" x2="17.4" y2="21.4"/>
      <line x1="8.4" y1="18.9" x2="7.1" y2="21.8"/>
      <line x1="4.6" y1="14.6" x2="1.6" y2="15.6"/>
      <line x1="5.2" y1="8.1" x2="2.9" y2="6.2"/>
    </symbol>
    <symbol id="constellation" viewBox="0 0 48 32">
      <polyline points="4,26 14,10 27,17 38,6 44,20" fill="none"/>
      <circle cx="4" cy="26" r="1.4"/>
      <circle cx="14" cy="10" r="1.9" fill="currentColor" stroke="none"/>
      <circle cx="27" cy="17" r="1.4"/>
      <circle cx="38" cy="6" r="1.4"/>
      <circle cx="44" cy="20" r="1.4"/>
    </symbol>
    <symbol id="tendril" viewBox="0 0 64 24">
      <path d="M2 12 C 20 2, 40 22, 58 10" fill="none"/>
      <circle cx="60" cy="9.4" r="1.6" fill="currentColor" stroke="none"/>
    </symbol>
    <symbol id="stipple-field" viewBox="0 0 60 60">
      <g fill="currentColor" stroke="none">
        <circle cx="6" cy="8" r="0.9"/><circle cx="14" cy="5" r="0.7"/>
        <circle cx="10" cy="16" r="0.8"/><circle cx="20" cy="12" r="0.9"/>
        <circle cx="27" cy="7" r="0.6"/><circle cx="17" cy="23" r="0.7"/>
        <circle cx="28" cy="19" r="0.8"/><circle cx="36" cy="13" r="0.6"/>
        <circle cx="24" cy="30" r="0.7"/><circle cx="35" cy="26" r="0.6"/>
        <circle cx="43" cy="20" r="0.5"/><circle cx="33" cy="38" r="0.6"/>
        <circle cx="44" cy="33" r="0.5"/><circle cx="51" cy="27" r="0.4"/>
        <circle cx="45" cy="45" r="0.5"/><circle cx="54" cy="40" r="0.4"/>
      </g>
    </symbol>
    <symbol id="crescent-arc" viewBox="0 0 24 24">
      <path d="M 20 12 A 8 8 0 1 1 12 4" fill="none"/>
    </symbol>
    <symbol id="marginal-rule" viewBox="0 0 96 8">
      <line x1="2" y1="4" x2="88" y2="4"/>
      <circle cx="92" cy="4" r="1.6" fill="currentColor" stroke="none"/>
    </symbol>
  </defs>
</svg>
```

Base motif CSS plus the mandatory jitter (apply to every placed instance):

```css
.motif {
  stroke: var(--line);
  stroke-width: var(--stroke);
  fill: none;
  color: var(--line); /* feeds currentColor fills */
  vector-effect: non-scaling-stroke;
}
.motif--accent-rose  { stroke: var(--accent-rose);  color: var(--accent-rose); }
.motif--accent-sage  { stroke: var(--accent-sage);  color: var(--accent-sage); }
.motif--accent-ochre { stroke: var(--accent-ochre); color: var(--accent-ochre); }
.motif--accent-teal  { stroke: var(--accent-teal);  color: var(--accent-teal); }

/* No two instances at the same angle */
.motif:nth-of-type(4n)   { transform: rotate(5deg); }
.motif:nth-of-type(4n+1) { transform: rotate(-7deg) scale(0.94); }
.motif:nth-of-type(4n+2) { transform: rotate(3deg)  scale(1.05); }
.motif:nth-of-type(4n+3) { transform: rotate(-4deg); }
```

Usage: `<svg class="motif" width="18" height="18" aria-hidden="true"><use href="#tick-burst"/></svg>`

## Structural patterns

Apply these mappings whenever the corresponding HTML element or content type appears.

### Section dividers
Never a plain `<hr>`. Use a centred `marginal-rule` motif (or, for chapter-level breaks, a small `constellation`), with generous vertical space (3-4rem either side).

### Headings
Each h2 gets exactly one anchor motif floated in the left gutter, chosen by section type: `constellation` for concept sections, `crescent-arc` for exercises, `ringed-node` for definitions/reference. h3 and below get no ornament.

### Lists
Replace bullets with the `satellite-dot` motif via `li::before` (inline SVG data URI or absolutely positioned `<use>`). Numbered lists keep numerals but in marginalia style: Cormorant italic, `var(--line)` colour, hanging in the left margin.

### Key terms
Wrap in `<span class="term">`. Style: small caps plus a curved dotted underline drawn as an SVG path in `--accent-ochre` (background-image data URI is acceptable). Optionally place one small `tick-burst` in the nearest margin, pointing at the first occurrence only.

### Margin notes / asides
`<aside class="marginalia">` positioned in the right margin column (`--margin-col`). Cormorant italic, 0.78rem. Connect to the relevant paragraph with a `tendril` motif. On narrow screens, collapse into an indented block with the tendril rotated vertical.

### Callouts (tips, warnings, activities)
Thin `var(--stroke)` border, no background fill, 1.25rem padding, small-caps label in the top border gap (like a specimen label). Activities open with a `crescent-arc` in `--accent-teal`. Tips use `--accent-sage`, cautions `--accent-rose`. Colour appears only in the motif and label, never as a background wash.

### Exercises
A `crescent-arc` anchor, small-caps "Exercise n" label, and answers (if included) hidden behind a `<details>` styled with a hairline top rule, summary text in marginalia italic reading "reveal".

### Tables
Hairline rules only: a rule under the header row and under the last row, nothing vertical. Header in small caps. Row hover: background `var(--line-faint)` at very low opacity.

### Code blocks
Background transparent, hairline border, JetBrains Mono or ui-monospace at 0.85rem. No syntax-highlight themes with saturated colours; if highlighting, restrict to the five accents at full ink weight.

### Page corners
One `stipple-field` per page or major screen, alternating corners across pages/sections, at `--line-faint` intensity. This is texture, not content; keep it subtle.

### Figures and images
Hairline border, caption below in marginalia italic, prefixed by a tiny `satellite-dot`. If a figure is diagrammatic, redraw it in this system's stroke discipline rather than pasting a foreign style.

## Density and placement rules (hard limits)

- Max 3 motifs visible per viewport height, counting the anchor.
- Exactly 1 anchor motif per h2 section.
- Max 1 stipple-field per page.
- Accent colours appear at most twice per viewport; ink carries everything else.
- If in doubt, remove ornament. Sparse and precise beats busy every time.

## Hand-drawn wobble (optional enhancement)

For a stronger hand-drawn feel, run motif paths through rough.js (npm: `roughjs`) with low roughness so lines stay fine and controlled, not scribbly:

```js
import rough from "roughjs";
const rc = rough.svg(svgEl);
// roughness <= 0.6, bowing <= 0.5, keep strokeWidth at 0.75
rc.circle(12, 12, 8, { roughness: 0.5, bowing: 0.4, stroke: "var(--line)", strokeWidth: 0.75 });
```

If rough.js is unavailable, the CSS jitter transforms above are sufficient. Never increase roughness beyond 0.8; the style is a fine pen, not a crayon.

## Accessibility

- All decorative SVGs get `aria-hidden="true"` and empty alt semantics.
- Contrast: body ink on paper passes AA; never set body text in an accent colour.
- Marginalia must also exist in reading order (position visually, not with content reordering that breaks screen readers).
- Motion: no animated ornament. If any transition is added, respect `prefers-reduced-motion`.

## Anti-patterns (never do these)

- Emoji, Font Awesome, Material icons, clip-art, stock photos as decoration
- Filled shapes, drop shadows, gradients, rounded-corner cards with backgrounds
- Bold-heavy hierarchy, large hero headings, coloured heading text
- Saturated colours anywhere; anything that reads as a dashboard or SaaS landing page
- Perfect geometry: identical, unrotated, evenly spaced motifs
- Decoration behind or over body text
- Introducing a ninth motif. If a new semantic need arises, reuse the closest existing motif and note the extension for the human to approve.

## Checklist before delivering a page

1. Tokens defined once in `:root`, no hard-coded colours elsewhere
2. Sprite present, all ornament via `<use>`, all `aria-hidden`
3. Every motif instance jittered; no two identical
4. Semantic mapping respected (tick-burst = key term, constellation = linked concepts, tendril = margin pointer, crescent-arc = exercise, satellite-dot = list, ringed-node = definition, marginal-rule = divider, stipple-field = corner texture)
5. Density budget honoured; ink theme and paper theme both verified if `data-theme` is used
6. Body measure <= 62ch, marginalia column intact on wide screens, graceful collapse on narrow