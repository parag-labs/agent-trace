import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { parseNativeJsonl, summarize } from "@agent-trace/core";
import { CostMeter } from "../src/components/CostMeter.js";

function summaryFor(lines: string[], budget?: number) {
  return summarize(parseNativeJsonl(lines.join("\n")), budget);
}

describe("CostMeter", () => {
  it("shows the total cost", () => {
    const s = summaryFor([
      `{"run_id":"r","step":0,"type":"llm","model":"m","input_tokens":0,"output_tokens":0,"cost":0.1234}`,
    ]);
    render(<CostMeter summary={s} />);
    expect(screen.getByTestId("meter-cost").textContent).toBe("$0.1234");
  });

  it("flips to over-budget state when the cap is exceeded", () => {
    const s = summaryFor(
      [`{"run_id":"r","step":0,"type":"llm","model":"m","input_tokens":0,"output_tokens":0,"cost":2.0}`],
      1.0,
    );
    render(<CostMeter summary={s} budget={1.0} />);
    expect(screen.getByTestId("cost-meter").className).toContain("over");
    expect(screen.getByTestId("budget-badge").textContent).toBe("over budget");
  });

  it("stays within budget when under the cap", () => {
    const s = summaryFor(
      [`{"run_id":"r","step":0,"type":"llm","model":"m","input_tokens":0,"output_tokens":0,"cost":0.1}`],
      1.0,
    );
    render(<CostMeter summary={s} budget={1.0} />);
    expect(screen.getByTestId("cost-meter").className).not.toContain("over");
    expect(screen.getByTestId("budget-badge").textContent).toBe("within budget");
  });
});
