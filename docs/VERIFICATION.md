# Verification — reproduce every claim yourself

No npm dependencies. Node ≥ 20. The six sibling repositories must be present as sibling
directories, each with the CLI names in `docs/SOURCES.md`.

## 1. The offline invariants

```bash
cd pi-devguard
node test/run.mjs
```

Expected: `pass: 129`, `fail: 0`, `1/1 test file(s) passed`. The suite asserts:

- the verdict vocabulary is exactly three values, with no `safe` and no gloss asserting
  safety;
- every exit code → verdict mapping, **per tool**, including the two non-obvious ones:
  scanner exit `1` → `measured` (findings), integrity exit `1` → `measured` (not every
  window provable);
- `interpretExit()` returns `undetermined` for unknown tools, `null`, `undefined`, and
  unmapped codes;
- every sibling CLI exists at its expected path (the path bug that once shipped);
- `guardExitCode()` returns `0` for `measured`/`nothing-found` and `2` for `undetermined`,
  and never `1`;
- the renderers never claim safety, load no external asset, and emit no script;
- **every offline reading is reproducible** — the test re-runs the exact command the
  aggregate printed and checks the exit code matches.

## 2. What the runner sees

```bash
node guard.mjs --tools
```

Prints the registry: each tool's id, its offline command, its live command, and whether
live mode reads a public endpoint. Check that the printed commands are the ones you would
type by hand.

## 3. The verdict vocabulary, from the source

```bash
node guard.mjs --verdicts
```

Prints the three verdicts and the full exit map. This output is generated from
`EXIT_SEMANTICS` in `lib.mjs`, so it cannot drift from the code that runs.

## 4. An offline run

```bash
node guard.mjs
```

Expected: six `◆ [MEASURED]` lines, a tally of `measured=6 nothing-found=0
undetermined=0`, and exit `0`.

## 5. The live run (reads public endpoints only)

```bash
node guard.mjs --live
```

This runs each tool's live command where it has one. It reads public endpoints; it signs
nothing, submits nothing, and writes nothing. If your machine cannot reach an endpoint, the
affected tool becomes `undetermined` and the runner exits `2` — which is correct, not a
bug.

## 6. The central property, by hand

Take any tool's command from the JSON and run it directly:

```bash
node guard.mjs --tool chaos --json
```

Read the `command` field, then run that same command in that tool's directory and compare
the exit code to `exitCode` in the JSON. They must match. The test suite does this
automatically for all six; doing it by hand once is worth the two minutes.

## 7. The scan path with findings

```bash
node guard.mjs --tool scanner --scan-dir <a directory with known anti-patterns>
```

Expected: `measured` with `exit 1`. The runner itself still exits `0` — a finding is a
reading, not a guard failure.

```bash
node guard.mjs --tool scanner --scan-dir <a clean directory>
```

Expected: `nothing-found` with `exit 0`.

## 8. The safety non-claim, checked

```bash
node guard.mjs --output-format text 2>/dev/null || node guard.mjs
node guard.mjs --json | grep -i safe
```

Every occurrence of the word "safe" in the output must be inside an explicit denial
("does not say anything is safe", "it never says … is safe"). The test suite strips those
denials and asserts no `\bis safe\b` remains.

## 9. The HTML report

```bash
node guard.mjs --html report.html
```

Open `report.html`. It must be self-contained (no external CSS, no scripts, no fonts) and
must carry the same tally and the same non-claim block.

## 10. The runner never exits 1

```bash
node guard.mjs; echo "exit=$?"
node guard.mjs --live; echo "exit=$?"
```

`$?` is `0` or `2`. It is never `1`. If it ever is, a finding has been smuggled into the
runner's exit code, which contradicts `docs/DECISIONS.md` D6.

## Claim kinds used here

- All "expected" values above are **`measured`** on Node 20/22 on Windows, and are also
  asserted in CI on Node 20.x and 22.x.
- Names and URLs of the sibling tools are **`documented`** (they are that tool's own
  identity).
- Nothing here is a claim about Pi Network, the Pi Soroban RPC's availability, or any
  application's security.
