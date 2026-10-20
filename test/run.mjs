// pi-devguard — offline invariant tests.
//
// No network. No sibling tool is run for its network behaviour; the tests that
// touch siblings run their OFFLINE commands only. Everything else is a pure
// function test of the interpreter and the renderers.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

import {
  TOOLS,
  VERDICTS,
  EXIT_SEMANTICS,
  interpretExit,
  findTool,
  toolPresent,
  runTool,
  extractDigest,
  extractJson,
  SIBLING_ROOT,
} from "../lib.mjs";
import { renderText, renderJson, renderHtml, guardExitCode, VERDICT_GLOSS } from "../render.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const GUARD = join(HERE, "..", "guard.mjs");

let pass = 0;
let fail = 0;
const failures = [];

function ok(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    failures.push(msg);
  }
}
function eq(a, b, msg) {
  ok(a === b, msg + " (got " + JSON.stringify(a) + ", want " + JSON.stringify(b) + ")");
}

// ---------------------------------------------------------------------------
// 1. The verdict vocabulary
// ---------------------------------------------------------------------------
eq(VERDICTS.length, 3, "exactly three verdicts");
ok(VERDICTS.includes("measured"), "measured is a verdict");
ok(VERDICTS.includes("nothing-found"), "nothing-found is a verdict");
ok(VERDICTS.includes("undetermined"), "undetermined is a verdict");

// The word "safe" must not be a verdict, and the glossary must not promise it.
ok(!VERDICTS.map((v) => v.toLowerCase()).includes("safe"), "there is no 'safe' verdict");
for (const v of VERDICTS) {
  ok(typeof VERDICT_GLOSS[v] === "string" && VERDICT_GLOSS[v].length > 10, "gloss for " + v);
}
ok(
  !/is safe\b/i.test(VERDICT_GLOSS.measured) &&
    !/is safe\b/i.test(VERDICT_GLOSS["nothing-found"]),
  "no gloss asserts safety"
);

// ---------------------------------------------------------------------------
// 2. The exit-code interpreter — the single most important logic here
// ---------------------------------------------------------------------------
// Scanner: 0 = nothing found, 1 = findings (measured), 2 = could not scan.
eq(interpretExit("pi-app-security-scanner", 0), "nothing-found", "scanner exit 0 -> nothing-found");
eq(interpretExit("pi-app-security-scanner", 1), "measured", "scanner exit 1 -> measured");
eq(interpretExit("pi-app-security-scanner", 2), "undetermined", "scanner exit 2 -> undetermined");

// Registry / chaos / proofkit: exit 1 is a READING, not a failure.
eq(interpretExit("pi-api-contract-registry", 1), "measured", "registry exit 1 -> measured (drift)");
eq(interpretExit("pi-chaos-lab", 1), "measured", "chaos exit 1 -> measured (moved)");
eq(interpretExit("pi-proofkit", 1), "measured", "proofkit exit 1 -> measured (tampered)");
eq(interpretExit("pi-api-contract-registry", 2), "undetermined", "registry exit 2 -> undetermined");
eq(interpretExit("pi-chaos-lab", 2), "undetermined", "chaos exit 2 -> undetermined");
eq(interpretExit("pi-proofkit", 2), "undetermined", "proofkit exit 2 -> undetermined");

// Integrity: exit 1 = the audit ran but not every window was provable. That is a
// reading of incomplete coverage, NOT "nothing found".
eq(interpretExit("pi-event-integrity", 1), "measured", "integrity exit 1 -> measured (incomplete coverage)");
eq(interpretExit("pi-event-integrity", 0), "measured", "integrity exit 0 -> measured");
eq(interpretExit("pi-event-integrity", 2), "undetermined", "integrity exit 2 -> undetermined");

// Unknown tool / null code -> undetermined, never a guess.
eq(interpretExit("nope", 0), "undetermined", "unknown tool -> undetermined");
eq(interpretExit("pi-chaos-lab", null), "undetermined", "null code -> undetermined");
eq(interpretExit("pi-chaos-lab", undefined), "undetermined", "undefined code -> undetermined");
eq(interpretExit("pi-chaos-lab", 99), "undetermined", "unmapped code -> undetermined");

