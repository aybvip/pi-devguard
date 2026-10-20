# Exit codes, and what each one becomes

A tool exiting non-zero is **not** a failure. In this family, `1` frequently means *"I
found something"*, and `2` frequently means *"I could not conclude"*. This runner reads
each tool's codes individually.

The map lives in one place — `EXIT_SEMANTICS` in `lib.mjs` — so that a wrong reading is
wrong in one place and easy to fix. `node guard.mjs --verdicts` prints it from the source.

## The map

| tool | exit 0 | exit 1 | exit 2 |
|---|---|---|---|
| `pi-app-security-scanner` | `nothing-found` | `measured` (findings) | `undetermined` |
| `pi-contract-simulator` | `measured` | — | `measured` (a recorded claim is stale) |
| `pi-api-contract-registry` | `measured` | `measured` (drift) | `undetermined` |
| `pi-event-integrity` | `measured` | `measured` (not every window provable) | `undetermined` |
| `pi-chaos-lab` | `measured` | `measured` (a shape moved) | `undetermined` |
| `pi-proofkit` | `measured` | `measured` (tampered) | `undetermined` |

Any code **not** listed for a tool — and any `null` code, any timeout, and any spawn
failure — becomes `undetermined`. There is no guessing.

## Why the scanner's exit `1` reads as `measured`

`pi-app-security-scanner --scan DIR` exits `1` when the scan **completed and matched
documented anti-patterns**. That is a successful measurement whose value happens to be
"there are findings". Reading it as a crash would be wrong in the same way as reading a
smoke detector's alarm as a broken smoke detector.

## Why the scanner's exit `0` is an override for `--rules`

The scanner's `--rules` command prints the rule list. It always exits `0`, and exit `0`
there means *"here is the list"* — a reading, not *"nothing was found"*. So that specific
command carries an explicit override in the registry:

```
offline: { args: ["--rules"], exitOverride: { 0: "measured" } }
```

Only `--scan` has a meaningful `nothing-found`. The override exists so that a listing is
never mislabelled as an absence of findings.

## Why the registry's exit `1` is not a failure

`pi-api-contract-registry --conformance` exits `1` when a check **failed** — that is, the
live endpoint's shape departed from what the recorded contract expects. That is exactly
the reading the tool exists to produce. It is `measured`.

Exit `2` there means at least one check **could not be evaluated** (for example, the
endpoint was unreachable). The tool asserts nothing about that check, so the runner
asserts nothing either: `undetermined`.

## Why the chaos lab's exit `1` is not a failure

`pi-chaos-lab --probe` exits `1` when a probed failure shape **moved** — that is, the live
behaviour no longer matches the recording. A measurement, not a crash.

## Why the proof kit's codes are three different things

`pi-proofkit --verify` uses its exit code as its verdict:

- `0` — the pack is **intact** (a reading);
- `1` — the pack is **tampered** (a reading);
- `2` — the pack is **malformed or invalid** — the tool could not conclude → `undetermined`.

## The runner's own exit code

| Code | Meaning |
|---|---|
| `0` | every selected tool ran and reached a verdict (`measured` **or** `nothing-found`) |
| `2` | at least one tool could not be run or drew no conclusion |

The runner **never exits `1`**. A finding is a reading, not a guard failure. A caller who
wants "fail the build on any finding" reads the JSON:

```bash
node guard.mjs --json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);process.exit(j.runs.some(r=>r.verdict==='measured')?1:0)})"
```

That decision belongs to the caller, and is made from the reading — not smuggled into the
runner's exit code.
