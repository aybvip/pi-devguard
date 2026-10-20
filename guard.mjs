#!/usr/bin/env node
// pi-devguard — unified read-only runner.
//
//   node guard.mjs                    run the offline reading for every tool
//   node guard.mjs --live             run the LIVE reading for tools that have one
//   node guard.mjs --tool <id>        run one tool
//   node guard.mjs --scan-dir <dir>   give the scanner a directory to read
//   node guard.mjs --json             machine-readable output
//   node guard.mjs --html [file]      self-contained HTML report
//   node guard.mjs --verbose          include raw tool output
//   node guard.mjs --tools            list the tool registry
//   node guard.mjs --verdicts         the verdict vocabulary
//   node guard.mjs --sources          the sibling tools, by purpose
//   node guard.mjs --boundaries       every non-claim
//   node guard.mjs --demo             run the offline set and show a sample
//
// Read-only. Each tool is run as a subprocess, never imported.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  TOOLS,
  VERDICTS,
  EXIT_SEMANTICS,
  findTool,
  toolPresent,
  runTool,
  toolPath,
} from "./lib.mjs";
import {
  renderText,
  renderJson,
  renderHtml,
  guardExitCode,
  VERDICT_GLOSS,
  SCOPE_NOTE,
} from "./render.mjs";

const argv = process.argv.slice(2);

