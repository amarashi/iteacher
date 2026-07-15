/**
 * Design-system tokens (the "iTeacher Design System" project, dark/product theme).
 *
 * One shared source for the app's own full-page surfaces — the welcome/hand-off
 * card and the journey-rail dashboard — so the accent language, type scale, radii
 * and status colors can't drift between them. Surfaces embed `TOKENS_CSS` at the
 * top of their single `<style>` block and then style themselves with the
 * `var(--…)` aliases below.
 *
 * The display face (Oswald) and mono face (JetBrains Mono) are pulled from Google
 * Fonts with full native fallbacks, so an offline learner still gets Arial Narrow /
 * the system mono stack — the app stays functional without the CDN. The lesson
 * top bar (`render.ts`) is injected into arbitrary learner HTML and intentionally
 * does NOT use this: it inlines only the handful of values it needs, with no font
 * import, to stay light and self-contained.
 */
export const TOKENS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
:root{
--font-display:'Oswald','Arial Narrow',system-ui,sans-serif;
--font-ui:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
--font-mono:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
/* ── Dark theme · blue-cyan wayfinding + gold achievement ──
   Two brand colors carry the two meaningful states: cyan/blue = active &
   navigable (momentum), gold = earned & complete (mastery). Neutrals are a
   blue-black ramp (hue ~260) so the dark canvas is the brand's own, not a
   generic charcoal. Values are OKLCH for perceptually-even steps. */
/* blue/cyan — interactive accent + course identity, brightened for dark */
--blue-500:oklch(.70 .16 250);--blue-600:oklch(.80 .13 240);
--blue-soft:oklch(.70 .16 250 / .20);--cyan-500:oklch(.85 .13 205);
/* gold — signature primary action + achievement/mastery */
--gold-500:oklch(.82 .135 84);--gold-600:oklch(.88 .12 86);
--gold-soft:oklch(.82 .135 84 / .18);--gold-ink:oklch(.24 .05 90);
/* neutrals — a blue-black ramp (dark → light), tinted toward the brand hue */
--ink-050:oklch(.165 .022 262);--ink-075:oklch(.215 .026 262);--ink-100:oklch(.265 .028 262);
--line-200:oklch(.315 .024 262);--ghost-300:oklch(.42 .026 262);
--dim-400:oklch(.60 .022 260);--dim-500:oklch(.72 .02 260);
--fg-700:oklch(.89 .012 250);--fg-900:oklch(.97 .006 250);
/* semantic status — done=gold (earned), in-progress=cyan (live), todo=muted */
--done-500:var(--gold-500);--done-soft:var(--gold-soft);
--progress-500:var(--cyan-500);--progress-soft:oklch(.85 .13 205 / .16);
--todo-500:oklch(.62 .02 260);--todo-soft:oklch(.62 .02 260 / .14);
/* semantic aliases (use these) */
--bg:var(--ink-050);--surface:var(--ink-075);--surface-sunken:var(--ink-100);
--text-strong:var(--fg-900);--text-body:var(--fg-700);--text-muted:var(--dim-500);--text-faint:var(--dim-400);
--border:var(--line-200);--ghost:var(--ghost-300);
--accent:var(--blue-500);--accent-hover:var(--blue-600);--accent-soft:var(--blue-soft);--accent-contrast:oklch(.20 .05 262);
/* gold primary action — constant across course themes (themeVars only re-tints --accent) */
--gold:var(--gold-500);--gold-hover:var(--gold-600);--gold-glow:var(--gold-soft);--gold-contrast:var(--gold-ink);
--status-done:var(--done-500);--status-done-soft:var(--done-soft);
--status-done-contrast:var(--gold-ink);
--status-progress:var(--progress-500);--status-progress-soft:var(--progress-soft);
--status-todo:var(--todo-500);--status-todo-soft:var(--todo-soft);
--link:var(--blue-500);--link-hover:var(--blue-600);
/* radii / borders / shadows / motion */
--radius-sm:6px;--radius-md:10px;--radius-lg:14px;--radius-pill:999px;
--shadow-sm:0 1px 2px rgba(0,0,0,.35),0 1px 3px rgba(0,0,0,.3);
--shadow-md:0 8px 24px rgba(0,0,0,.4),0 2px 6px rgba(0,0,0,.35);
--shadow-glow:0 0 0 4px var(--accent-soft);
--ease-out:cubic-bezier(.2,.9,.3,1);--ease-pop:cubic-bezier(.2,.9,.3,1.3);
--dur-fast:120ms;--dur-base:220ms;--dur-slow:500ms;
/* spacing scale — 4pt base, semantic steps. One shared ramp so rhythm is
   intentional (tight groupings vs. generous separation) instead of ad hoc. */
--space-3xs:4px;--space-2xs:8px;--space-xs:12px;--space-sm:16px;
--space-md:24px;--space-lg:32px;--space-xl:48px;--space-2xl:64px;
/* journey-rail metrics */
--bead-size:24px;--node-min:88px;
}
`;
