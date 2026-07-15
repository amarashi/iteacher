/**
 * Internal parser for `SYLLABUS.md` — the agent-authored, provisional forecast.
 * Not part of the store's public surface; callers see only the derived model.
 *
 * Format (tolerant, human-readable markdown): an ordered or bulleted list, one
 * entry per lesson in teaching order. Each entry carries a bold **title**, an
 * optional one-line gist after an em/en dash, and a status marker:
 *
 *   1. **Variables & types** — the atoms every program is built from. [authored: 01-variables.html]
 *   2. **Control flow** — branching and looping. [planned]
 *
 * A missing marker defaults to `planned`. Anything that is not a list item
 * (headings, comments, prose) is ignored, so the file stays free-form above the seam.
 */

export interface SyllabusEntry {
  title: string;
  gist: string;
  status: "planned" | "authored";
  /** Present only when the entry has been authored into a real lesson file. */
  lesson?: string;
}

const LIST_ITEM = /^\s*(?:\d+[.)]|[-*+])\s+(.*\S)\s*$/;
const STATUS = /\[\s*(authored|planned)\s*(?::\s*([^\]]+?)\s*)?\]/i;
const BOLD = /\*\*(.+?)\*\*/;
// Title/gist separator: em dash, en dash, or a spaced double/single hyphen.
const DASH = /\s+(?:—|–|--|-)\s+/;

/** Parse `SYLLABUS.md` text into ordered entries. Returns `[]` for empty/absent input. */
export function parseSyllabus(text: string): SyllabusEntry[] {
  const entries: SyllabusEntry[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const item = LIST_ITEM.exec(rawLine);
    if (!item) continue;
    let content = item[1]!;

    // Pull out the status marker first so it never bleeds into title/gist.
    let status: SyllabusEntry["status"] = "planned";
    let lesson: string | undefined;
    const marker = STATUS.exec(content);
    if (marker) {
      status = marker[1]!.toLowerCase() as SyllabusEntry["status"];
      if (marker[2]) lesson = marker[2].trim();
      content = (content.slice(0, marker.index) + content.slice(marker.index + marker[0].length)).trim();
    }
    // A lesson file named after `authored:` implies authored even if the word was omitted.
    if (lesson) status = "authored";

    let title: string;
    let gist = "";
    const bold = BOLD.exec(content);
    if (bold) {
      title = bold[1]!.trim();
      const after = content.slice(bold.index + bold[0].length).replace(/^\s*(?:—|–|--|-|:)\s*/, "").trim();
      gist = after;
    } else {
      const parts = content.split(DASH);
      title = parts[0]!.trim();
      gist = parts.slice(1).join(" — ").trim();
    }

    if (title) entries.push({ title, gist, status, ...(lesson ? { lesson } : {}) });
  }
  return entries;
}
