// pi-devguard — core library.
//
// Invokes the sibling Pi measurement tools AS SUBPROCESSES, through their CLIs.
// It never imports their code. A tool is a black box with a command line, an
// exit code, and a stdout. That is the whole contract.
//
// Read-only: this module spawns Node processes that read. It never signs,
// submits, or writes to any network.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, "..");
// The sibling repositories live one level ABOVE this repo (both under Desktop/).
// REPO_ROOT is therefore already the directory that contains them.
export const SIBLING_ROOT = REPO_ROOT;

// ---------------------------------------------------------------------------
// The verdict vocabulary. Exactly three outcomes per tool. No "safe".
// ---------------------------------------------------------------------------
//
//   measured       the tool ran, produced a reading, and the reading is
//                  reported as a value (with its exit code).
//   nothing-found  the tool ran and reported that it matched nothing in the
//                  input it was given. This is NOT a clean bill of health; it
//                  is a statement about the input, not about the world.
//   undetermined   the tool could not be run, or ran and could not conclude.
//                  Nothing is asserted about the subject.
//
// Every verdict carries the raw exit code so a reader can re-derive it.
export const VERDICTS = ["measured", "nothing-found", "undetermined"];

// ---------------------------------------------------------------------------
// exitCodeMeaning — the interpreter.
//
// A tool's non-zero exit is NOT automatically a failure. Several of these
// tools use exit 1 to mean "I found something", and exit 2 to mean "I could
// not conclude". This function is the single place where that is decided, so
// that a wrong reading is wrong in one place and easy to fix.
//
// `override` lets a specific command say what its exit 0 means when the
// default reading would be wrong. The scanner's `--rules` command, for
// example, prints a rule list: exit 0 there is a READING (measured), not
// "nothing found". Only the `--scan` command has a meaningful "nothing found".
// ---------------------------------------------------------------------------
export const EXIT_SEMANTICS = {
  "pi-app-security-scanner": {
    // 0 = no documented anti-pattern matched; 1 = findings present; 2 = could
    // not scan (bad path / unreadable tree).
    0: "nothing-found",
    1: "measured",
    2: "undetermined",
  },
  "pi-contract-simulator": {
    // 0 = the probe answered; 2 = a recorded claim is stale (still a reading).
    0: "measured",
    2: "measured",
  },
  "pi-api-contract-registry": {
    // 0 = every check matched; 1 = a check FAILED (drift, a real reading);
    // 2 = at least one check could not be evaluated.
    0: "measured",
    1: "measured",
    2: "undetermined",
  },
  "pi-event-integrity": {
    // From audit-cli.mjs: exit 0 = every window provable (coverage.allProvable);
    // exit 1 = the audit ran and produced a manifest, but NOT every window was
    // provable (including every dry run, which is never provable); exit 2 =
    // could not audit at all. So exit 1 is a READING of incomplete coverage,
    // not "nothing found".
    0: "measured",
    1: "measured",
    2: "undetermined",
  },
  "pi-chaos-lab": {
    // 0 = every probed shape matched the recording; 1 = a shape MOVED (a real
    // reading); 2 = a shape could not be probed.
    0: "measured",
    1: "measured",
    2: "undetermined",
  },
  "pi-proofkit": {
    // 0 = intact; 1 = tampered (a real reading); 2 = invalid/malformed.
    0: "measured",
    1: "measured",
    2: "undetermined",
  },
};

export function interpretExit(tool, code, override = null) {
  if (override && override[code] !== undefined) return override[code];
  const map = EXIT_SEMANTICS[tool];
  if (!map) return "undetermined";
  if (code === null || code === undefined) return "undetermined";
  return map[code] || "undetermined";
}

