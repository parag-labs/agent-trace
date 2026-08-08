import type { Step } from "@agent-trace/core";

interface Props {
  step: Step;
}

/** The expanded view of one step: its prompt/response, tool args/result, or error. */
export function StepDetail({ step }: Props) {
  return (
    <div className="detail" data-testid="step-detail">
      {step.type === "llm" && (
        <>
          <div className="muted">
            {step.model} · {step.inputTokens} in / {step.outputTokens} out
            {step.cost !== undefined ? ` · $${step.cost.toFixed(4)}` : ""}
          </div>
          {step.prompt !== undefined && (
            <>
              <div className="muted" style={{ marginTop: 8 }}>
                prompt
              </div>
              <pre className="mono">{step.prompt}</pre>
            </>
          )}
          {step.completion !== undefined && (
            <>
              <div className="muted">completion</div>
              <pre className="mono">{step.completion}</pre>
            </>
          )}
        </>
      )}

      {step.type === "tool" && (
        <>
          <div className="muted">tool: {step.name}</div>
          {step.args !== undefined && (
            <>
              <div className="muted" style={{ marginTop: 8 }}>
                args
              </div>
              <pre className="mono">{JSON.stringify(step.args, null, 2)}</pre>
            </>
          )}
          {step.result !== undefined && (
            <>
              <div className="muted">result</div>
              <pre className="mono">{step.result}</pre>
            </>
          )}
        </>
      )}

      {step.type === "error" && (
        <>
          <div className="type error">error</div>
          <pre className="mono">{step.message}</pre>
        </>
      )}
    </div>
  );
}
