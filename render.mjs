// pi-devguard — renderers.
//
// One reporter, three surfaces (text, JSON, HTML). The rule is the same on all
// three: never print the word "safe", always print the exit code and the
// verdict together, and always separate "measured" from "nothing-found".

import { VERDICTS } from "./lib.mjs";

export const SCOPE_NOTE =
  "This report is read-only. Every line under it comes from a sibling tool that " +
  "was run as a subprocess. The report does not add a verdict of its own: it " +
  "repeats each tool's exit code and labels it. It never says an application, a " +
  "contract, or an endpoint is safe.";

export const VERDICT_GLOSS = {
  measured:
    "the tool ran and produced a reading (including readings like drift, a moved shape, or findings)",
  "nothing-found":
    "the tool ran and matched nothing in the input it was given — this is a fact about the input, not about the world",
  undetermined:
    "the tool could not be run, or ran and drew no conclusion — nothing is asserted",
};

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------
const ICON = { measured: "◆", "nothing-found": "○", undetermined: "?" };

function summarise(run) {
  const bits = [];
  if (run.exitCode !== null && run.exitCode !== undefined) bits.push("exit " + run.exitCode);
  if (run.tookMs !== undefined) bits.push(run.tookMs + "ms");
  if (run.network) bits.push("network=yes");
  else bits.push("network=no");
  return bits.join(" · ");
}