// ---------------------------------------------------------------------------
// The tool registry.
//
// Each entry names: the sibling directory, the CLI file inside it, the offline
// command this runner uses (the one that reproduces the tool's central reading
// WITHOUT touching the network), and whether that command needs the network.
//
// The offline commands are the default on purpose: a guard that silently opens
// sockets is not a guard you can run in CI. Live probes are opt-in per tool.
// ---------------------------------------------------------------------------
export const TOOLS = [
  {
    id: "scanner",
    repo: "pi-app-security-scanner",
    cli: "scan-cli.mjs",
    what: "Static scan for documented Pi SDK anti-patterns",
    offline: {
      args: ["--rules"],
      note: "lists the rule set with its official quotes; reads nothing else",
      // --rules always prints the list, so exit 0 is a reading, not a "nothing found".
      exitOverride: { 0: "measured" },
    },
    probe: {
      args: ["--scan", ".", "--json"],
      note: "scans a directory tree (read-only)",
      needsTarget: true,
    },
    network: false,
  },
  {
    id: "simulator",
    repo: "pi-contract-simulator",
    cli: "sim.mjs",
    what: "Simulate Pi Testnet contract calls, read-only",
    offline: {
      args: ["--verdicts"],
      note: "the verdict model for simulated failures",
    },
    probe: {
      args: ["--identity"],
      note: "live node version / protocol / ledger",
    },
    network: true,
  },
  {
    id: "registry",
    repo: "pi-api-contract-registry",
    cli: "registry-cli.mjs",
    what: "A dated record of measured API behaviour and its drift",
    offline: {
      args: ["--registry", "--json"],
      note: "the recorded registry as JSON",
    },
    probe: {
      args: ["--conformance", "--json"],
      note: "re-measures every check LIVE (reads only)",
    },
    network: true,
  },
  {
    id: "integrity",
    repo: "pi-event-integrity",
    cli: "audit-cli.mjs",
    what: "Coverage audit with a replayable integrity digest",
    offline: {
      args: ["--boundaries"],
      note: "what the audit refuses to claim",
    },
    probe: {
      args: ["--dry-run", "--from", "1", "--to", "1"],
      note: "a coverage window (live read when not --dry-run)",
    },
    network: false,
  },
  {
    id: "chaos",
    repo: "pi-chaos-lab",
    cli: "chaos-cli.mjs",
    what: "Recorded failure behaviour of the Pi Soroban RPC, replayed offline",
    offline: {
      args: ["--facts"],
      note: "the measured facts about failure behaviour",
    },
    probe: {
      args: ["--probe"],
      note: "re-measures REJECTED/SILENT/ACCEPTED shapes LIVE",
    },
    network: true,
  },
  {
    id: "proofkit",
    repo: "pi-proofkit",
    cli: "proofkit-cli.mjs",
    what: "Portable proof packs with offline verification",
    offline: {
      args: ["--example", "--json"],
      note: "builds the example pack and reports its digest",
    },
    probe: {
      args: ["--example", "--json"],
      note: "the example pack (no network)",
    },
    network: false,
  },
];

export function findTool(id) {
  return TOOLS.find((t) => t.id === id) || null;
}

export function toolPath(tool) {
  return join(SIBLING_ROOT, tool.repo, tool.cli);
}

export function toolDir(tool) {
  return join(SIBLING_ROOT, tool.repo);
}

export function toolPresent(tool) {
  return existsSync(toolPath(tool));
}

// ---------------------------------------------------------------------------
// runTool — spawn one tool's CLI and interpret the result.
//
// Never throws for a non-zero exit: a non-zero exit is data. Throws only if the
// tool file is missing, which is an environment error the caller must see.
// ---------------------------------------------------------------------------
export function runTool(tool, { mode = "offline", target = null, timeoutMs = 60000 } = {}) {
  const spec = mode === "probe" ? tool.probe : tool.offline;
  const args = spec.args.slice();

  if (spec.needsTarget && target) {
    // Insert the target directly after the flag it belongs to (e.g. --scan DIR),
    // not at the end, so the printed command is the one a reader would type.
    const i = args.indexOf("--scan");
    if (i >= 0) {
      args.splice(i + 1, 0, target);
      // If the template already had a placeholder target right after the flag
      // (e.g. "."), drop it now that we have inserted the real one.
      if (args[i + 2] === ".") args.splice(i + 2, 1);
    } else {
      args.push(target);
    }
  }

  const cwd = toolDir(tool);
  const started = Date.now();
  const res = spawnSync(process.execPath, [tool.cli, ...args], {
    cwd,
    encoding: "utf8",
    timeout: timeoutMs,
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024,
  });
  const tookMs = Date.now() - started;

  const timedOut = res.error && res.error.code === "ETIMEDOUT";
  const spawnFailed = !!res.error && !timedOut;
  const code = res.status;

  let verdict;
  if (timedOut || spawnFailed) verdict = "undetermined";
  else verdict = interpretExit(tool.repo, code, spec.exitOverride || null);

  return {
    id: tool.id,
    repo: tool.repo,
    what: tool.what,
    mode,
    cli: tool.cli,
    args,
    exitCode: code,
    verdict,
    network: tool.network && mode === "probe",
    tookMs,
    stdout: res.stdout || "",
    stderr: res.stderr || "",
    error: timedOut
      ? "timed out after " + timeoutMs + "ms"
      : spawnFailed
      ? "spawn failed: " + res.error.message
      : null,
  };
}

// ---------------------------------------------------------------------------
// extractDigest — pull a digest if one is present, without caring what tool
// produced it. Used only for the report's "evidence" line.
// ---------------------------------------------------------------------------
export function extractDigest(stdout) {
  const m = stdout.match(/\b([0-9a-f]{64})\b/i);
  return m ? m[1].toLowerCase() : null;
}

export function extractJson(stdout) {
  const s = stdout.trim();
  if (!s.startsWith("{")) return null;
  try {
    return JSON.parse(s);
  } catch {
    // The tool may print a JSON object followed by other text; try the largest
    // balanced prefix.
    let depth = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === "{") depth++;
      else if (s[i] === "}") {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(s.slice(0, i + 1));
          } catch {
            return null;
          }
        }
      }
    }
    return null;
  }
}
