import type { AgentTrace } from "@agent-trace/core";
import { diffTraces } from "@agent-trace/core";

interface Props {
  baseline: AgentTrace;
  candidate: AgentTrace;
}

/** Side-by-side run comparison: added/removed/changed per step, with deltas. */
export function DiffView({ baseline, candidate }: Props) {
  const diff = diffTraces(baseline, candidate);
  return (
    <div className="diff" data-testid="diff-view">
      <div className="meter">
        <div className="stat">
          <b data-testid="diff-cost-delta">{signed(diff.costDelta, (v) => `$${v.toFixed(4)}`)}</b>
          <span>cost delta</span>
        </div>
        <div className="stat">
          <b>{signed(diff.latencyDelta, (v) => `${v} ms`)}</b>
          <span>latency delta</span>
        </div>
      </div>
      <div className="timeline">
        {diff.rows.map((r) => (
          <div key={r.step} className={`row ${r.kind}`} data-testid={`diff-row-${r.kind}`}>
            <span className="mono muted">#{r.step}</span>
            <span className="type">{r.kind}</span>
            <span className="mono">{r.label}</span>
            <span className="right mono muted">{signed(r.costDelta, (v) => `$${v.toFixed(4)}`)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function signed(v: number, fmt: (n: number) => string): string {
  if (v === 0) return fmt(0);
  return (v > 0 ? "+" : "-") + fmt(Math.abs(v));
}