// The override path (scanner --rules, where exit 0 is a reading).
eq(
  interpretExit("pi-app-security-scanner", 0, { 0: "measured" }),
  "measured",
  "override forces measured for --rules"
);
eq(
  interpretExit("pi-app-security-scanner", 1, { 0: "measured" }),
  "measured",
  "override only touches the listed code"
);

// Every tool in the registry has an exit map, and every mapped value is a real verdict.
for (const t of TOOLS) {
  ok(EXIT_SEMANTICS[t.repo], "exit map exists for " + t.repo);
  for (const [code, v] of Object.entries(EXIT_SEMANTICS[t.repo])) {
    ok(VERDICTS.includes(v), t.repo + " exit " + code + " maps to a real verdict");
  }
}

// The registry is exactly the six tools this repo names.
eq(TOOLS.length, 6, "six tools in the registry");
const ids = TOOLS.map((t) => t.id).sort();
eq(ids.join(","), "chaos,integrity,proofkit,registry,scanner,simulator", "tool ids are stable");
ok(findTool("chaos") !== null, "findTool finds chaos");
eq(findTool("nope"), null, "findTool returns null for unknown");

// SIBLING_ROOT is the directory that contains the siblings, not one above it.
ok(!SIBLING_ROOT.endsWith("OneDrive"), "SIBLING_ROOT is not the OneDrive root");

// ---------------------------------------------------------------------------
// 3. Path resolution — the bug that shipped once and must not ship again
// ---------------------------------------------------------------------------
// The six siblings are separate repositories. They are present on the author's
// machine and in local development, but NOT in this repository's own CI checkout
// (CI clones this repo alone). So the sibling-dependent assertions run only when
// the siblings are actually there. When they are absent, they are reported as
// skipped — never silently passed, and never failed for an environment reason.
const SIBLINGS_PRESENT = TOOLS.every((t) => existsSync(join(SIBLING_ROOT, t.repo, t.cli)));
let skipped = 0;
if (SIBLINGS_PRESENT) {
  for (const t of TOOLS) {
    const p = join(SIBLING_ROOT, t.repo, t.cli);
    ok(existsSync(p), "sibling CLI exists: " + t.repo + "/" + t.cli);
  }
} else {
  skipped += TOOLS.length;
  console.log(
    "  note: sibling repositories not present next to this one; " +
      TOOLS.length +
      " path assertions skipped (run locally with the siblings to execute them)"
  );
}

// ---------------------------------------------------------------------------
// 4. extractDigest / extractJson
// ---------------------------------------------------------------------------
const d = "a".repeat(64);
eq(extractDigest("digest " + d + " end"), d, "extractDigest finds a 64-hex digest");
eq(extractDigest("no digest here"), null, "extractDigest returns null when absent");
eq(JSON.stringify(extractJson('{"a":1}')), JSON.stringify({ a: 1 }), "extractJson parses a bare object");
ok(extractJson("not json") === null, "extractJson returns null on non-json");
const braced = '{"a":1}\ntrailing text';
ok(extractJson(braced) && extractJson(braced).a === 1, "extractJson parses a balanced prefix");

// ---------------------------------------------------------------------------
// 5. guardExitCode — a finding is NOT a guard failure
// ---------------------------------------------------------------------------
eq(guardExitCode([{ verdict: "measured" }]), 0, "all measured -> exit 0");
eq(guardExitCode([{ verdict: "nothing-found" }]), 0, "nothing-found -> exit 0");
eq(guardExitCode([{ verdict: "measured" }, { verdict: "undetermined" }]), 2, "any undetermined -> exit 2");
eq(guardExitCode([]), 0, "empty run set -> exit 0");

