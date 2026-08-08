import type { AgentTrace, ErrorStep, LlmStep, Step, ToolStep } from "./types.js";

/**
 * Read the native JSONL format: one JSON object per line, each describing a step.
 * Blank lines are skipped; a malformed line throws with its line number so a bad
 * trace fails loudly instead of silently dropping data.
 */
export function parseNativeJsonl(text: string, runIdFallback = "run"): AgentTrace {
  const steps: Step[] = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue;

    let row: Record<string, unknown>;
    try {
      row = JSON.parse(line) as Record<string, unknown>;
    } catch {
      throw new Error(`invalid JSON on line ${i + 1}`);
    }
    steps.push(rowToStep(row, i));
  }

  steps.sort((a, b) => a.step - b.step);
  const runId = steps.length > 0 ? steps[0].runId : runIdFallback;
  return { runId, steps };
}

function rowToStep(row: Record<string, unknown>, lineIndex: number): Step {
  const type = String(row.type ?? "");
  const runId = String(row.run_id ?? row.runId ?? "run");
  const step = num(row.step, lineIndex);
  const base = { runId, step, ts: optNum(row.ts), latencyMs: optNum(row.latency_ms ?? row.latencyMs) };

  switch (type) {
    case "llm":
      return {
        ...base,
        type: "llm",
        model: String(row.model ?? "unknown"),
        inputTokens: num(row.input_tokens ?? row.inputTokens, 0),
        outputTokens: num(row.output_tokens ?? row.outputTokens, 0),
        cost: optNum(row.cost),
        prompt: optStr(row.prompt),
        completion: optStr(row.completion),
      } satisfies LlmStep;
    case "tool":
      return {
        ...base,
        type: "tool",
        name: String(row.name ?? "unknown"),
        args: isRecord(row.args) ? row.args : undefined,
        result: optStr(row.result),
      } satisfies ToolStep;
    case "error":
      return {
        ...base,
        type: "error",
        message: String(row.message ?? "error"),
      } satisfies ErrorStep;
    default:
      throw new Error(`unknown step type '${type}' on line ${lineIndex + 1}`);
  }
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function optNum(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function optStr(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
