import type { AgentTrace, Step } from "./types.js";

/**
 * Minimal shape of an OpenTelemetry span we care about. A real OTel export nests
 * far more; we read only the GenAI semantic-convention attributes plus timing, so
 * the same trace an app already emits for observability can be replayed here -
 * no separate instrumentation.
 */
export interface OtelSpan {
  name?: string;
  startTimeUnixNano?: number | string;
  endTimeUnixNano?: number | string;
  attributes?: Record<string, unknown>;
}

/**
 * Map GenAI spans onto the normalized model. A span with gen_ai.* attributes
 * becomes an llm step; a span whose name looks like a tool/function call becomes
 * a tool step; a span carrying an error attribute becomes an error step.
 */
export function parseOtelSpans(spans: OtelSpan[], runId = "run"): AgentTrace {
  const steps: Step[] = [];

  spans.forEach((span, i) => {
    const attrs = span.attributes ?? {};
    const latencyMs = spanLatencyMs(span);
    const ts = spanStartSeconds(span);
    const base = { runId, step: i, ts, latencyMs };

    if (hasError(attrs)) {
      steps.push({
        ...base,
        type: "error",
        message: String(attrs["error.message"] ?? attrs["exception.message"] ?? "error"),
      });
      return;
    }

    if (isGenAi(attrs)) {
      steps.push({
        ...base,
        type: "llm",
        model: String(attrs["gen_ai.request.model"] ?? attrs["gen_ai.response.model"] ?? "unknown"),
        inputTokens: attrNum(attrs, ["gen_ai.usage.input_tokens", "gen_ai.usage.prompt_tokens"]),
        outputTokens: attrNum(attrs, ["gen_ai.usage.output_tokens", "gen_ai.usage.completion_tokens"]),
        cost: attrOptNum(attrs, ["gen_ai.usage.cost"]),
        prompt: attrOptStr(attrs, ["gen_ai.prompt"]),
        completion: attrOptStr(attrs, ["gen_ai.completion"]),
      });
      return;
    }

    // Anything else with a name is treated as a tool/function call.
    steps.push({
      ...base,
      type: "tool",
      name: String(attrs["tool.name"] ?? span.name ?? "tool"),
      result: attrOptStr(attrs, ["tool.result", "output"]),
    });
  });

  return { runId, steps };
}

function isGenAi(attrs: Record<string, unknown>): boolean {
  return Object.keys(attrs).some((k) => k.startsWith("gen_ai."));
}

function hasError(attrs: Record<string, unknown>): boolean {
  return "error.message" in attrs || "exception.message" in attrs;
}

function spanLatencyMs(span: OtelSpan): number | undefined {
  const start = toNumber(span.startTimeUnixNano);
  const end = toNumber(span.endTimeUnixNano);
  if (start === undefined || end === undefined) return undefined;
  return (end - start) / 1e6;
}

function spanStartSeconds(span: OtelSpan): number | undefined {
  const start = toNumber(span.startTimeUnixNano);
  return start === undefined ? undefined : start / 1e9;
}

function toNumber(v: number | string | undefined): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

function attrNum(attrs: Record<string, unknown>, keys: string[]): number {
  return attrOptNum(attrs, keys) ?? 0;
}

function attrOptNum(attrs: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = attrs[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return undefined;
}

function attrOptStr(attrs: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = attrs[k];
    if (typeof v === "string") return v;
  }
  return undefined;
}
