# The three verdicts

This runner reduces every tool run to exactly one of three values. There is no fourth.

```
measured       the tool ran and produced a reading
nothing-found  the tool ran and matched nothing in the input it was given
undetermined   the tool could not be run, or ran and drew no conclusion
```

## `measured`

The tool executed and produced a reading. **A reading is not a pass.** Drift, a moved
failure shape, findings in a scan, and a tampered pack are all `measured`. The word
describes the *act of measuring*, not the *value measured*.

- `pi-api-contract-registry --conformance` finding drift → **`measured`**
- `pi-app-security-scanner --scan DIR` finding 12 anti-patterns → **`measured`**
- `pi-chaos-lab --probe` seeing a documented shape move → **`measured`**
- `pi-proofkit --verify` reporting a pack as tampered → **`measured`**

## `nothing-found`

The tool executed and reported that it matched **nothing in the input it was given**.

This is deliberately **not** called "clean", "pass", or "OK". It is a statement about the
input, and only about the input:

- `pi-app-security-scanner --scan DIR` on a directory with no matching text →
  **`nothing-found`** — meaning *no documented anti-pattern matched the text*, **not**
  "the application is secure". The tool's own words for this are quoted in `SOURCES.md`,
  and this runner does not soften them.

Only the tools that can genuinely report "matched nothing" produce this verdict today:
the scanner (on a clean directory). The integrity audit does **not** — its exit `1` means
*the audit ran but not every window was provable*, which is `measured`. See
`EXIT-CODES.md`.

## `undetermined`

The tool could not be run, or ran and drew no conclusion. Nothing is asserted about the
subject. `undetermined`:

- is **not** a pass;
- is **not** a fail;
- is **silence**, reported as a first-class verdict and counted in the tally.

Cases that produce `undetermined`:

- the sibling CLI is not present at its expected path;
- the subprocess timed out;
- the subprocess could not be spawned;
- the tool exited with a code its own map leaves unmapped;
- the tool exited with the code it uses for "I could not evaluate" (e.g. exit `2` for the
  scanner, registry, and chaos lab).

## Why `nothing-found` is not a pass

The distinction is the whole point of this repository. Two facts are different:

1. *The tool matched nothing in the bytes I gave it.* — true, checkable, narrow.
2. *Nothing is wrong with the thing those bytes came from.* — not established by either
   the tool or this runner.

A runner that collapses (1) into (2) turns six honest tools into one dishonest dashboard.
So the collapse is prevented **by construction**: there is no word in the vocabulary that
could express (2).

## The tally

Every report counts the three verdicts and prints the counts. The tally is *of what was
asked*, not of the world: it counts tool runs, not findings, and not systems.

## Where the vocabulary lives

- `lib.mjs` — `VERDICTS`, `EXIT_SEMANTICS`, `interpretExit()`
- `render.mjs` — `VERDICT_GLOSS`, and the three renderers
- `node guard.mjs --verdicts` — prints the vocabulary and the exit maps from the source
