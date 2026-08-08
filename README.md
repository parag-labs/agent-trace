# agent-trace

**[Try the live demo →](https://parag-labs.github.io/agent-trace/)**

A visual timeline and replay for AI agent runs. Drop in a trace of what an agent
did - its model calls, tool calls, tokens, cost, and latency - and see where the
time and the money actually went, then diff two runs side by side. Think of it as
a small DevTools window for an agent.

## Why I built this

At work I spend a lot of time looking at agents that did something I didn't expect:
one gets stuck calling the same tool over and over, another quietly burns through
its token budget on a single request, a third is slow and I can't tell which step
is the slow one. Every time, I end up scrolling through raw JSON logs, counting
tokens by hand, and trying to reconstruct the order of events in my head.

There was no small, neutral tool for this - just heavy platform dashboards or a
wall of text. So I wrote the thing I kept wishing I had: point it at a run and it
shows me the story of that run at a glance. It isn't tied to any provider or
framework; if you can emit a few lines of JSON per step (or you already emit
OpenTelemetry GenAI spans), it works. The problem is common enough that I think
it's worth solving once, for everyone.

## What it shows

- **A run timeline** - every step in order, with latency-scaled bars and a cost
  tag on each model call. Click a step to expand its prompt/response, tool
  arguments/result, or error.
- **A cost and token meter** - running totals for the whole run against a budget
  line, so an expensive run turns red instead of surprising you later.
- **Loop and latency flags** - repeated tool calls with identical arguments (the
  classic stuck-in-a-loop failure) and unusually slow steps are highlighted.
- **A run diff** - load a second run as the baseline and compare step by step:
  what was added, removed, or changed, and how cost and latency moved.

## How it's built

The logic lives in a small, framework-free TypeScript core (`core/`) - parsing,
cost/latency roll-ups, loop detection, and the diff engine are all pure functions
with their own unit tests. The React app (`ui/`) is a thin layer that renders what
the core computes. That split is deliberate: the interesting logic is testable on
its own, and the UI stays simple.

It ships as a static single-page app - no backend, no database. You load a trace
in the browser (drag a file or pick a bundled sample) and everything runs locally.

### Trace format

The native format is one JSON object per line:

```json
{"run_id":"r1","step":0,"type":"llm","model":"gpt-4o","input_tokens":420,"output_tokens":85,"cost":0.00155,"latency_ms":760,"prompt":"...","completion":"..."}
{"run_id":"r1","step":1,"type":"tool","name":"lookup","args":{"team":"platform"},"result":"...","latency_ms":140}
{"run_id":"r1","step":2,"type":"error","message":"max iterations exceeded"}
```

If your app already emits OpenTelemetry GenAI spans (`gen_ai.*`), the OTel adapter
maps them onto the same model - the same "bring the trace you already have" idea
used in [token-lens](https://github.com/parag-labs/token-lens). Three bundled
samples (a clean run, a looping run, and an over-budget run) are in `samples/`.

## Running it

```
npm ci
npm run dev      # open the app locally
npm test         # core + ui unit tests
npm run build    # production build of the demo
```

| Package | What it is | Tests |
|---------|------------|:-----:|
| `core` | pure TypeScript trace logic | 28 |
| `ui`   | React presentation layer | 10 |

Lint, typecheck, test, and build all run in CI on every pull request, and the demo
is published to GitHub Pages on merge to `main`.

## Design notes and numbers

- **[RFC.md](RFC.md)** - why the core is pure and the UI is thin, the trade-offs
  (in-browser/in-memory, heuristic loop detection, no charting dependency), and the
  non-goals (it's a viewer, not a collector or a backend).
- **[BENCHMARKS.md](BENCHMARKS.md)** - measured parse and analyze throughput on traces
  up to 100k steps (~1M steps/sec), with a graph. Reproduce with `npm run bench` then
  `python bench/plot.py`.

## Known limitations

- **In-browser only.** There's no persistence, sharing, or multi-user history yet;
  a trace lives only for as long as the tab is open.
- **The trace has to fit in memory.** This is built for a single run at a time, not
  for streaming millions of steps.
- **Loop detection is a heuristic.** It matches tool calls with identical arguments,
  so it catches the common "same call, same input" loop but not a semantic loop that
  varies its arguments each time.

Part of [parag-labs](https://github.com/parag-labs) - small, focused tools for building AI systems you can trust.
