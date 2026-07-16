---
target: critique (dashboard + study + chat surfaces)
total_score: 28
p0_count: 0
p1_count: 4
timestamp: 2026-07-15T14-11-22Z
slug: src-server-dashboard-ts
---
Method: dual-agent (A: design-review · B: detector+evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | SSE live-flip + narrated thinking indicator are strong; "did my progress save?" is signalled only by a button relabel, no persistent confirmation, and the live-swap has no `aria-live`. |
| 2 | Match System / Real World | 3 | Beads/journey read naturally; undercut by "homeworks", "Mission set", and the internal slug "The Board" leaking into the tutor greeting. |
| 3 | User Control and Freedom | 2 | Mark complete is a one-way door — `paintComplete` permanently disables it; no undo / un-complete. |
| 4 | Consistency and Standards | 3 | Two top bars for the same job: `render.ts` BAR_CSS (hardcoded hex, accent-filled Complete) vs `study.ts` .stagebar (tokens, quiet sunken Complete). |
| 5 | Error Prevention | 3 | Good escaping + path validation; the irreversible Mark-complete is the gap. |
| 6 | Recognition Rather Than Recall | 3 | Rails + next-bead + hero "Next" keep context visible. Solid. |
| 7 | Flexibility and Efficiency | 3 | Enter-to-send, windowed rails, terminal fallback for power users. |
| 8 | Aesthetic and Minimalist Design | 2 | Uppercase-mono-eyebrow overload, a duplicated hero, the "01" numeral, and PROVISIONAL on every row add real noise. |
| 9 | Error Recovery | 3 | Chat "⚠ message" and the welcome path error are clear if terse. |
| 10 | Help and Documentation | 3 | Empty-state guided hand-off is excellent; `<details>` fallback + chat hints reinforce it. |
| **Total** | | **28/40** | **Good — ship-worthy after targeted fixes** |

## Anti-Patterns Verdict

**Does this look AI-generated?** Not template slop — but a fluent Linear/Notion/Stripe user extends *cautious* trust and pauses at four seams, three of which are on the project's own anti-reference list.

**LLM assessment:**
- **Uppercase-mono-eyebrow overload — the strongest tell.** Five distinct uppercase tracked labels are visible at once on the populated dashboard: `.hero .eyebrow` ("CONTINUE WHERE YOU LEFT OFF"), `.chateyebrow` ("YOUR TEACHER"), `.grouphd` ("IN PROGRESS/NOT STARTED/COMPLETED"), `.nx-lbl` ("NEXT"), `.provisional-tag` ("PROVISIONAL"), plus `.card .brand` ("WELCOME") and `.celebrate .eb`. This is exactly the banned "uppercase eyebrow on every section."
- **Identical 3-bead rails.** On day one all five cards are visually interchangeable (First steps → Next steps → Mastery, 0/1 lessons, PROVISIONAL) — the "identical card grids" ban made literal.
- **Blue-only course palette.** `COURSE_PALETTE` collapses to two cyans + two navies; adjacent courses are indistinguishable, so principle 5 ("each course gets its own color identity") is stated but not delivered.
- **The giant ghosted "01"** is borrowed hero-numeral grammar; forgivable only if it carries meaning (it currently doesn't — decorative at `--accent-soft`).

**Deterministic scan** (`detect.mjs` on the three rendered pages, all exit 2):
- `bounce-easing` (warning) — `--ease-pop:cubic-bezier(.2,.9,.3,1.3)` (tokens.ts:45). Borderline: mild overshoot, used by exactly one thing (the one-time celebration banner). Low severity, correctly scoped — not a hard false positive but not urgent.
- `layout-transition` (warning) — `.wrap{transition:margin-left …}` (dashboard.ts). Real: animates a layout property when the desktop chat docks; one 960px reflow per toggle. Swap to `transform:translateX`.
- No mono-uppercase-label false positives were emitted; the eyebrow issue is a judgment call the detector doesn't score.

**Where detector + review agree / diverge:** the review flagged cyan accents as unreadable; Assessment B *quantified* it (below) and caught a broader contrast failure the review only sampled. The detector caught the two motion issues the review didn't name. The review caught the structural/emotional issues the detector can't see (duplicate hero, course-identity failure, one-way Mark-complete).

## Contrast & A11y Evidence (computed WCAG ratios)

| Pair (fg on bg) | Ratio | Verdict (4.5 thr) | Where |
|---|---|---|---|
| `--text-muted #6b7280` on `--bg #f6f7f9` | 4.51:1 | PASS (by 0.01) | body/muted text — on the edge |
| `--text-faint #9ca3af` on `--bg #f6f7f9` | **2.37:1** | **FAIL** | PROVISIONAL tag, "Lesson N of ~M planned", tilde, group heads, roothint, "NEXT", empty-state caption |
| `--text-faint #9ca3af` on `#fff` surface | **2.54:1** | **FAIL** | same faint text on cards/hero |
| `--accent #0d7af9` on `#fff` | **4.06:1** | **FAIL** | hero eyebrow (10.5px), .card .brand, links |
| cyan `#00ddff` as text on `#fff` | **1.64:1** | **FAIL** | .eyebrow/.cdot/.ghostbtn text in themed courses |
| cyan `#00b8ff` as text on `#fff` | **2.26:1** | **FAIL** | second cyan as text |
| `#fff` on `#0097e1` primary button (auto-picked) | **3.22:1** | **FAIL** | middle palette color: YIQ=114<128 auto-selects white, but white fails on this cyan for 13.5px/600 button text |
| `#092b80` on `#00ddff` / `#00b8ff` buttons | 7.66 / 5.57 | PASS | the YIQ auto-contrast is right for the bright cyans |
| chat placeholder (UA default) on `#fff` | 4.61:1 | PASS (fragile) | `.chatform textarea` sets no `::placeholder` color — squeaks by in Chrome only |

**The single biggest a11y issue:** `--text-faint #9ca3af` (2.4–2.5:1) carries real meaningful microcopy across the whole product — the honesty system (PROVISIONAL, "~M planned") is rendered in text nobody can comfortably read.

**Structural findings:**
- **No `:focus-visible` anywhere.** The only focus rule is `.chatform textarea:focus` (chat.ts:46). `.btn`, `.navbtn`, `.complete`, `.teachbtn`, `.ghostbtn`, `.copy`, `.send`, `.chatx`, and the bead `<a>` links have no designed focus treatment — UA default only, which is itself low-contrast on the accent-filled buttons.
- **No `prefers-reduced-motion` block anywhere.** Two *infinite* animations run unguarded: the streaming caret `blink` (chat.ts:27) and the thinking `pulse` dots (chat.ts:42); plus `spin`, `pop`, and the panel/scrim transitions. The PRODUCT.md a11y bar ("reduced motion respected") is not met.
- **Tap targets all under 44×44.** Worst: `.chatx` close (~22px, may fail even the 24px AA-2.2 floor) and the `.copy` inside `.promptbox` (~16–18px). `.send` is 38×38, `.navbtn`/`.complete` ~31px tall.
- **Live-swap a11y:** `cur.innerHTML = fresh.innerHTML` on `.wrap` destroys focus (keyboard user loses their place, resets to `<body>`), and neither the repaint nor the auto-dismissing celebration banner has `aria-live`/`role=status` — invisible to assistive tech.
- **Good:** status chips are dot **+** text label (color is never the only signal); decorative imgs are correctly `alt="" aria-hidden`; iframe has `title="Lesson"`; the copied/shown empty-state prompt derive from one source so they can't drift.
- **Perf:** the Google Fonts `@import` at the top of TOKENS_CSS is render-blocking (the only external dependency); `<link rel=preload>` or self-hosting would be faster.

## Overall Impression

This is a genuinely thoughtful product with one standout idea — the **provisionality system** (dashed ghost beads, greyed `~`, windowed rails, "~N more planned" caps) delivers "never a stale number" *structurally* instead of with a disclaimer. That's real design thinking and reads as hand-built. The frame is dragged down by three self-inflicted wounds: a duplicated hero that reads as a bug, an honesty vocabulary painted in text too faint to read, and a "five blues" course palette that promises identity it can't deliver. **The single biggest opportunity:** make the first *populated* dashboard feel like momentum instead of five identical zeroed rails — that's where the core promise ("see the needle move") currently collapses into an emotional valley.

## What's Working

1. **The provisionality system.** Ghost beads, the styled-once greyed tilde, and windowed rails with `… N done` / `~N more planned` end-caps express uncertainty as design, not apology. Nothing here reads as generated.
2. **The empty-state guided hand-off** (`emptyState`, dashboard.ts:219). Copied text and shown text share one plaintext source; the power-user terminal path is tucked in `<details>`; the SSE flip auto-celebrates the first topic. The highest-stakes moment is handled with unusual care.
3. **The persistent teacher in the study view** — the left chat rail survives lesson navigation (only the iframe `src` swaps), literally embodying "a teacher in the room," and shared `CHAT_CSS` means the two chat surfaces can't drift.

## Priority Issues

- **[P1] Faint honesty text fails contrast.** `--text-faint #9ca3af` at 2.4–2.5:1 carries PROVISIONAL, "Lesson N of ~M planned", the tilde, group heads, and the empty-state caption. **Why:** the product's trust-building honesty system is rendered in text that's effectively unreadable — it fails the project's own "readable contrast" bar and Sam can't parse it. **Fix:** darken `--text-faint` toward `#6b7280`/ink (aim ≥4.5:1); nudge `--text-muted` off the 4.51 edge too. **Command:** `/impeccable colorize` (or `audit`).
- **[P1] Cyan course accents are unreadable as foreground.** `#00ddff`/`#00b8ff` are 1.6–2.3:1 as text/outline (`.ghostbtn`, `.hero .eyebrow`, `.node.next` bead, `.cdot`), and `#fff` on `#0097e1` buttons is 3.22:1. **Why:** for two of five courses the "Open next" affordance and "you-are-here" bead are invisible. **Fix:** use the already-computed darkened `courseTheme().hover` for any foreground text/outline; reserve bright accents for fills; fix the `--accent-contrast` threshold so `#0097e1` doesn't pick white. **Command:** `/impeccable colorize`.
- **[P1] Duplicate hero.** `renderDashboard` renders `hero(inProgress[0])` then renders that same topic again in the In-progress `group`, so "Learn spanish" appears twice, stacked. **Why:** burns the top of the page and reads as a bug. **Fix:** pass `inProgress.slice(1)` to the group so the hero replaces its card. **Command:** `/impeccable layout`.
- **[P1] Course identity doesn't function + identical rails.** Five blues + five identical First/Next/Mastery rails make the home screen five clones on day one. **Why:** breaks principle 5 and the emotional promise of momentum. **Fix:** spread hue across five courses within one disciplined S/L band (teal→blue→indigo→slate→violet-blue) and/or pair `.cdot` with a per-course initial/glyph; give the day-one rail a differentiated "just started" state. **Command:** `/impeccable colorize` + `/impeccable layout`.
- **[P2] Missing focus rings + no reduced-motion.** No `:focus-visible` on any button/link; no `@media (prefers-reduced-motion)` guarding the infinite blink/pulse animations. **Why:** two stated a11y bars (keyboard-reachable, reduced-motion) are unmet. **Fix:** one shared `:focus-visible` outline token on all interactive elements; wrap animations in a reduced-motion crossfade/instant fallback. **Command:** `/impeccable audit` → `harden`.
- **[P2] Uppercase-eyebrow overload + "homeworks".** Keep one eyebrow system (group heads earn it); demote the hero eyebrow to sentence case, drop the redundant "NEXT" label and the doubled "~3 planned"/"PROVISIONAL". Fix the naive `plural("homework")` (uncountable) → "exercises". **Command:** `/impeccable typeset` + `clarify`.

## Persona Red Flags

**Jordan (confused first-timer):** the empty state serves them beautifully, but the *populated* dashboard confuses — "Learn spanish" appears twice (`.hero` + first `.rail`) → "is that a bug?"; `PROVISIONAL` stamped on every row reads as "something's unfinished/wrong," not honesty; three ways to start the same lesson (`.btn` hero, `.ghostbtn` per card, clickable beads) with no canonical signal.

**Sam (a11y / keyboard / SR):** contrast fails on `--text-faint` microcopy, the cyan accents, and `#0097e1` buttons; **no custom focus ring** anywhere, so keyboard focus is lost on accent-filled buttons and after every SSE live-swap (focus resets to `<body>`, no `aria-live`); infinite blink/pulse animations have no reduced-motion opt-out. Positives: aria-hidden discipline is good, bead glyphs are real text, chips are dot+label, chat is keyboard-complete.

**Riley (edge cases):** 0 lessons and 1000 lessons are handled (railNew + windowed track). But `.rail h3` has no clamp, so a long topic title balloons the header, and `.node .cap` (max-width 84px) wraps to unequal heights, staggering the bead baseline. **Worst:** refresh mid-flow blanks the chat — the study view resumes the correct lesson but never replays prior tutor messages, and the dashboard author `sid` is in-memory JS, so refreshing during "writing your lessons…" orphans the session with no way back. For a product whose reassurance moment is "did my work survive?", a blanked chat after refresh is the scariest gap.

## Minor Observations

- Two source-of-truth top bars (render.ts hardcoded hex vs study.ts tokens) will drift; render fills Mark-complete with the accent while study renders it quiet — same action, two identities.
- Oswald is a condensed athletic/poster face — distinctive (avoids Inter-everywhere slop) but reads slightly gym/sports on "Learn spanish"; worth a deliberate gut-check.
- The `🎉` celebration is the one element flirting with the banned gamified register; restrained (single banner, 6s auto-dismiss) so probably fine, but it's the tilt point.
- Chat greeting leaks an internal slug ("Ready to help with 'The Board'") — greet with the human lesson title.
- iframe frames agent-authored HTML same-origin with no `sandbox` (report-only, by design).

## Questions to Consider

1. If every course is a shade of blue no one can name, is per-course color identity real — or would one app accent + a per-course icon/wordmark communicate identity far better at a 10px swatch?
2. The teacher is the "soul," yet on the home screen it's a slide-in behind a button. Should it have a persistent dashboard presence — a one-line "here's what I'd do next"?
3. Where honesty (five zeroed PROVISIONAL rails) and "see the needle move" collide on day one, which principle wins?
4. Is Mark-complete-as-a-one-way-door right for adult self-learners who revisit and re-practice by nature?
5. The "01" numeral and the mono eyebrows — earned structure, or borrowed SaaS-hero grammar you'd cut on someone else's page?
