# pi-devguard

**One read-only command that runs the sibling Pi measurement tools and reports one
verdict per tool — strictly separating *measured* from *nothing found* from *undetermined*.**

> **What this is.** A small runner. It invokes six sibling repositories **as subprocesses,
> through their own CLIs**, collects each tool's exit code, and prints a single table.
> It never imports their code, and it adds no verdict of its own beyond the reading of
> an exit code.
>
> **What this is not.** It is **not** a security certificate. A clean run is **not** a pass.
> There is no verdict word for "safe", on purpose.

---

## The one-line answer

> Every tool in this family already reports honestly on its own. This repository adds **one
> thing**: a way to run them together, in one place, without any of them losing its
> honesty — the exit code and the verdict are always printed side by side.

---

## Why a runner, and not a bigger tool

Six repositories in this family each measure one thing: a static scan, a contract
simulation, an API drift registry, an event-coverage audit, a failure-shape lab, and a
portable proof pack. Used alone, each prints its own careful disclaimer. Used together,
the danger is that the disclaimers get dropped and the six readings collapse into a
single misleading "everything looks fine".

This repository exists to **prevent that collapse**. Its whole design is an argument
against it:

| The temptation | What this runner does instead |
|---|---|
| Say "the scan passed" | Prints `exit 1` next to `measured` — a finding is a reading |
| Say "no issues found, so it's safe" | `nothing-found` is defined as *a fact about the input*, nothing more |
| Say "the tool crashed" on a red exit | Interprets the code: for these tools, `1` often means *"I found something"* |
| Bury a tool that could not run | `undetermined` is a first-class verdict, counted in the tally |
| Touch the network by default | Offline commands are the default; live reads need an explicit `--live` |

---

## Quick start

Requires **Node.js ≥ 20**. **No npm dependencies.** The six sibling repositories must be
present **as sibling directories** (this runner does not download them).

```bash
# 1. Is everything present, and what are the commands?
node guard.mjs --tools

# 2. The offline reading for every tool (no network)
node guard.mjs

# 3. The LIVE reading where a tool has one (reads public endpoints only)
node guard.mjs --live

# 4. One tool, on a directory you choose
node guard.mjs --tool scanner --scan-dir ./my-pi-app

# 5. Machine-readable, and a standalone report
node guard.mjs --json
node guard.mjs --html report.html

# 6. What it refuses to claim, and the verdict vocabulary
node guard.mjs --boundaries
node guard.mjs --verdicts

# 7. Offline invariant suite
node test/run.mjs
```

---

## The six tools it runs

| id | repository | what it measures | network |
|---|---|---|---|
| `scanner` | `pi-app-security-scanner` | documented Pi SDK anti-patterns in text | no |
| `simulator` | `pi-contract-simulator` | Pi Testnet contract calls, read-only | live only |
| `registry` | `pi-api-contract-registry` | dated API behaviour and its drift | live only |
| `integrity` | `pi-event-integrity` | event coverage with a replayable digest | live only |
| `chaos` | `pi-chaos-lab` | recorded failure shapes, replayable offline | live only |
| `proofkit` | `pi-proofkit` | portable proof packs, offline verification | no |

Each is invoked the way its own author intended: `node <its-cli>.mjs <args>`, in its own
working directory. Nothing is imported.

---

## The three verdicts, and nothing else

| Verdict | Meaning |
|---|---|
| **`measured`** | The tool ran and produced a reading. Drift, a moved shape, and findings are all readings. |
| **`nothing-found`** | The tool ran and matched nothing **in the input it was given**. A fact about the input — never about the world. |
| **`undetermined`** | The tool could not be run, or ran and drew no conclusion. Nothing is asserted. |

There is no fourth verdict. In particular, there is **no `safe`**.

---

## Reading an exit code

A non-zero exit is **not** automatically a failure here. Each tool's codes are interpreted
individually, in one place (`lib.mjs`), so a wrong reading is wrong in one place:

| tool | exit 0 | exit 1 | exit 2 |
|---|---|---|---|
| `pi-app-security-scanner` | nothing found | **findings** (measured) | could not scan |
| `pi-api-contract-registry` | every check matched | **drift** (measured) | could not evaluate |
| `pi-chaos-lab` | every shape matched | **a shape moved** (measured) | could not probe |
| `pi-proofkit` | intact | **tampered** (measured) | invalid/malformed |
| `pi-event-integrity` | every window provable | **not every window provable** (measured) | could not audit |
| `pi-contract-simulator` | the probe answered | — | a recorded claim is stale |

`node guard.mjs --verdicts` prints this table from the live source.

---

## Exit codes of the runner itself

| Code | Meaning |
|---|---|
| `0` | every selected tool ran and reached a verdict (`measured` **or** `nothing-found`) |
| `2` | at least one tool could not be run or drew no conclusion |

The runner **never exits 1**. A finding is a reading, not a guard failure. A caller who
wants "fail on any finding" reads the JSON — `runs[].exitCode` — not the exit code of the
runner.

---

## What this repository deliberately does **not** contain

- **No verdict of safety.** No word for it, no implied one.
- **No import of sibling code.** Every tool is a subprocess through its CLI.
- **No network by default.** Only `--live` reads; each live read is a public endpoint.
- **No writes of any kind.** No signing, no submitting, no ledger changes.
- **No credentials.** No tokens, keys, or API keys are read, stored, or sent.
- **No completeness claim.** A subject the six tools do not cover is simply not covered.
- **No adoption claim.** Nothing is asserted about what anyone will do.
- **No replacement for a review.** It collects six readings into one place.

---

## Documentation

- [`docs/INDEX.md`](docs/INDEX.md) — index of everything
- [`docs/VERDICTS.md`](docs/VERDICTS.md) — the three verdicts, formalised
- [`docs/EXIT-CODES.md`](docs/EXIT-CODES.md) — every code, every tool, and why
- [`docs/BOUNDARIES.md`](docs/BOUNDARIES.md) — what a clean run is not
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — the choices behind the shape
- [`docs/SOURCES.md`](docs/SOURCES.md) — the six tools, by purpose
- [`docs/VERIFICATION.md`](docs/VERIFICATION.md) — reproduce every claim yourself
- [`llms.txt`](llms.txt) — one-line answers for agent consumption

## Related repositories

The six tools this runner invokes (each read-only, each unofficial):

- [`pi-app-security-scanner`](https://github.com/aybvip/pi-app-security-scanner)
- [`pi-contract-simulator`](https://github.com/aybvip/pi-contract-simulator)
- [`pi-api-contract-registry`](https://github.com/aybvip/pi-api-contract-registry)
- [`pi-event-integrity`](https://github.com/aybvip/pi-event-integrity)
- [`pi-chaos-lab`](https://github.com/aybvip/pi-chaos-lab)
- [`pi-proofkit`](https://github.com/aybvip/pi-proofkit)

## License

MIT. See [`LICENSE`](LICENSE).

## Scope

- **Read-only, unofficial.** Not affiliated with Pi Network. Live mode reads public endpoints only.
- **A result describes a tool's run**, not the system the tool was pointed at.
- **Third-party tools are named as siblings**, not endorsed.
