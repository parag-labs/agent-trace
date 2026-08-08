import { describe, expect, it } from "vitest";
import { diffTraces } from "../src/diff.js";
import { parseNativeJsonl } from "../src/parseNative.js";

function trace(lines: string[]) {
  return parseNativeJsonl(lines.join("\n"));
}

describe("diffTraces", () => {
  it("marks identical runs as all same", () => {
    const a = trace([`{"run_id":"a","step":0,"type":"tool","name":"search","args":{"q":"x"}}`]);
    const b = trace([`{"run_id":"b","step":0,"type":"tool","name":"search","args":{"q":"x"}}`]);
    const d = diffTraces(a, b);
    expect(d.rows[0].kind).toBe("same");
    expect(d.costDelta).toBe(0);
  });

  it("marks a step with different output as changed", () => {
    const a = trace([`{"run_id":"a","step":0,"type":"tool","name":"search","args":{"q":"x"},"result":"old"}`]);
    const b = trace([`{"run_id":"b","step":0,"type":"tool","name":"search","args":{"q":"x"},"result":"new"}`]);
    const d = diffTraces(a, b);
    expect(d.rows[0].kind).toBe("changed");
    expect(d.rows[0].outputChanged).toBe(true);
  });

  it("detects added and removed steps", () => {
    const a = trace([
      `{"run_id":"a","step":0,"type":"error","message":"x"}`,
      `{"run_id":"a","step":1,"type":"error","message":"y"}`,
    ]);
    const b = trace([`{"run_id":"b","step":0,"type":"error","message":"x"}`]);
    const d = diffTraces(a, b);
    expect(d.rows.find((r) => r.step === 1)?.kind).toBe("removed");
  });

  it("computes cost delta as candidate minus baseline", () => {
    const a = trace([`{"run_id":"a","step":0,"type":"llm","model":"m","input_tokens":0,"output_tokens":0,"cost":1.0}`]);
    const b = trace([`{"run_id":"b","step":0,"type":"llm","model":"m","input_tokens":0,"output_tokens":0,"cost":0.4}`]);
    const d = diffTraces(a, b);
    expect(d.costDelta).toBe(-0.6);
    expect(d.rows[0].kind).toBe("changed");
  });

  it("computes latency delta across the run", () => {
    const a = trace([`{"run_id":"a","step":0,"type":"tool","name":"t","latency_ms":100}`]);
    const b = trace([`{"run_id":"b","step":0,"type":"tool","name":"t","latency_ms":250}`]);
    expect(diffTraces(a, b).latencyDelta).toBe(150);
  });

  it("orders rows by step index across both runs", () => {
    const a = trace([`{"run_id":"a","step":0,"type":"error","message":"x"}`]);
    const b = trace([
      `{"run_id":"b","step":0,"type":"error","message":"x"}`,
      `{"run_id":"b","step":1,"type":"error","message":"added"}`,
    ]);
    const d = diffTraces(a, b);
    expect(d.rows.map((r) => r.step)).toEqual([0, 1]);
    expect(d.rows[1].kind).toBe("added");
  });
});
