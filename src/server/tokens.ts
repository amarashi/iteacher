/**
 * Design-system tokens (the "iTeacher Design System" project, light/product theme).
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
/* brand accents — native #3b5bdb realigned to brand blue */
--blue-500:#0d7af9;--blue-600:#0a5fc4;--blue-soft:#e4efff;--cyan-500:#00ffff;
/* neutrals */
--ink-900:#1a1d21;--ink-700:#3b4149;--gray-500:#6b7280;--gray-400:#9ca3af;
--gray-300:#cbd2da;--line-200:#e5e7eb;--surface-100:#f2f4f7;--page-050:#f6f7f9;--white:#fff;
/* semantic status */
--done-500:#2f9e44;--done-soft:#e6f4ea;--progress-500:#f08c00;--progress-soft:#fff4e6;
--todo-500:#6b7280;--todo-soft:#f1f3f5;
/* semantic aliases (use these) */
--bg:var(--page-050);--surface:var(--white);--surface-sunken:var(--surface-100);
--text-strong:var(--ink-900);--text-body:var(--ink-700);--text-muted:var(--gray-500);--text-faint:var(--gray-400);
--border:var(--line-200);--ghost:var(--gray-300);
--accent:var(--blue-500);--accent-hover:var(--blue-600);--accent-soft:var(--blue-soft);--accent-contrast:#fff;
--status-done:var(--done-500);--status-done-soft:var(--done-soft);
--status-progress:var(--progress-500);--status-progress-soft:var(--progress-soft);
--status-todo:var(--todo-500);--status-todo-soft:var(--todo-soft);
--link:var(--blue-500);--link-hover:var(--blue-600);
/* radii / borders / shadows / motion */
--radius-sm:6px;--radius-md:10px;--radius-lg:14px;--radius-pill:999px;
--shadow-sm:0 1px 2px rgba(16,24,40,.06),0 1px 3px rgba(16,24,40,.1);
--shadow-md:0 4px 12px rgba(16,24,40,.08),0 2px 4px rgba(16,24,40,.06);
--shadow-glow:0 0 0 4px var(--accent-soft);
--ease-out:cubic-bezier(.2,.9,.3,1);--ease-pop:cubic-bezier(.2,.9,.3,1.3);
--dur-fast:120ms;--dur-base:220ms;--dur-slow:500ms;
/* journey-rail metrics */
--bead-size:24px;--node-min:88px;
}
`;
