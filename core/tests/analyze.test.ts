import { describe, expect, it } from "vitest";
import {
  detectLoops,
  latencyOutliers,
  relativeTimeline,
  stableStringify,
  summarize,
} from "../src/analyze.js";
import { parseNativeJsonl } from "../src/parseNative.js";

function trace(lines: string[]) {
  return parseNativeJsonl(lines.join("\n"));
}

describe("summarize", () => {
  it("rolls up cost, tokens, latency, and step type counts", () => {
    const t = trace([
      `{"run_id":"r","step":0,"type":"llm","model":"gpt-4o","input_tokens":100,"output_tokens":20,"cost":0.5,"latency_ms":800}`,
      `{"run_id":"r","step":1,"type":"tool","name":"search","latency_ms":120}`,
      `{"run_id":"r","step":2,"type":"llm","model":"gpt-4o","input_tokens":50,"output_tokens":10,"cost":0.25,"latency_ms":400}`,
      `{"run_id":"r","step":3,"type":"error","message":"x"}`,
    ]);
    const s = summarize(t);
    expect(s.steps).toBe(4);
    expect(s.llmCalls).toBe(2);
    expect(s.toolCalls).toBe(1);
    expect(s.errors).toBe(1);
    expect(s.totalCost).toBe(0.75);
    expect(s.totalTokens).toBe(180);
    expect(s.totalLatencyMs).toBe(1320);
  });

  it("flags a run that exceeds the budget", () => {
    const t = trace([
      `{"run_id":"r","step":0,"type":"llm","model":"m","input_tokens":0,"output_tokens":0,"cost":2.0}`,
    ]);
    expect(summarize(t, 1.0).overBudget).toBe(true);
    expect(summarize(t, 5.0).overBudget).toBe(false);
  });
});

describe("detectLoops", () => {
  it("flags a tool repeated with identical args", () => {
    const t = trace([
      `{"run_id":"r","step":0,"type":"tool","name":"search","args":{"q":"same"}}`,
      `{"run_id":"r","step":1,"type":"tool","name":"search","args":{"q":"same"}}`,
      `{"run_id":"r","step":2,"type":"tool","name":"search","args":{"q":"same"}}`,
    ]);
    const loops = detectLoops(t);
    expect(loops).toHaveLength(1);
    expect(loops[0].count).toBe(3);
    expect(loops[0].steps).toEqual([0, 1, 2]);
  });

  it("does not flag the same tool with different args", () => {
    const t = trace([
      `{"run_id":"r","step":0,"type":"tool","name":"search","args":{"q":"a"}}`,
      `{"run_id":"r","step":1,"type":"tool","name":"search","args":{"q":"b"}}`,
      `{"run_id":"r","step":2,"type":"tool","name":"search","args":{"q":"c"}}`,
    ]);
    expect(detectLoops(t)).toHaveLength(0);
  });

  it("treats arg key order as equal", () => {
    const t = trace([
      `{"run_id":"r","step":0,"type":"tool","name":"f","args":{"a":1,"b":2}}`,
      `{"run_id":"r","step":1,"type":"tool","name":"f","args":{"b":2,"a":1}}`,
      `{"run_id":"r","step":2,"type":"tool","name":"f","args":{"a":1,"b":2}}`,
    ]);
    expect(detectLoops(t)[0].count).toBe(3);
  });
});

describe("latencyOutliers", () => {
  it("returns steps far above the median", () => {
    const t = trace([
      `{"run_id":"r","step":0,"type":"tool","name":"a","latency_ms":100}`,
      `{"run_id":"r","step":1,"type":"tool","name":"b","latency_ms":110}`,
      `{"run_id":"r","step":2,"type":"tool","name":"c","latency_ms":90}`,
      `{"run_id":"r","step":3,"type":"tool","name":"slow","latency_ms":5000}`,
    ]);
    expect(latencyOutliers(t)).toContain(3);
    expect(latencyOutliers(t)).not.toContain(0);
  });

  it("returns nothing without enough timed steps", () => {
    const t = trace([`{"run_id":"r","step":0,"type":"tool","name":"a","latency_ms":100}`]);
    expect(latencyOutliers(t)).toEqual([]);
  });
});

describe("relativeTimeline", () => {
  it("computes offsets from the earliest timestamp", () => {
    const t = trace([
      `{"run_id":"r","step":0,"type":"error","message":"a","ts":1000}`,
      `{"run_id":"r","step":1,"type":"error","message":"b","ts":1002.5}`,
    ]);
    const offsets = relativeTimeline(t);
    expect(offsets.get(0)).toBe(0);
    expect(offsets.get(1)).toBe(2.5);
  });
});

describe("stableStringify", () => {
  it("is order-independent for object keys", () => {
    expect(stableStringify({ a: 1, b: 2 })).toBe(stableStringify({ b: 2, a: 1 }));
  });
});
