import { describe, expect, it } from "vitest";
import { parseOtelSpans, type OtelSpan } from "../src/parseOtel.js";

describe("parseOtelSpans", () => {
  it("maps a gen_ai span to an llm step and derives latency", () => {
    const spans: OtelSpan[] = [
      {
        name: "chat",
        startTimeUnixNano: 1_000_000_000, // 1s
        endTimeUnixNano: 1_800_000_000, // 1.8s
        attributes: {
          "gen_ai.request.model": "gpt-4o",
          "gen_ai.usage.input_tokens": 100,
          "gen_ai.usage.output_tokens": 20,
        },
      },
    ];
    const trace = parseOtelSpans(spans);
    const s = trace.steps[0];
    expect(s.type).toBe("llm");
    if (s.type === "llm") {
      expect(s.model).toBe("gpt-4o");
      expect(s.inputTokens).toBe(100);
      expect(s.latencyMs).toBeCloseTo(800, 3);
    }
  });

  it("reads prompt_tokens / completion_tokens aliases", () => {
    const spans: OtelSpan[] = [
      {
        attributes: {
          "gen_ai.response.model": "claude-sonnet-4",
          "gen_ai.usage.prompt_tokens": 7,
          "gen_ai.usage.completion_tokens": 3,
        },
      },
    ];
    const s = parseOtelSpans(spans).steps[0];
    if (s.type === "llm") {
      expect(s.model).toBe("claude-sonnet-4");
      expect(s.inputTokens).toBe(7);
      expect(s.outputTokens).toBe(3);
    }
  });

  it("maps a non-genai span to a tool step", () => {
    const spans: OtelSpan[] = [{ name: "search", attributes: { "tool.name": "web_search" } }];
    const s = parseOtelSpans(spans).steps[0];
    expect(s.type).toBe("tool");
    if (s.type === "tool") expect(s.name).toBe("web_search");
  });

  it("maps a span with an error attribute to an error step", () => {
    const spans: OtelSpan[] = [{ attributes: { "error.message": "timeout" } }];
    const s = parseOtelSpans(spans).steps[0];
    expect(s.type).toBe("error");
    if (s.type === "error") expect(s.message).toBe("timeout");
  });

  it("accepts nano timestamps as strings", () => {
    const spans: OtelSpan[] = [
      { startTimeUnixNano: "2000000000", endTimeUnixNano: "2500000000", attributes: { "gen_ai.request.model": "m" } },
    ];
    const s = parseOtelSpans(spans).steps[0];
    expect(s.latencyMs).toBeCloseTo(500, 3);
    expect(s.ts).toBeCloseTo(2, 6);
  });

  it("preserves order as step indices", () => {
    const spans: OtelSpan[] = [
      { attributes: { "gen_ai.request.model": "m" } },
      { name: "tool" },
      { attributes: { "error.message": "x" } },
    ];
    expect(parseOtelSpans(spans).steps.map((s) => s.step)).toEqual([0, 1, 2]);
  });
});
