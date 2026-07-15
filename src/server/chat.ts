/**
 * Shared teacher-chat styling.
 *
 * The chat appears in two places — the dashboard's slide-in panel (topic
 * creation) and the study view's docked left rail (tutoring the current topic).
 * The two differ only in how the panel is positioned; the inner conversation
 * (message log, bubbles, streaming caret, the "authoring…" chip, the composer)
 * looks and behaves identically. Those position-independent styles live here so
 * the two surfaces can't drift apart. Each consumer supplies its own shell CSS
 * (fixed slide-in vs. grid column) and appends this.
 */
export const CHAT_CSS = `
.chathd{display:flex;align-items:center;justify-content:space-between;padding:15px 18px;border-bottom:1px solid var(--border)}
.chateyebrow{font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--accent);font-weight:600}
.chatx{background:none;border:none;font-size:22px;line-height:1;color:var(--text-faint);cursor:pointer;padding:0 4px;text-decoration:none}
.chatlog{flex:1;overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:12px}
.msg{display:flex}.msg.me{justify-content:flex-end}
.bubble{max-width:82%;padding:10px 13px;border-radius:14px;font-size:13.5px;line-height:1.5;
white-space:pre-wrap;overflow-wrap:anywhere}
.msg.bot .bubble{background:var(--surface-sunken);color:var(--text-strong);border-bottom-left-radius:4px}
.msg.me .bubble{background:var(--accent);color:var(--accent-contrast);border-bottom-right-radius:4px}
.bubble .hint{display:block;margin-top:4px;color:var(--text-faint);font-size:12px}
.bubble.streaming .txt:after{content:"▋";margin-left:1px;color:var(--accent);animation:blink 1s steps(2) infinite}
@keyframes blink{50%{opacity:0}}
.authoring{display:flex;align-items:center;gap:8px;margin-top:9px;padding-top:9px;border-top:1px solid var(--border);
font-size:12px;color:var(--accent);font-weight:600}
.authoring.done{color:var(--status-done)}
.dots{display:inline-flex;gap:3px}
.dots i{width:5px;height:5px;border-radius:50%;background:var(--accent);animation:pulse 1s infinite}
.dots i:nth-child(2){animation-delay:.15s}.dots i:nth-child(3){animation-delay:.3s}
@keyframes pulse{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-2px)}}
.chatform{display:flex;gap:8px;padding:14px;border-top:1px solid var(--border);align-items:flex-end}
.chatform textarea{flex:1;resize:none;max-height:120px;border:1px solid var(--border);border-radius:12px;
padding:10px 12px;font-family:var(--font-ui);font-size:13.5px;line-height:1.4;color:var(--text-strong);background:var(--surface)}
.chatform textarea:focus{outline:none;border-color:var(--accent);box-shadow:var(--shadow-glow)}
.send{flex:0 0 auto;width:38px;height:38px;border-radius:50%;border:none;background:var(--accent);
color:var(--accent-contrast);font-size:18px;cursor:pointer}
.send:disabled{opacity:.45;cursor:default}
`;