// ---------------------------------------------------------------------------
// 6. Renderers — the claims they must and must not make
// ---------------------------------------------------------------------------
const sample = [
  { id: "scanner", repo: "pi-app-security-scanner", what: "scan", mode: "probe", cli: "scan-cli.mjs", args: ["--scan", ".", "--json"], exitCode: 0, verdict: "nothing-found", network: false, tookMs: 5, stdout: "", stderr: "", error: null },
  { id: "chaos", repo: "pi-chaos-lab", what: "chaos", mode: "offline", cli: "chaos-cli.mjs", args: ["--facts"], exitCode: 0, verdict: "measured", network: false, tookMs: 5, stdout: "", stderr: "", error: null },
  { id: "integrity", repo: "pi-event-integrity", what: "audit", mode: "probe", cli: "audit-cli.mjs", args: ["--dry-run"], exitCode: 1, verdict: "measured", network: false, tookMs: 5, stdout: "", stderr: "", error: null },
  { id: "registry", repo: "pi-api-contract-registry", what: "reg", mode: "probe", cli: "registry-cli.mjs", args: ["--conformance"], exitCode: null, verdict: "undetermined", network: true, tookMs: 0, stdout: "", stderr: "", error: "boom" },
];

const text = renderText(sample, {});
ok(text.includes("measured=2"), "text tally counts measured");
ok(text.includes("nothing-found=1"), "text tally counts nothing-found");
ok(text.includes("undetermined=1"), "text tally counts undetermined");
ok(text.includes("pi-app-security-scanner"), "text names the tool");
ok(text.includes("scan-cli.mjs"), "text prints the cli in the command");
// The only place "safe" may appear is inside an explicit non-claim sentence.
{
  const stripped = text
    .replace(/does not say anything is safe/gi, "")
    .replace(/never says .*? is safe/gi, "")
    .replace(/never about the system/gi, "")
    .replace(/nothing-found is a statement/gi, "");
  ok(!/\bis safe\b/i.test(stripped), "text does not claim anything is safe");
}

const json = JSON.parse(renderJson(sample, {}));
eq(json.tool, "pi-devguard", "json names the tool");
eq(json.tally.measured, 2, "json tally measured");
eq(json.runs.length, 4, "json carries every run");
// Index order is: scanner (0), chaos (1), integrity (2), registry (3).
eq(json.runs[0].verdict, "nothing-found", "json carries the scanner verdict");
eq(json.runs[0].exitCode, 0, "json pairs the scanner exit code with its verdict");
eq(json.runs[2].verdict, "measured", "json carries the integrity verdict (exit 1 is a reading)");
eq(json.runs[2].exitCode, 1, "json pairs the integrity exit code with its verdict");
ok(Array.isArray(json.disclaimer) && json.disclaimer.length >= 3, "json carries a disclaimer list");
ok(json.verdictGlossary && json.verdictGlossary.undetermined, "json carries the glossary");

// The JSON must carry the exit code together with the verdict, always.
for (const r of json.runs) {
  ok("exitCode" in r && "verdict" in r, "json run carries exitCode and verdict: " + r.id);
}

const html = renderHtml(sample, {});
ok(html.startsWith("<!doctype html>"), "html is a document");
ok(html.includes("pi-devguard"), "html names the report");
ok(html.includes("nothing-found"), "html shows the verdicts");
ok(!/<script/i.test(html), "html carries no script");
ok(!/https?:\/\/(?!github\.com)/i.test(html.replace(/github\.com\/aybvip/g, "")), "html loads no external asset");

// ---------------------------------------------------------------------------
// 7. The CLI itself — flags that must never touch the network
// ---------------------------------------------------------------------------
function cli(args, opts = {}) {
  return spawnSync(process.execPath, [GUARD, ...args], {
    cwd: join(HERE, ".."),
    encoding: "utf8",
    timeout: opts.timeout || 90000,
    windowsHide: true,
  });
}

let r = cli(["--tools"]);
eq(r.status, 0, "--tools exits 0");
ok(r.stdout.includes("pi-devguard"), "--tools prints the registry");
ok(r.stdout.includes("scan-cli.mjs"), "--tools prints the cli filename");

r = cli(["--verdicts"]);
eq(r.status, 0, "--verdicts exits 0");
ok(r.stdout.includes("measured"), "--verdicts lists measured");
// "safe" may appear only inside an explicit denial ("is not 'safe'").
{
  const stripped = r.stdout.replace(/is not 'safe'/gi, "").replace(/there is no fourth/gi, "");
  ok(!/offer[s]? 'safe'|verdict.*safe/i.test(stripped), "--verdicts does not offer 'safe'");
}

