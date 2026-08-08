import { useMemo, useState } from "react";
import type { AgentTrace } from "@agent-trace/core";
import { detectLoops, parseNativeJsonl, summarize } from "@agent-trace/core";
import { CostMeter } from "./components/CostMeter.js";
import { Timeline } from "./components/Timeline.js";
import { DiffView } from "./components/DiffView.js";
import { TraceLoader } from "./components/TraceLoader.js";
import { SAMPLES } from "./samples.js";

const DEFAULT_BUDGET = 0.05;

export function App() {
  const [trace, setTrace] = useState<AgentTrace>(() => parseNativeJsonl(SAMPLES[0].text));
  const [baseline, setBaseline] = useState<AgentTrace | null>(null);

  const summary = useMemo(() => summarize(trace, DEFAULT_BUDGET), [trace]);
  const loops = useMemo(() => detectLoops(trace), [trace]);
  const flagged = useMemo(() => new Set(loops.flatMap((l) => l.steps)), [loops]);

  return (
    <div className="app">
      <h1>agent-trace</h1>
      <p className="sub">
        Drop an agent run and see where the time, tokens, and money went - then diff two runs.
      </p>

      <div className="toolbar">
        {SAMPLES.map((s) => (
          <button
            key={s.id}
            className="btn"
            onClick={() => setTrace(parseNativeJsonl(s.text))}
            data-testid={`sample-${s.id}`}
          >
            {s.label}
          </button>
        ))}
        <TraceLoader label="load trace…" onLoad={setTrace} />
        <TraceLoader label="set baseline for diff…" onLoad={setBaseline} />
        {baseline && (
          <button className="btn" onClick={() => setBaseline(null)}>
            clear diff
          </button>
        )}
      </div>

      <CostMeter summary={summary} budget={DEFAULT_BUDGET} />

      {loops.length > 0 && (
        <p className="badge over" data-testid="loop-warning">
          possible loop: {loops[0].signature} ran {loops[0].count}x
        </p>
      )}

      {baseline ? <DiffView baseline={baseline} candidate={trace} /> : <Timeline trace={trace} flaggedSteps={flagged} />}
    </div>
  );
}
