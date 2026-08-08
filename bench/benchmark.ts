// Benchmark harness for the agent-trace core.
//
// The core is what does the real work - parsing a trace and analyzing it - so this
// measures the two operations a user actually waits on: parsing a JSONL trace into
// the normalized model, and running the full analysis pass (summary, loop
// detection, latency outliers) over it. Both are reported as throughput (steps per
// second) across a range of trace sizes, so you can see how big a run the in-browser
// tool comfortably handles.
//
// Runs on Node's native TypeScript support (Node >= 22). No build step:
//   node bench/benchmark.ts
// Writes bench/results/summary.json; run bench/plot.py to render the graph.

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

import { parseNativeJsonl } from "../core/src/parseNative.ts";
import { summarize, detectLoops, latencyOutliers } from "../core/src/analyze.ts";

const here = dirname(fileURLToPath(import.meta.url));
const resultsDir = join(here, "results");
mkdirSync(resultsDir, { recursive: true });

// Build a synthetic but realistic trace: a mix of llm calls, tool calls, and the
// occasional error, with timestamps and costs, as JSONL text.
function makeTraceJsonl(steps: number): string {
  const lines: string[] = [];
  const tools = ["search", "lookup", "fetch", "write", "summarize"];
  let ts = 1_700_000_000;
  for (let i = 0; i < steps; i++) {
    ts += 0.1 + (i % 7) * 0.05;
    const kind = i % 5;
    if (kind === 0) {
      lines.push(
        JSON.stringify({
          run_id: "r",
          step: i,
          type: "llm",
          model: i % 2 ? "gpt-4o" : "gpt-4o-mini",
          input_tokens: 200 + (i % 400),
          output_tokens: 50 + (i % 120),
          cost: 0.001 + (i % 10) * 0.0003,
          latency_ms: 300 + (i % 900),
          ts,
        }),
      );
    } else if (kind === 4 && i % 50 === 4) {
      lines.push(JSON.stringify({ run_id: "r", step: i, type: "error", message: "tool timeout", ts }));
    } else {
      lines.push(
        JSON.stringify({
          run_id: "r",
          step: i,
          type: "tool",
          name: tools[i % tools.length],
          args: { q: `q-${i % 30}` },
          latency_ms: 40 + (i % 200),
          ts,
        }),
      );
    }
  }
  return lines.join("\n");
}

function timeIt(fn: () => void, reps: number): number {
  // Warm up, then take the best of a few reps to cut GC noise.
  fn();
  let best = Infinity;
  for (let r = 0; r < reps; r++) {
    const start = performance.now();
    fn();
    best = Math.min(best, performance.now() - start);
  }
  return best;
}

function main(): void {
  const sizes = [1_000, 5_000, 20_000, 50_000, 100_000];
  const parse: Record<number, number> = {};
  const analyze: Record<number, number> = {};

  for (const n of sizes) {
    const text = makeTraceJsonl(n);

    const parseMs = timeIt(() => void parseNativeJsonl(text), 5);
    parse[n] = Math.round(n / (parseMs / 1000));

    const trace = parseNativeJsonl(text);
    const analyzeMs = timeIt(() => {
      summarize(trace, 1.0);
      detectLoops(trace);
      latencyOutliers(trace);
    }, 5);
    analyze[n] = Math.round(n / (analyzeMs / 1000));
  }

  const summary = {
    sizes,
    parse_steps_per_sec: sizes.map((n) => parse[n]),
    analyze_steps_per_sec: sizes.map((n) => analyze[n]),
    note: "best-of-5 per size on Node native TS; steps/sec = trace steps / elapsed",
  };
  writeFileSync(join(resultsDir, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main();
