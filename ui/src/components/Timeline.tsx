import { useState } from "react";
import type { AgentTrace, Step } from "@agent-trace/core";
import { latencyOutliers, stepLabel } from "@agent-trace/core";
import { StepDetail } from "./StepDetail.js";

interface Props {
  trace: AgentTrace;
  flaggedSteps?: Set<number>;
}

/** The run timeline: one row per step, latency-scaled bars, click to expand. */
export function Timeline({ trace, flaggedSteps }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  const outliers = new Set(latencyOutliers(trace));
  const flagged = flaggedSteps ?? new Set<number>();
  const maxLatency = Math.max(1, ...trace.steps.map((s) => s.latencyMs ?? 0));

  return (
    <div className="timeline" data-testid="timeline">
      {trace.steps.map((s) => {
        const isFlagged = flagged.has(s.step) || outliers.has(s.step);
        return (
          <div key={s.step}>
            <div
              className={`row${isFlagged ? " flagged" : ""}`}
              data-testid="timeline-row"
              onClick={() => setOpen(open === s.step ? null : s.step)}
            >
              <span className="mono muted">#{s.step}</span>
              <span className={`type ${s.type}`}>{s.type}</span>
              <span className="mono">{truncate(stepLabel(s))}</span>
              <Bar step={s} maxLatency={maxLatency} />
              <span className="right mono muted">
                {s.type === "llm" && s.cost !== undefined ? `$${s.cost.toFixed(4)}` : ""}
              </span>
            </div>
            {open === s.step && <StepDetail step={s} />}
          </div>
        );
      })}
    </div>
  );
}

function Bar({ step, maxLatency }: { step: Step; maxLatency: number }) {
  const pct = Math.round(((step.latencyMs ?? 0) / maxLatency) * 100);
  return (
    <div title={`${step.latencyMs ?? 0} ms`}>
      <div className="bar" style={{ width: `${Math.max(pct, 2)}%` }} />
    </div>
  );
}

function truncate(s: string, n = 64): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
