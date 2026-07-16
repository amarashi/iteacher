---
target: teach/FEDERICA-FRAGAPANE-STYLE.md (lesson iframe style spec)
total_score: 13
p0_count: 2
p1_count: 2
timestamp: 2026-07-16T00-07-20Z
slug: teach-federica-fragapane-style-md
---
# Critique: teach/FEDERICA-FRAGAPANE-STYLE.md

Method: dual-agent (A: design review · B: detector + browser). Target is the spec that authors every lesson page; judged via a faithful generated sample lesson rendered alone and inside a mock of the dark iTeacher shell.

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1 | Exercise option buttons have no handler; no feedback/progress signal in a progress-driven runtime. |
| 2 | Match System / Real World | 2 | Field-notebook/star-atlas metaphor arbitrary for chess/Spanish/mortgages; motif meanings invented. |
| 3 | User Control & Freedom | 2 | details/reveal reversible, but exercises can't reset/retry; nothing stateful. |
| 4 | Consistency & Standards | 0 | External inconsistency: cream vs dark shell, 5 earth accents vs injected --course-accent, serif vs app sans. |
| 5 | Error Prevention | 1 | No validation/feedback loop; answers just revealed; sample answers not equal-length (SKILL.md:195). |
| 6 | Recognition vs Recall | 1 | 8 motifs with fixed meanings, no on-page legend = pure recall load. |
| 7 | Flexibility & Efficiency | 1 | Ignores the four injected --course-accent* vars; every course looks identical. |
| 8 | Aesthetic & Minimalist Design | 3 | Strength: 62ch measure, 1.7 line-height, hairline restraint, density budget. |
| 9 | Error Recovery | 0 | No error/empty/loading states specified. |
| 10 | Help & Documentation | 2 | "Ask your tutor" good; visual grammar never explained; font-load failure undocumented. |
| Total | | 13/40 | Poor — major overhaul for this host |

## Anti-Patterns Verdict
Not AI slop — an authentic artifact of the WRONG product. Spec bans the same slop iTeacher bans. Detector fired one rule only: em-dash-overuse (9, warning) — a cadence tell in sample copy, effectively a false positive for the spec. Detector caught nothing else because the real defects are contextual/semantic. Measured seam: dark shell #0b1220 (L~0.006) vs cream lesson #f7f3ec (L~0.899); right-margin note clipped at iframe edge.

## Priority Issues
- [P0] Default cream background (#f7f3ec) is a brand anti-reference (PRODUCT.md:58) and creates a jarring seam with the dark shell. Lesson paints its own cream, overriding the host. Fix: dark-only, bind --bg to host app bg; align to #0b1220. Command: colorize.
- [P0] Spec ignores the mandatory course-accent contract. --course-accent absent; hardcodes 5 earth hues (only teal+ochre used; rose/sage/lavender dead). Every course looks identical, none match its dashboard rail. Fix: one accent = var(--course-accent, fallback) + status colors only. Command: colorize.
- [P1] Secondary text fails AA and spec claims the opposite. Marginalia 3.80:1 @0.78rem, term underline 2.19:1, hairlines 1.80:1; spec asserts "passes AA" (line 230). Fix: marginalia to solid ink >=0.85rem; sub-0.6 alpha for strokes only. Command: audit + typeset.
- [P1] No interactive/feedback/error/empty/loading states in the design language. Buttons dead; no iteacher:exercise wiring. Fix: spec section for exercise states wired to bridge events. Command: harden.
- [P2] Phone layout overflows; responsive collapse is prose not code. 390px -> scrollWidth 543px; marginalia off-canvas (-11rem); no @media anywhere. Fix: ship responsive collapse as base CSS. Command: adapt.

## Persona Red Flags
- Jordan (first-timer): dark app -> cream notebook = "did I leave the app?"; taps exercise, nothing happens.
- Sam (a11y): key terms marked only by small-caps + decorative underline, invisible to AT (no em/strong/dfn); style-as-sole-signal forbidden by PRODUCT.md; sub-AA citation text.
- Casey (mobile): off-canvas marginalia + horizontal scroll; desktop-tuned motif budget crowds a short phone screen.

## Minor Observations
- em-dash-overuse: sample-copy artifact, house-style note not spec fix.
- --accent-lavender defined but no matching class (dead token).
- Jitter nth-of-type largely no-op (lone SVG child).
- Hard Google Fonts dependency degrades already-sub-AA marginalia offline.
- Fixed-corner stipple inside iframe rides over content on scroll.

## Questions to Consider
1. Motifs in --course-accent on dark ground — does the objection collapse to "great"?
2. Is "semantic decoration" a fiction for adults (identical comprehension, higher recall load)?
3. Field notebook vs living instrument panel as north star for an interactive runtime.
4. Warmth from the tutor, not the wallpaper.
