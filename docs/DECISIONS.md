# Decisions

The choices behind the shape of this repository, each with its reason and its alternative.

---

## D1 — A runner, not a bigger tool

**Decision.** This repository runs the six sibling tools; it does not re-implement any of
their logic.

**Why.** Each sibling already reports honestly on its own, with its own careful
disclaimer. Re-implementing would fork six sets of measurement logic and six chances to
drift out of sync with the tools' real behaviour.

**Alternative rejected.** A single mega-tool that folds all six checks into one codebase.
Rejected because it would centralise the measurements away from the people who measured
them, and because a bug in the merged tool would silently alter six readings at once.

---

## D2 — Subprocess only, never import

**Decision.** Every sibling is invoked as `node <its-cli>.mjs <args>` in its own working
directory. No code is imported.

**Why.** The subprocess boundary is the *contract*: an exit code and a stdout. It keeps
this repository honest about what it knows — it knows what a tool **printed**, not what a
tool **does internally**. It also means each tool keeps its own version, its own tests,
and its own release pace.

**Alternative rejected.** `import`ing each tool's `lib.mjs` to call functions directly.
Rejected because imported code shares a process: an exception, a global, or a monkey-patch
in one tool could affect the runner, and the runner would then be reporting on code it had
altered.

---

## D3 — Three verdicts, and no "safe"

**Decision.** Exactly `measured`, `nothing-found`, `undetermined`. No fourth value, and in
particular no "safe".

**Why.** The dangerous failure mode of an aggregator is that six honest readings collapse
into one reassuring dashboard. The collapse is prevented structurally: the vocabulary
cannot express a safety judgement, so no code path can print one. The test suite asserts
the absence.

**Alternative rejected.** A `pass`/`fail`/`warn` vocabulary. Rejected because "pass" is
exactly the collapse — it converts *"matched nothing"* into *"nothing is wrong"*.

---

## D4 — Interpret exit codes per tool, in one place

**Decision.** A single `EXIT_SEMANTICS` map, keyed by repository, translates exit code →
verdict. Everything reads through `interpretExit()`.

**Why.** `1` means *"findings"* for the scanner, *"drift"* for the registry, *"a shape
moved"* for the chaos lab, and *"tampered"* for the proof kit. A generic *"non-zero =
failure"* rule would misread all four. Centralising the map means a wrong reading is wrong
in one place.

**Alternative rejected.** Per-tool interpretation logic scattered across the runner.
Rejected because four copies of the same decision drift apart.

---

## D5 — Offline by default; live is opt-in

**Decision.** The default command for each tool is one that reads nothing off the network.
Live reads require `--live`.

**Why.** A guard you run in CI must not open sockets without being asked. It must be
deterministic, fast, and safe to run unattended. Live readings are valuable but belong
behind an explicit flag.

**Alternative rejected.** Running the live command by default because it is "the real
measurement". Rejected: a default that depends on an external endpoint's availability
makes the runner's own exit code non-deterministic.

---

## D6 — The runner never exits 1

**Decision.** The runner exits `0` when every tool reached a verdict, and `2` when one did
not. It never exits `1`.

**Why.** Exit `1` is used *in this family* to mean *"I found something"*. If the runner
also used `1` for its own failures, the two meanings would collide at the shell. Callers
who want "fail on any finding" read the JSON, where the distinction is explicit.

**Alternative rejected.** Exit `1` when any tool reported a finding. Rejected because it
would make "the guard found drift" indistinguishable from "the guard itself broke".

---

## D7 — `nothing-found`, spelled that way

**Decision.** The verdict is the literal string `nothing-found`, not `clean`, `pass`, or
`ok`.

**Why.** The name carries the claim. `nothing-found` says precisely what happened: a
search was run and matched nothing in the given input. A reader cannot inflate it into a
statement about the world without noticing the words they are reading.

**Alternative rejected.** `clean`. Rejected because "clean" is read as "the thing is
clean", which is false.

---

## D8 — The scanner's `--rules` gets an explicit override

**Decision.** `--rules` is the scanner's offline command, with `exitOverride: { 0:
"measured" }`.

**Why.** `--rules` prints a list and exits `0`. Under the default scanner map, exit `0` is
`nothing-found` — which would mislabel a *listing* as an *absence of findings*. The
override corrects exactly that one command.

**Alternative rejected.** Dropping the scanner from the offline set. Rejected: its rule
set is a real, checkable artifact worth collecting, and the override is one line.

---

## D9 — No signed evidence, no authority

**Decision.** Reports are plain JSON, text, and HTML. Nothing is signed, and no external
authority attests to them.

**Why.** Signing would require naming an authority this project does not have and cannot
claim. An unsigned report that a reader can **re-derive by running the same commands** is
more honest than a signed one that requires trusting a key the project itself issued.

**Alternative rejected.** A `--sign` mode with a project keypair. Rejected: it would
suggest an attestation that does not exist, and would make verification depend on trusting
this project rather than on re-running the tools.

---

## D10 — `--scan-dir` forces the scanner into scan mode

**Decision.** Passing `--scan-dir DIR` makes the scanner run its `--scan DIR` command,
even when the rest of the run is in offline mode.

**Why.** A directory to scan is meaningless to `--rules`, which prints a static list. If
the flag were accepted but the command stayed `--rules`, the flag would silently do
nothing — a worse failure than an error.

**Alternative rejected.** Ignoring `--scan-dir` in offline mode. Rejected: a silently
ignored flag is a trap.

---

## D11 — No completeness claim for the tool set

**Decision.** The six tools are listed as *what is covered*, never as *everything that
matters*.

**Why.** There are Pi subjects none of the six measures — consensus-level behaviour,
economic claims, governance, and anything not exposed by the read endpoints. Calling the
set complete would be a claim this project cannot support.

**Alternative rejected.** A "coverage score". Rejected: any score implies the uncovered
remainder is known and bounded, which it is not.

---

## D12 — No adoption or obligation claim

**Decision.** Nothing here asserts that anyone will adopt, run, or be obliged to run this
runner, or that any sibling tool should change.

**Why.** Adoption and obligation are facts about other people's decisions. This project
measures; it does not decide for others. The claim kind for all of this is
**`not-claimed`**.

**Alternative rejected.** A "recommended workflows" section phrased as requirements.
Rejected: recommendations are fine, but the moment they read as obligations they become a
claim the project cannot make.
