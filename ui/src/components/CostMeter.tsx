import type { TraceSummary } from "@agent-trace/core";

interface Props {
  summary: TraceSummary;
  budget?: number;
}

/** Headline numbers for a run, turning red when the cost budget is exceeded. */
export function CostMeter({ summary, budget }: Props) {
  return (
    <div className={`meter${summary.overBudget ? " over" : ""}`} data-testid="cost-meter">
      <div className="stat">
        <b data-testid="meter-cost">${summary.totalCost.toFixed(4)}</b>
        <span>cost{budget !== undefined ? ` / $${budget.toFixed(2)} budget` : ""}</span>
      </div>
      <div className="stat">
        <b>{summary.totalTokens.toLocaleString()}</b>
        <span>tokens</span>
      </div>
      <div className="stat">
        <b>{summary.totalLatencyMs.toLocaleString()} ms</b>
        <span>total latency</span>
      </div>
      <div className="stat">
        <b>{summary.llmCalls}</b>
        <span>llm calls</span>
      </div>
      <div className="stat">
        <b>{summary.toolCalls}</b>
        <span>tool calls</span>
      </div>
      <div className="stat">
        <b>{summary.errors}</b>
        <span>errors</span>
      </div>
      <div className="stat" style={{ marginLeft: "auto", alignSelf: "center" }}>
        {summary.overBudget ? (
          <span className="badge over" data-testid="budget-badge">
            over budget
          </span>
        ) : (
          <span className="badge ok" data-testid="budget-badge">
            within budget
          </span>
        )}
      </div>
    </div>
  );
}
