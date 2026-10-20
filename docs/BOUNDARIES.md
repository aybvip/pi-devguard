# Boundaries — what a clean run is **not**

This document exists so that silence is not read as assent. Everything below is
**`not-claimed`**.

## The central non-claim

> **A clean run is not a pass.** `nothing-found` is a statement about the input a tool was
> given, never a certificate about the system that input came from.

This runner has **no verdict word for "safe"**, and no implied one. That absence is
deliberate and is enforced by the test suite.

## What this runner does not do

| It does not… | Because… |
|---|---|
| **import sibling code** | Every tool is a subprocess through its own CLI. The contract is: a command, an exit code, stdout. |
| **emit a verdict of its own** | It repeats a tool's exit code and labels it. The label describes the *tool's run*, not the subject. |
| **say "safe"** | There is no vocabulary for it. Not a verdict, not a gloss, not an implied one. |
| **treat a finding as a failure** | Exit `1` from the scanner, registry, or chaos lab is a **reading**. |
| **open a socket by default** | Offline commands are the default. Only an explicit `--live` reads a public endpoint. |
| **write to any network** | No signing, no submission, no ledger changes. Read-only throughout. |
| **read, store, or send credentials** | No tokens, keys, or API keys are touched. |
| **claim the tool set is complete** | A subject the six tools do not cover is simply not covered. |
| **replace a review** | It collects six readings into one place. A human still has to read them. |
| **claim adoption or endorsement** | Nothing is asserted about what anyone will do with this, or about the six tools' standing. |
| **assert that any tool is obliged to be run** | Use of this runner is a choice. No obligation is claimed for anyone. |

## What each verdict does **not** mean

- **`measured`** does not mean "bad". Drift and findings are measurements; they are not
  judgements. The runner calls them neither correct nor incorrect.
- **`nothing-found`** does not mean "clean". It means *matched nothing in this input*.
- **`undetermined`** does not mean "fine, we'll assume it's OK". It means **nothing is
  asserted**. A tool that could not run produced no information.

## Scope of a report

- A report describes **a set of tool runs**, on **a particular machine**, at **a
  particular time**, against **particular inputs**.
- It is not a statement about Pi Network, about the Pi Soroban RPC's availability, about
  any application's security, or about any other user's setup.
- The `--live` readings read **public endpoints only**. A live failure here says nothing
  about the endpoint's health for anyone else; it may be local connectivity.

## Third parties

The six sibling tools are **named as siblings**, not endorsed, and not audited by this
repository. Where a tool cites an official Pi source, that citation belongs to the tool.
This runner adds no source of its own: **every figure in a devguard report is a tool's own
output.**

## What would falsify a claim here

Each claim in this repository is stated so that it can be checked:

| Claim | Falsified by |
|---|---|
| "Every tool is a subprocess; none is imported" | an `import` of any sibling path in any file |
| "There is no `safe` verdict" | a fourth entry in `VERDICTS`, or a gloss asserting safety |
| "The runner never exits 1" | `guardExitCode()` returning `1` for any input |
| "Offline is the default" | `guard.mjs` selecting a `probe` command without `--live` |
| "Exit codes are interpreted per tool" | a tool's exit `1` mapping to `undetermined` or to a failure word |

`docs/VERIFICATION.md` gives the commands that check each of these.
