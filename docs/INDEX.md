# pi-devguard — index

Every document in this repository, and what it is for.

## Start here

| Document | Read it when you want to know |
|---|---|
| [`../README.md`](../README.md) | what this runner is, in one page |
| [`VERDICTS.md`](VERDICTS.md) | what `measured`, `nothing-found`, and `undetermined` mean — exactly |
| [`EXIT-CODES.md`](EXIT-CODES.md) | how each sibling tool's exit code becomes a verdict |

## The boundaries

| Document | Read it when you want to know |
|---|---|
| [`BOUNDARIES.md`](BOUNDARIES.md) | what a clean run is **not**, and what this runner refuses to claim |
| [`DECISIONS.md`](DECISIONS.md) | why the shape is the way it is, choice by choice |
| [`VERIFICATION.md`](VERIFICATION.md) | how to reproduce every claim in this repository yourself |

## The sources

| Document | Read it when you want to know |
|---|---|
| [`SOURCES.md`](SOURCES.md) | the six sibling tools, by purpose and by what they measure |
| [`../llms.txt`](../llms.txt) | one-line answers, for agent consumption |

## The claim kinds used across every document

Every assertion in this repository is exactly one of these, and is labelled as such:

- **`measured`** — a value this project read from a running command, reproducible here.
- **`documented`** — stated in an official source, quoted with its URL.
- **`external`** — produced by a third party, named, and treated as a claim, not a fact.
- **`not-claimed`** — explicitly out of scope. Listed so that silence is not read as assent.

## The one rule

> A verdict in this repository describes **a tool's run**, never the system the tool was
> pointed at. There is no verdict word for "safe".
