---
name: fragapane-teaching-style
description: Visual design system for the HTML lessons iTeacher serves in an iframe. Fragapane-inspired hairline craft (fine-pen ornament, calm reading typography, generous whitespace) re-homed on iTeacher's dark, course-accented ground so a lesson reads as one continuous surface with the app around it. Use this skill whenever creating or styling a lesson, reference sheet, or any HTML the app will serve. Trigger on any request to author, decorate, or restyle a lesson.
---

# iTeacher lesson style

The visual system for the lessons iTeacher serves. It borrows Federica
Fragapane's discipline — fine-pen hairline ornament, quiet typography, whitespace
as a material — and speaks it in iTeacher's own voice: **dark, confident, modern,
carried by a single course accent.**

A lesson never renders alone. The app serves it in an iframe *inside a dark shell*
(a top bar, a tutor chat, the course's accent glowing on both). The prime
directive of this file: **the lesson must feel continuous with that shell, not
bolted into it.** Same dark ground, same one accent, no seam.

Follow this file exactly. Consistency comes from the closed vocabulary below —
don't invent new colours, fonts, or motifs.

## Core principles

1. **Continuous with the app.** Dark ground bound to the shell; the course accent
   is the app's, injected per lesson. A served lesson and its host are one surface.
2. **One accent, the course's.** The app assigns each course a single accent and
   injects it as `--course-accent`. That — plus neutrals and the shared status
   colours — is the *entire* lesson palette. Never introduce a competing hue.
3. **Ornament is texture, not grammar.** The motifs are quiet fine-pen marks that
   add warmth and rhythm. They carry no secret meaning the reader must decode; use
   them sparingly and never make comprehension depend on them.
4. **Hairline discipline.** Strokes 0.75–1px. Fills rare, accent only, low opacity.
5. **Deliberate imperfection.** Placed motifs get a small jitter (rotation/scale)
   so nothing looks machine-stamped. No two neighbouring instances identical.
6. **Density budget.** Max 2–3 motifs per viewport height. Whitespace is a feature.
7. **Ornament never overlaps text.** Motifs live in margins, gutters, corners,
   and section breaks — never behind or across body copy.
8. **The lesson is interactive.** These are runtime pages, not printouts. Exercises
   give immediate feedback and report progress to the app (see *Interactivity*).

## Design tokens

Define these once in `:root` (put them in the workspace's shared stylesheet) and
reference them everywhere. Never hard-code a colour or stroke width elsewhere.

```css
:root {
  /* Dark ground — bound to the app shell. The fallback only applies to a bare
     file opened outside the app; a served lesson inherits the shell's bg. */
  --bg: var(--app-bg, #0d1b2a);
  --surface: rgba(255, 255, 255, 0.04);   /* faint raised panel; use sparingly */

  /* Text — light ink on the dark ground. Both pass AA as body text. */
  --ink: #e9edf5;            /* primary body + headings   (~13:1 on --bg) */
  --ink-dim: #aeb9c9;        /* marginalia, captions, meta (~7:1, still AA)  */

  /* Hairlines — NON-TEXT strokes only. Never set text in these. */
  --line: rgba(233, 237, 245, 0.55);
  --line-faint: rgba(233, 237, 245, 0.20);

  /* THE accent — one per course, injected by the app. The fallback hex is only
     for a bare file; a served lesson always gets the course's real accent. */
  --accent:          var(--course-accent, #22c1f5);
  --accent-hover:    var(--course-accent-hover, #4dd0ff);
  --accent-soft:     var(--course-accent-soft, rgba(34, 193, 245, 0.14));
  --accent-contrast: var(--course-accent-contrast, #05121f);  /* text ON accent */

  /* Status colours — shared with the app. State only, never decoration. */
  --status-done:   #e8b53a;  /* gold  — done / mastered   */
  --status-active: #22c1f5;  /* cyan  — in progress       */

  --stroke: 1px;             /* the maximum */
  --stroke-fine: 0.75px;

  --font-body: "Karla", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-marginalia: "Cormorant Garamond", Georgia, serif;

  --measure: 66ch;           /* body text max width */
  --margin-col: 11rem;       /* right margin column for notes (wide screens) */
}
```

There is no light/paper theme. The lesson is dark because the app is dark; a warm
cream surface would tear a hole in the shell. **Warmth comes from the tutor's
voice, an occasional clay illustration, and the accent — never from the wallpaper.**

Load Karla (300, 400, 600) and Cormorant Garamond (italic 500) from Google Fonts.
These are the only two families. If they fail to load (offline, or a CSP that
blocks `fonts.gstatic.com`), the stacks above degrade to system sans / Georgia —
acceptable, but self-host the two `.woff2` files in `./assets/` when you can, so a
served lesson never depends on the network.

## Typography

Hierarchy comes from **spacing, weight, and the accent** — not from big type.

- **Body:** Karla 400, 1.05rem, line-height 1.7, `var(--ink)`, max-width `var(--measure)`.
- **Headings:** Karla 500 (never 700). Modest sizes — h1 ~1.6rem, h2 ~1.25rem,
  h3 ~1rem small-caps. Fixed rem, not fluid `clamp()`; a served lesson is viewed
  at a consistent width, and fluid headings only wobble.
- **Marginalia / captions:** Cormorant Garamond italic, **0.85rem minimum**,
  colour `var(--ink-dim)` — never a hairline colour. This is the one warm serif
  voice in the system; keep it readable.
- **Labels / key terms:** Karla, `font-variant: small-caps`, `letter-spacing:
  0.06em`, 0.75rem, colour `var(--ink)`.
- **Emphasis:** no heavy `<strong>` walls. A key term is marked *three* ways so no
  single channel is load-bearing: a semantic tag (`<dfn>` or `<em>`), small-caps,
  and a fine accent underline. Style alone must never be the only signal (a screen
  reader has to hear "this is a term" too).
- Use `text-wrap: balance` on h1–h3; `text-wrap: pretty` on long prose.

**Contrast is a hard bar, not a preference.** Any text a learner reads —
including marginalia, captions, citations, and hanging list numerals — must clear
**4.5:1** against `--bg`. The `--line` / `--line-faint` tokens are for *strokes*
(hairlines, table rules, borders); setting text in them fails AA. When in doubt,
move the colour toward `--ink`.

## The motif vocabulary

Four fine-pen motifs, kept as **quiet texture** — a little warmth and rhythm, not
a cipher. Author them once as inline SVG `<symbol>` definitions and reuse with
`<use>`. They inherit `currentColor`, so a motif drawn in `--line` reads as a
neutral hairline and one drawn in `--accent` picks up the course colour.

| Motif | Description | Typical use (texture, not a rule) |
|---|---|---|
| `satellite-dot` | Small circle with 1–2 tiny orbiting dots | List bullet |
| `marginal-rule` | Short hairline (5–7rem) with one dot terminal | Section divider (replaces `<hr>`) |
| `constellation` | 3–6 dots joined by thin lines, one dot filled | Occasional section / chapter anchor, in `--accent` |
| `stipple-field` | Loose scatter of tiny dots, fading to one side | One page-corner texture, at `--line-faint` |

Copy this sprite verbatim into the top of `<body>` (it renders nothing itself):

```html
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <symbol id="satellite-dot" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3.6"/>
      <circle cx="19.5" cy="8.5" r="0.9" fill="currentColor" stroke="none"/>
      <circle cx="6" cy="17.5" r="0.7"/>
    </symbol>
    <symbol id="marginal-rule" viewBox="0 0 96 8">
      <line x1="2" y1="4" x2="88" y2="4"/>
      <circle cx="92" cy="4" r="1.6" fill="currentColor" stroke="none"/>
    </symbol>
    <symbol id="constellation" viewBox="0 0 48 32">
      <polyline points="4,26 14,10 27,17 38,6 44,20" fill="none"/>
      <circle cx="4" cy="26" r="1.4"/>
      <circle cx="14" cy="10" r="1.9" fill="currentColor" stroke="none"/>
      <circle cx="27" cy="17" r="1.4"/>
      <circle cx="38" cy="6" r="1.4"/>
      <circle cx="44" cy="20" r="1.4"/>
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
  </defs>
</svg>
```

Base motif CSS plus jitter (apply to every placed instance). The jitter keys off
the element's own index in a small cycle so adjacent motifs never share an angle:

```css
.motif {
  stroke: var(--line);
  stroke-width: var(--stroke-fine);
  fill: none;
  color: var(--line);              /* feeds currentColor fills */
  vector-effect: non-scaling-stroke;
}
.motif--accent { stroke: var(--accent); color: var(--accent); }

/* Vary neighbouring instances. Set --i to the item's index (0,1,2,3…) when a
   motif repeats in a list; standalone anchors can leave it unset. */
.motif { --i: 0; }
.motif { transform: rotate(calc((var(--i) * 97deg) - 4deg)) ; }
.motif:nth-of-type(4n+1) { transform: rotate(-7deg) scale(0.94); }
.motif:nth-of-type(4n+2) { transform: rotate(3deg)  scale(1.05); }
.motif:nth-of-type(4n+3) { transform: rotate(-4deg); }
```

Usage: `<svg class="motif motif--accent" width="18" height="18" aria-hidden="true"><use href="#constellation"/></svg>`

## Structural patterns

### Section dividers
Never a plain `<hr>`. Use a centred `marginal-rule` in `--line`, with generous
vertical space (3–4rem either side).

### Headings
An h2 may carry **one** `constellation` in the left gutter, drawn in `--accent`,
as a quiet anchor — or nothing. h3 and below get no ornament. Hierarchy is
spacing + the accent, not decoration.

### Lists
Replace the bullet with a `satellite-dot` in `--line` via an absolutely
positioned `<use>`. Numbered lists keep numerals, set in Cormorant italic at
`--ink-dim`, hanging in the left margin.

### Key terms
Wrap in `<dfn class="term">` (or `<em class="term">` for non-definitional
emphasis). Style: small-caps + a fine accent underline (an inline SVG data-URI or
`text-decoration` in `--accent`). The semantic tag carries the meaning for
assistive tech; the styling is the visible echo, never the only signal.

### Margin notes / asides
`<aside class="marginalia">` in the right margin column on wide screens; Cormorant
italic, `--ink-dim`, ≥0.85rem. **On screens below 720px it collapses to an inline,
indented block — never a negative margin that overflows** (see *Responsive*).

### Callouts (tips, notes, activities)
Thin `var(--stroke)` border in `--line`, no heavy fill (a `--accent-soft` wash is
allowed for one emphasised callout per lesson), 1.25rem padding, a small-caps
label breaking the top border like a specimen tag. The accent appears in the label
and/or a thin left-to-right top rule — never as a saturated background block.

### Exercises
Interactive, with immediate feedback — see *Interactivity*. A small-caps
"Exercise n" label; options in the hairline button style; the reveal/explanation
in a `<details>` with a `--line-faint` top rule and a Cormorant-italic "reveal"
summary.

### Tables
Hairline rules only: a `--line` rule under the header row and under the last row,
nothing vertical. Header in small-caps. Row hover: `--surface`.

### Code blocks
Transparent background, `--line` border, JetBrains Mono / ui-monospace at 0.85rem.
No saturated syntax themes; if highlighting, restrict to `--ink`, `--ink-dim`, and
`--accent`.

### Page corners
At most **one** `stipple-field` per lesson, in `--line-faint`, in a corner.
Because a lesson lives in an iframe, pin it with `position: absolute` inside a
positioned wrapper — **not** `position: fixed` (fixed pins to the iframe viewport
and rides over content on scroll).

### Figures and illustrations
Hairline border; caption below in Cormorant italic (`--ink-dim`, ≥0.85rem). The
clay illustration library (see SKILL.md → *Illustrations*) is the sanctioned way
to add warmth — one hero or spot image where it earns its place, copied into
`./assets/` and referenced with a workspace-relative path.

## Interactivity (lessons are a runtime, not a printout)

The app injects a progress bridge into every served lesson. Author exercises to
drive it, so practice and completion are recorded and the learner sees the needle
move.

- **Every interactive control has visible states:** default, hover, focus-visible,
  selected, correct, incorrect, disabled. Draw them in the hairline system —
  `--accent` border/underline for selected, `--status-done` (gold) for correct,
  `--accent` (never pure red) plus an inline text reason for incorrect. Feedback is
  immediate and never conveyed by colour alone (add an icon or a word).
- **Report attempts.** Put each exercise in an element with a stable
  `data-exercise-id`, and dispatch a bubbling `iteacher:exercise` CustomEvent on
  attempt/pass:

  ```js
  el.dispatchEvent(new CustomEvent("iteacher:exercise", {
    bubbles: true,
    detail: { status: "passed", score: 1 }   // "attempted" | "passed"
  }));
  ```

- **Completion** is the top bar's *Mark complete* button (`window.iteacher.complete()`),
  or dispatch `iteacher:lesson` with `{ status: "completed" }` when the final
  exercise passes.
- **Progressive enhancement.** Outside the app the bridge is absent and these
  events no-op — the lesson must still read and work as a static page. Never gate
  content on the bridge.
- **Empty / unattempted / done states.** An exercise not yet attempted looks
  clearly actionable; a passed one shows a calm gold check, not a shout. Give any
  async or generated content a quiet skeleton, not a spinner.

## Responsive

A lesson is read on phones in short sessions. It must never scroll horizontally.

```css
/* Wide screens: marginalia in the right margin column. */
@media (min-width: 721px) {
  aside.marginalia {
    float: right; clear: right; width: 9rem;
    margin: 0.2rem calc(-1 * var(--margin-col)) 0.8rem 1.5rem;
  }
}
/* Narrow screens: collapse inline. NO negative margins, no overflow. */
@media (max-width: 720px) {
  aside.marginalia {
    float: none; width: auto; margin: 0.8rem 0;
    padding-left: 1rem; border-left: var(--stroke-fine) solid var(--line-faint);
  }
  :root { --margin-col: 0rem; }
}
```

Test every lesson at ~390px: body copy fits, marginalia sits inline, no motif
crowds the (short) mobile viewport, `document.scrollWidth` equals the viewport.

## Accessibility

- Decorative SVGs get `aria-hidden="true"`.
- **All text ≥ 4.5:1 on `--bg`** — body, marginalia, captions, citations. Verify.
- Meaning never rides on colour or style alone: key terms carry a semantic tag;
  exercise feedback pairs colour with an icon and a word; status is colour + icon
  + label (matching the app's done / in-progress / not-started vocabulary).
- Every interactive control is keyboard-reachable with a visible `:focus-visible`
  ring in `--accent`.
- Motion respects `prefers-reduced-motion`: reveals become instant or a crossfade;
  no animated ornament.

## Anti-patterns (never do these)

- A cream / paper / light body background. The lesson is dark, bound to the shell.
- A second accent hue. One course accent + neutrals + the shared status colours is
  the whole palette. The five-colour earth palette of earlier drafts is gone.
- Text set in `--line` / `--line-faint` (fails contrast), or marginalia below 0.85rem.
- Emoji, icon fonts, clip-art, stock photos, gradients, drop shadows, glassmorphism.
- Bold-heavy hierarchy, large hero headings, fluid `clamp()` display type.
- Motifs as a secret semantic code the reader must decode, or a legend to explain
  them; motifs are texture. If a page needs a legend, it has too much ornament.
- `position: fixed` ornament (pins to the iframe viewport).
- Negative-margin marginalia without the responsive collapse (overflows on phones).
- Static "exercises" with no feedback and no bridge events.
- Perfect geometry: identical, unrotated, evenly spaced motifs.

## Checklist before delivering a lesson

1. Tokens defined once in `:root` (shared stylesheet); no hard-coded colours.
2. `--bg` bound to `--app-bg`; **`--course-accent` is the only accent** (with the
   status colours for state); no competing hue anywhere.
3. Every text colour verified ≥ 4.5:1 on the dark ground, marginalia included.
4. Ornament is texture only, within the density budget, jittered, never over text,
   never `position: fixed`, never legend-dependent.
5. Every exercise is interactive: visible states, immediate non-colour-only
   feedback, and `iteacher:exercise` / completion events wired to the bridge.
6. Responsive verified at ~390px: no horizontal scroll, marginalia collapsed inline.
7. `prefers-reduced-motion` honoured; decorative SVGs `aria-hidden`.
8. Fonts self-hosted (or degrade gracefully); the lesson reads standalone with the
   bridge absent.