export function renderText(runs, { title = "pi-devguard", includeOutput = false } = {}) {
  const lines = [];
  lines.push("=== " + title.toUpperCase() + " ===");
  lines.push("");
  lines.push("  " + SCOPE_NOTE);
  lines.push("");

  const counts = { measured: 0, "nothing-found": 0, undetermined: 0 };
  for (const r of runs) counts[r.verdict]++;

  for (const r of runs) {
    lines.push("  " + ICON[r.verdict] + " [" + r.verdict.toUpperCase() + "] " + r.repo);
    lines.push("      what:   " + r.what);
    lines.push("      ran:    node " + r.cli + " " + r.args.join(" ") + "   (" + r.mode + ")");
    lines.push("      result: " + summarise(r));
    if (r.error) lines.push("      error:  " + r.error);
    lines.push("");
  }

  lines.push("  -- TALLY (of what was asked) --");
  lines.push(
    "  measured=" +
      counts.measured +
      "  nothing-found=" +
      counts["nothing-found"] +
      "  undetermined=" +
      counts.undetermined
  );
  lines.push("");
  lines.push("  -- WHAT EACH VERDICT MEANS --");
  for (const v of VERDICTS) lines.push("  " + v + ": " + VERDICT_GLOSS[v]);
  lines.push("");
  lines.push("  -- WHAT THIS REPORT DOES NOT SAY --");
  lines.push("  It does not say anything is safe. A 'nothing-found' is a statement");
  lines.push("  about the input the tool was given, never about the system.");
  lines.push("  An 'undetermined' is not a pass and not a fail; it is silence.");
  lines.push("  An exit code of 1 is not a crash: for these tools it frequently");
  lines.push("  means 'I found something'. The code and the verdict are printed");
  lines.push("  together so a reader can re-derive the label.");

  if (includeOutput) {
    lines.push("");
    lines.push("  -- RAW OUTPUT (first 40 lines per tool) --");
    for (const r of runs) {
      lines.push("");
      lines.push("  ### " + r.repo + " (exit " + r.exitCode + ")");
      const out = (r.stdout || r.stderr || "").split(/\r?\n/).slice(0, 40);
      for (const l of out) lines.push("  | " + l);
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------
export function renderJson(runs, { title = "pi-devguard", includeOutput = false } = {}) {
  const counts = { measured: 0, "nothing-found": 0, undetermined: 0 };
  for (const r of runs) counts[r.verdict]++;

  return JSON.stringify(
    {
      tool: "pi-devguard",
      title,
      mode: "aggregate",
      scope: SCOPE_NOTE,
      disclaimer: [
        "A verdict here describes a tool's run, not the subject being measured.",
        "nothing-found is a fact about the input, not a statement that a system is safe.",
        "undetermined asserts nothing at all.",
        "An exit code of 1 is frequently a positive reading for these tools.",
      ],
      verdictGlossary: VERDICT_GLOSS,
      tally: counts,
      runs: runs.map((r) => {
        const base = {
          id: r.id,
          repo: r.repo,
          what: r.what,
          mode: r.mode,
          command: ["node", r.cli, ...r.args].join(" "),
          exitCode: r.exitCode,
          verdict: r.verdict,
          network: !!r.network,
          tookMs: r.tookMs,
          error: r.error,
        };
        if (includeOutput) {
          base.stdout = r.stdout;
          base.stderr = r.stderr;
        }
        return base;
      }),
    },
    null,
    2
  );
}

// ---------------------------------------------------------------------------
// HTML — self-contained, no external assets, no scripts.
// ---------------------------------------------------------------------------
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const COLOR = {
  measured: "#0b6",
  "nothing-found": "#777",
  undetermined: "#c60",
};

export function renderHtml(runs, { title = "pi-devguard" } = {}) {
  const rows = runs
    .map(
      (r) => `
      <tr>
        <td><code>${esc(r.repo)}</code></td>
        <td>${esc(r.what)}</td>
        <td><code>node ${esc(r.cli)} ${esc(r.args.join(" "))}</code></td>
        <td>${r.exitCode === null ? "—" : esc(r.exitCode)}</td>
        <td style="color:${COLOR[r.verdict]};font-weight:bold">${esc(r.verdict)}</td>
        <td>${r.network ? "yes" : "no"}</td>
      </tr>`
    )
    .join("");

  const counts = { measured: 0, "nothing-found": 0, undetermined: 0 };
  for (const r of runs) counts[r.verdict]++;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
 body{font:15px/1.5 system-ui,Segoe UI,Roboto,sans-serif;max-width:980px;margin:2rem auto;padding:0 1rem;color:#111}
 h1{font-size:1.35rem}
 table{border-collapse:collapse;width:100%;margin:1rem 0}
 th,td{border:1px solid #ddd;padding:.45rem .6rem;text-align:left;vertical-align:top}
 th{background:#f6f6f6}
 code{font:13px ui-monospace,Consolas,monospace}
 .note{background:#fff8e1;border-left:4px solid #c60;padding:.7rem 1rem;margin:1rem 0}
 .tally{margin:.5rem 0}
 footer{color:#666;font-size:13px;margin-top:2rem;border-top:1px solid #ddd;padding-top:1rem}
</style></head><body>
<h1>${esc(title)}</h1>
<div class="note">${esc(SCOPE_NOTE)}</div>
<div class="tally">measured=<b>${counts.measured}</b> ·
 nothing-found=<b>${counts["nothing-found"]}</b> ·
 undetermined=<b>${counts.undetermined}</b></div>
<table>
 <thead><tr><th>tool</th><th>what it does</th><th>command</th><th>exit</th><th>verdict</th><th>network</th></tr></thead>
 <tbody>${rows}</tbody>
</table>
<h2>What each verdict means</h2>
<ul>${VERDICTS.map((v) => `<li><b>${v}</b> — ${esc(VERDICT_GLOSS[v])}</li>`).join("")}</ul>
<h2>What this report does not say</h2>
<p>It does not say anything is safe. A <b>nothing-found</b> is a statement about
the input the tool was given, never about the system. An <b>undetermined</b> is
neither a pass nor a fail; it is silence. An exit code of <b>1</b> is not a
crash — for these tools it frequently means "I found something".</p>
<footer>Read-only · unofficial · not affiliated with Pi Network · no writes, no keys, no submission.</footer>
</body></html>`;
}

// ---------------------------------------------------------------------------
// Exit code for the guard itself.
//
// 0 = every tool ran and reached a verdict (measured OR nothing-found).
// 2 = at least one tool could not be run or drew no conclusion.
//
// Note deliberately: the guard does NOT exit 1 when a tool reports findings or
// drift. That is a reading, not a guard failure. A caller who wants "fail on
// any finding" reads the JSON, not the exit code.
// ---------------------------------------------------------------------------
export function guardExitCode(runs) {
  return runs.some((r) => r.verdict === "undetermined") ? 2 : 0;
}