function flag(name) {
  return argv.includes(name);
}
function valueOf(name) {
  const i = argv.indexOf(name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
}

if (flag("--help") || flag("-h")) {
  console.log(helpText());
  process.exit(0);
}

if (flag("--tools")) {
  console.log(renderTools());
  process.exit(0);
}

if (flag("--verdicts")) {
  console.log(renderVerdicts());
  process.exit(0);
}

if (flag("--sources")) {
  console.log(renderSources());
  process.exit(0);
}

if (flag("--boundaries")) {
  console.log(renderBoundaries());
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------
const live = flag("--live") || flag("--probe");
const scanDir = valueOf("--scan-dir");
const only = valueOf("--tool");

let selected = TOOLS;
if (only) {
  const t = findTool(only);
  if (!t) {
    console.error("unknown tool: " + only);
    console.error("known: " + TOOLS.map((x) => x.id).join(", "));
    process.exit(2);
  }
  selected = [t];
}

if (flag("--demo")) {
  // demo = offline set, verbose off, text output
  runAndReport(selected, { mode: "offline" });
  process.exit(0);
}

runAndReport(selected, { mode: live ? "probe" : "offline" });

// ---------------------------------------------------------------------------
function runAndReport(tools, { mode }) {
  const runs = [];

  for (const tool of tools) {
    // A directory to scan only makes sense for the scanner, and it forces that
    // tool into its probe mode: `--rules` prints a list, it does not read the
    // directory. So providing --scan-dir selects the scanner's scan command.
    const perToolMode = scanDir && tool.id === "scanner" ? "probe" : mode;

    if (!toolPresent(tool)) {
      runs.push({
        id: tool.id,
        repo: tool.repo,
        what: tool.what,
        mode: perToolMode,
        cli: tool.cli,
        args: (perToolMode === "probe" ? tool.probe : tool.offline).args,
        exitCode: null,
        verdict: "undetermined",
        network: false,
        tookMs: 0,
        stdout: "",
        stderr: "",
        error: "tool not found at " + toolPath(tool),
      });
      continue;
    }

    const target = scanDir && tool.id === "scanner" ? resolve(scanDir) : null;
    runs.push(runTool(tool, { mode: perToolMode, target }));
  }

  const opts = {
    title: "pi-devguard" + (mode === "probe" ? " (live)" : " (offline)"),
    includeOutput: flag("--verbose"),
  };

  if (flag("--json")) {
    console.log(renderJson(runs, opts));
  } else if (flag("--html")) {
    const html = renderHtml(runs, opts);
    const outPath = valueOf("--html");
    if (outPath && outPath !== "--html" && !outPath.startsWith("--")) {
      writeFileSync(resolve(outPath), html, "utf8");
      console.log("wrote " + resolve(outPath));
      console.log(renderText(runs, opts));
    } else {
      console.log(html);
    }
  } else {
    console.log(renderText(runs, opts));
  }

  process.exit(guardExitCode(runs));
}

// ---------------------------------------------------------------------------
function helpText() {
  return [
    "pi-devguard — unified read-only runner for the sibling Pi measurement tools",
    "",
    "  node guard.mjs                    run the OFFLINE reading for every tool",
    "  node guard.mjs --live             run the LIVE reading where one exists",
    "  node guard.mjs --tool <id>        run one tool (scanner, simulator, registry,",
    "                                    integrity, chaos, proofkit)",
    "  node guard.mjs --scan-dir DIR     the directory the scanner reads",
    "  node guard.mjs --json             machine-readable output",
    "  node guard.mjs --html [FILE]      self-contained HTML report",
    "  node guard.mjs --verbose          include raw tool output",
    "  node guard.mjs --demo             the offline set, as a sample run",
    "  node guard.mjs --tools            the tool registry",
    "  node guard.mjs --verdicts         the verdict vocabulary",
    "  node guard.mjs --sources          the sibling tools, by purpose",
    "  node guard.mjs --boundaries       every non-claim",
    "  node guard.mjs --help             this help",
    "",
    "Exit codes:",
    "  0  every selected tool ran and reached a verdict",
    "     (measured OR nothing-found — a finding is a reading, not a failure)",
    "  2  at least one tool could not be run or drew no conclusion",
    "",
    "Every tool is invoked as a SUBPROCESS through its own CLI. None is imported.",
    "This runner never signs, submits, or writes to any network. It never says",
    "'safe'. A clean run is not a pass.",
  ].join("\n");
}

function renderTools() {
  const lines = [];
  lines.push("=== pi-devguard — tool registry ===");
  lines.push("");
  lines.push("  Each tool is a subprocess. The OFFLINE command is the default; the");
  lines.push("  LIVE command opens a socket and must be requested with --live.");
  lines.push("");
  for (const t of TOOLS) {
    const present = toolPresent(t);
    lines.push("  [" + t.id + "] " + t.repo + (present ? "" : "   (MISSING)"));
    lines.push("      what:     " + t.what);
    lines.push("      offline:  node " + t.cli + " " + t.offline.args.join(" ") + "   — " + t.offline.note);
    lines.push("      live:     node " + t.cli + " " + t.probe.args.join(" ") + "   — " + t.probe.note);
    lines.push("      network:  " + (t.network ? "live mode reads a public endpoint" : "never"));
    lines.push("");
  }
  return lines.join("\n");
}

function renderVerdicts() {
  const lines = [];
  lines.push("=== pi-devguard — the verdict vocabulary ===");
  lines.push("");
  lines.push("  Exactly three outcomes per tool. There is no fourth, and none of");
  lines.push("  them is 'safe'.");
  lines.push("");
  for (const v of VERDICTS) lines.push("  " + v + " — " + VERDICT_GLOSS[v]);
  lines.push("");
  lines.push("  -- how an exit code becomes a verdict (per tool) --");
  lines.push("");
  for (const [repo, map] of Object.entries(EXIT_SEMANTICS)) {
    lines.push("  " + repo);
    for (const [code, verdict] of Object.entries(map)) {
      lines.push("      exit " + code + "  ->  " + verdict);
    }
  }
  lines.push("");
  lines.push("  A non-zero exit is NOT automatically a failure. For several tools,");
  lines.push("  exit 1 means 'I found something'.");
  return lines.join("\n");
}

function renderSources() {
  const lines = [];
  lines.push("=== pi-devguard — the sibling tools, by purpose ===");
  lines.push("");
  lines.push("  All six are read-only. All six are unofficial. None is affiliated");
  lines.push("  with Pi Network. This runner adds no source of its own: every figure");
  lines.push("  in a devguard report is a tool's own output.");
  lines.push("");
  for (const t of TOOLS) {
    lines.push("  " + t.repo);
    lines.push("      " + t.what);
    lines.push("      https://github.com/aybvip/" + t.repo);
  }
  return lines.join("\n");
}

function renderBoundaries() {
  return [
    "=== pi-devguard — what this runner does NOT do ===",
    "",
    "  It does not Import tool code. Every tool is a subprocess through its CLI.",
    "  It does not Emit a verdict of its own. It repeats a tool's exit code and",
    "     labels it. The label is a reading of the tool, not of the system.",
    "  It does not Say 'safe'. There is no verdict word for it. A 'nothing-found'",
    "     is a fact about the input, never a certificate about the system.",
    "  It does not Treat a finding as a failure. Exit 1 from the scanner, the",
    "     registry, or the chaos lab is a reading, not a crash.",
    "  It does not Open a socket by default. Only --live reads a public endpoint.",
    "  It does not Write to any network. No signing, no submitting, no keys.",
    "  It does not Store, log, or transmit credentials of any kind.",
    "  It does not Judge an application's security. It runs tools that report",
    "     documented anti-patterns, drift, and failure shapes.",
    "  It does not Claim the tool set is complete. A subject not covered by one",
    "     of the six tools is simply not covered.",
    "  It does not Claim adoption, endorsement, or obligation by anyone.",
    "  It does not Replace a review. It collects six readings into one place.",
    "",
    "  See docs/BOUNDARIES.md for the long form.",
  ].join("\n");
}
