import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { parseNativeJsonl } from "@agent-trace/core";
import { DiffView } from "../src/components/DiffView.js";

function trace(lines: string[]) {
  return parseNativeJsonl(lines.join("\n"));
}

describe("DiffView", () => {
  it("shows a changed row and a negative cost delta when the candidate is cheaper", () => {
    const baseline = trace([
      `{"run_id":"a","step":0,"type":"llm","model":"gpt-4o","input_tokens":0,"output_tokens":0,"cost":1.0}`,
    ]);
    const candidate = trace([
      `{"run_id":"b","step":0,"type":"llm","model":"gpt-4o","input_tokens":0,"output_tokens":0,"cost":0.4}`,
    ]);
    render(<DiffView baseline={baseline} candidate={candidate} />);
    expect(screen.getByTestId("diff-row-changed")).toBeInTheDocument();
    expect(screen.getByTestId("diff-cost-delta").textContent).toBe("-$0.6000");
  });

  it("renders an added row for a step only in the candidate", () => {
    const baseline = trace([`{"run_id":"a","step":0,"type":"error","message":"x"}`]);
    const candidate = trace([
      `{"run_id":"b","step":0,"type":"error","message":"x"}`,
      `{"run_id":"b","step":1,"type":"tool","name":"extra"}`,
    ]);
    render(<DiffView baseline={baseline} candidate={candidate} />);
    expect(screen.getByTestId("diff-row-added")).toBeInTheDocument();
    expect(screen.getByText("extra")).toBeInTheDocument();
  });
});
