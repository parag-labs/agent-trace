import { describe, expect, it } from "vitest";
import { parseNativeJsonl } from "../src/parseNative.js";

describe("parseNativeJsonl", () => {
  it("parses llm, tool, and error steps", () => {
    const text = [
      `{"run_id":"r1","step":0,"type":"llm","model":"gpt-4o","input_tokens":100,"output_tokens":20,"cost":0.0007,"latency_ms":800}`,
      `{"run_id":"r1","step":1,"type":"tool","name":"search","args":{"q":"hi"},"latency_ms":120}`,
      `{"run_id":"r1","step":2,"type":"error","message":"boom"}`,
    ].join("\n");

    const trace = parseNativeJsonl(text);
    expect(trace.runId).toBe("r1");
    expect(trace.steps).toHaveLength(3);
    expect(trace.steps[0].type).toBe("llm");
    expect(trace.steps[1].type).toBe("tool");
    expect(trace.steps[2].type).toBe("error");
  });

  it("skips blank lines", () => {
    const text = `\n{"run_id":"r","step":0,"type":"error","message":"x"}\n\n`;
    expect(parseNativeJsonl(text).steps).toHaveLength(1);
  });

  it("sorts out-of-order steps by index", () => {
    const text = [
      `{"run_id":"r","step":2,"type":"error","message":"c"}`,
      `{"run_id":"r","step":0,"type":"error","message":"a"}`,
      `{"run_id":"r","step":1,"type":"error","message":"b"}`,
    ].join("\n");
    expect(parseNativeJsonl(text).steps.map((s) => s.step)).toEqual([0, 1, 2]);
  });

  it("accepts camelCase field aliases", () => {
    const text = `{"runId":"r","step":0,"type":"llm","model":"m","inputTokens":5,"outputTokens":5,"latencyMs":10}`;
    const s = parseNativeJsonl(text).steps[0];
    expect(s.type).toBe("llm");
    if (s.type === "llm") {
      expect(s.inputTokens).toBe(5);
      expect(s.latencyMs).toBe(10);
    }
  });

  it("throws with the line number on malformed JSON", () => {
    const text = `{"run_id":"r","step":0,"type":"error","message":"ok"}\nnot json`;
    expect(() => parseNativeJsonl(text)).toThrow(/line 2/);
  });

  it("throws on an unknown step type", () => {
    expect(() => parseNativeJsonl(`{"step":0,"type":"mystery"}`)).toThrow(/unknown step type/);
  });

  it("defaults missing numeric fields to zero", () => {
    const s = parseNativeJsonl(`{"run_id":"r","step":0,"type":"llm","model":"m"}`).steps[0];
    if (s.type === "llm") {
      expect(s.inputTokens).toBe(0);
      expect(s.outputTokens).toBe(0);
    }
  });
});