r = cli(["--boundaries"]);
eq(r.status, 0, "--boundaries exits 0");
ok(r.stdout.includes("Say 'safe'") || r.stdout.toLowerCase().includes("safe"), "--boundaries names the safety non-claim");
ok(r.stdout.includes("subprocess"), "--boundaries states the subprocess rule");

r = cli(["--sources"]);
eq(r.status, 0, "--sources exits 0");
ok(r.stdout.includes("github.com/aybvip/"), "--sources links the siblings");

r = cli(["--help"]);
eq(r.status, 0, "--help exits 0");
ok(r.stdout.includes("--live"), "--help documents --live");
ok(/SUBPROCESS|subprocess/.test(r.stdout), "--help states the subprocess rule");

r = cli(["--tool", "does-not-exist"]);
eq(r.status, 2, "unknown tool exits 2");
ok(r.stdout.includes("unknown tool") || r.stderr.includes("unknown tool"), "unknown tool is reported");

// ---------------------------------------------------------------------------
// 8. THE CENTRAL PROPERTY — every aggregated reading is reproducible
//    by running the tool's own CLI directly. Same command, same exit code.
//
//    This section needs the six siblings present. In this repository's own CI
//    (which checks out this repo alone) it is skipped, not faked.
// ---------------------------------------------------------------------------
if (!SIBLINGS_PRESENT) {
  skipped += 6; // one per tool: the "reaches a verdict" + re-derivation pair is not run
  console.log("  note: offline aggregate + re-derivation assertions skipped (siblings absent)");
} else {
r = cli(["--json"]);
eq(r.status, 0, "offline guard run exits 0 when every tool answers");
let agg = null;
try {
  agg = JSON.parse(r.stdout);
} catch (e) {
  ok(false, "offline guard emits parseable JSON: " + e.message);
}
if (agg) {
  eq(agg.runs.length, 6, "offline run covers all six tools");
  for (const run of agg.runs) {
    ok(
      run.verdict === "measured" || run.verdict === "nothing-found",
      "offline run reaches a verdict for " + run.repo + " (got " + run.verdict + ")"
    );
    // Re-derive: run the exact command devguard printed, and check the exit code.
    const tool = TOOLS.find((t) => t.repo === run.repo);
    const direct = spawnSync(process.execPath, [tool.cli, ...run.command.split(" ").slice(1)], {
      cwd: join(SIBLING_ROOT, run.repo),
      encoding: "utf8",
      timeout: 90000,
      windowsHide: true,
    });
    eq(
      direct.status,
      run.exitCode,
      "re-derivation: " + run.repo + " exit code matches the aggregate"
    );
  }
}
}

// ---------------------------------------------------------------------------
// 9. The guard never exits 1 — a finding is not a guard failure
// ---------------------------------------------------------------------------
ok(r.status !== 1, "the guard itself never exits 1");

// ---------------------------------------------------------------------------
// 10. Render to a file (--html FILE) writes readably
// ---------------------------------------------------------------------------
// The guard's own exit here is 0 with siblings present and 2 without; both are
// correct. What is asserted is that the FILE was written and is well-formed.
const tmp = mkdtempSync(join(tmpdir(), "devguard-"));
const outFile = join(tmp, "report.html");
r = cli(["--html", outFile]);
ok(r.status === 0 || r.status === 2, "--html FILE exits 0 (or 2 if a tool could not run)");
ok(existsSync(outFile), "--html FILE wrote the file");
if (existsSync(outFile)) {
  const body = readFileSync(outFile, "utf8");
  ok(body.includes("<!doctype html>"), "written html is a document");
  ok(body.includes("pi-devguard"), "written html names the report");
}

// ---------------------------------------------------------------------------
console.log("pi-devguard — invariant tests");
console.log("  pass: " + pass);
console.log("  fail: " + fail);
if (skipped) console.log("  skipped (environment): " + skipped + "  — siblings not present; not failures");
if (fail) {
  console.log("");
  for (const f of failures) console.log("  FAIL: " + f);
}
console.log("");
console.log(fail === 0 ? "1/1 test file(s) passed" : "FAILED");
process.exit(fail === 0 ? 0 : 1);
