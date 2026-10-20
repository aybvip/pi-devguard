# Sources

This runner adds **no source of its own**. Every figure in a devguard report is a sibling
tool's own output. This document lists the six tools, what each measures, and the command
this runner uses for each.

All six are **read-only**, **unofficial**, and **not affiliated with Pi Network**.

## The six tools

### 1. `pi-app-security-scanner` — id `scanner`

- **Measures:** whether text in a directory tree matches **documented** Pi SDK
  anti-patterns, each with its official quote.
- **Offline command:** `node scan-cli.mjs --rules`
- **Scan command:** `node scan-cli.mjs --scan DIR --json`
- **Network:** none, ever. Static text scan; executes nothing.
- **Its own non-claim:** *"No findings means no documented anti-pattern matched the text.
  It does NOT mean the application is secure."*
- **Repository:** https://github.com/aybvip/pi-app-security-scanner

### 2. `pi-contract-simulator` — id `simulator`

- **Measures:** how Pi Testnet contract calls behave when simulated, read-only.
- **Offline command:** `node sim.mjs --verdicts`
- **Live command:** `node sim.mjs --identity`
- **Network:** live reads a public endpoint.
- **Repository:** https://github.com/aybvip/pi-contract-simulator

### 3. `pi-api-contract-registry` — id `registry`

- **Measures:** the observed shape of the Pi Soroban RPC API, dated, and the **drift**
  between that shape and what a spec-following client expects.
- **Offline command:** `node registry-cli.mjs --registry --json`
- **Live command:** `node registry-cli.mjs --conformance --json`
- **Network:** live re-measures every check against a public endpoint (reads only).
- **Its own non-claim:** a departure is *"RECORDED, not judged: this repository calls it
  neither correct nor incorrect"*.
- **Repository:** https://github.com/aybvip/pi-api-contract-registry

### 4. `pi-event-integrity` — id `integrity`

- **Measures:** event coverage over a ledger window, with a content-addressed digest that
  can be replayed.
- **Offline command:** `node audit-cli.mjs --boundaries`
- **Window command:** `node audit-cli.mjs --dry-run --from N --to M`
- **Network:** a non-dry-run window reads a public endpoint; `--dry-run` does not.
- **Repository:** https://github.com/aybvip/pi-event-integrity

### 5. `pi-chaos-lab` — id `chaos`

- **Measures:** the failure shapes of the Pi Soroban RPC — `rejected`, `silent`,
  `accepted`, `slow`, `transport` — and records which are reproducible offline.
- **Offline command:** `node chaos-cli.mjs --facts`
- **Live command:** `node chaos-cli.mjs --probe`
- **Network:** live re-measures the shapes (invalid requests only; nothing is signed or
  submitted).
- **Its own non-claim:** a scenario *"does not claim that shape will occur in production,
  at any particular rate, or at all."* Fault frequency and rate are **`not-claimed`**.
- **Repository:** https://github.com/aybvip/pi-chaos-lab

### 6. `pi-proofkit` — id `proofkit`

- **Measures:** whether a portable proof pack verifies offline, and its digest. The pack's
  evidence is *referenced*, not hashed; the **basis** is hashed.
- **Offline command:** `node proofkit-cli.mjs --example --json`
- **Verify command:** `node proofkit-cli.mjs --verify PACK`
- **Network:** none.
- **Repository:** https://github.com/aybvip/pi-proofkit

## Claim kinds

Every statement in this repository is exactly one of:

- **`measured`** — read from a running command, reproducible here.
- **`documented`** — stated in an official source, quoted with its URL.
- **`external`** — produced by a third party, named, treated as a claim.
- **`not-claimed`** — explicitly out of scope.

## Prior art

**No prior work found** for a runner that aggregates these specific read-only Pi
measurement tools behind a single three-verdict report while forbidding a safety verdict.
This statement means exactly what it says: a search found none. It is not a claim to be
first, and no exclusivity is asserted.

## Official Pi sources

Where a sibling tool quotes an official Pi source, that quote and its URL belong to that
tool and are reproduced in that tool's own `SOURCES`/`RULES` output. This runner does not
re-host, re-quote, or re-interpret them. To see them:

```bash
node guard.mjs --tool scanner --verbose
```

That prints the scanner's own output, including its official quotes.

## Third-party mirrors

If any tool's output references a non-official mirror of Pi data, it is flagged as such
**by that tool**. This runner does not add or remove that flag; it repeats the output.
