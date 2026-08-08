import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { parseNativeJsonl } from "@agent-trace/core";
import { Timeline } from "../src/components/Timeline.js";

function trace(lines: string[]) {
  return parseNativeJsonl(lines.join("\n"));
}

describe("Timeline", () => {
  it("renders one row per step in order", () => {
    const t = trace([
      `{"run_id":"r","step":0,"type":"llm","model":"gpt-4o","input_tokens":10,"output_tokens":5,"cost":0.001,"latency_ms":100}`,
      `{"run_id":"r","step":1,"type":"tool","name":"search","latency_ms":50}`,
      `{"run_id":"r","step":2,"type":"error","message":"boom"}`,
    ]);
    render(<Timeline trace={t} />);
    expect(screen.getAllByTestId("timeline-row")).toHaveLength(3);
    expect(screen.getByText("gpt-4o")).toBeInTheDocument();
    expect(screen.getByText("search")).toBeInTheDocument();
  });

  it("expands a step's detail when clicked", async () => {
    const t = trace([
      `{"run_id":"r","step":0,"type":"llm","model":"gpt-4o","input_tokens":10,"output_tokens":5,"cost":0.001,"latency_ms":100,"completion":"hello world"}`,
    ]);
    render(<Timeline trace={t} />);
    expect(screen.queryByTestId("step-detail")).not.toBeInTheDocument();
    screen.getByText("gpt-4o").click();
    expect(await screen.findByTestId("step-detail")).toBeInTheDocument();
    expect(screen.getByText("hello world")).toBeInTheDocument();
  });

  it("flags steps passed in flaggedSteps", () => {
    const t = trace([
      `{"run_id":"r","step":0,"type":"tool","name":"a","latency_ms":10}`,
      `{"run_id":"r","step":1,"type":"tool","name":"b","latency_ms":10}`,
    ]);
    render(<Timeline trace={t} flaggedSteps={new Set([1])} />);
    const rows = screen.getAllByTestId("timeline-row");
    expect(rows[1].className).toContain("flagged");
  });
});
