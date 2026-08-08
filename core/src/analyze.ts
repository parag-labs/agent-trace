import type { AgentTrace, Step } from "./types.js";
import { totalTokens } from "./types.js";

export interface TraceSummary {
  runId: string;
  steps: number;
  llmCalls: number;
  toolCalls: number;
  errors: number;
  totalCost: number;
  totalTokens: number;
  totalLatencyMs: number;
  overBudget: boolean;
}

/** Roll a trace up into the headline numbers the cost meter shows. */
export function summarize(trace: AgentTrace, budget?: number): TraceSummary {
  let totalCost = 0;
  let tokens = 0;
  let latency = 0;
  let llmCalls = 0;
  let toolCalls = 0;
  let errors = 0;

  for (const s of trace.steps) {
    latency += s.latencyMs ?? 0;
    tokens += totalTokens(s);
    if (s.type === "llm") {
      llmCalls++;
      totalCost += s.cost ?? 0;
    } else if (s.type === "tool") {
      toolCalls++;
    } else {
      errors++;
    }
  }

  totalCost = round6(totalCost);
  return {
    runId: trace.runId,
    steps: trace.steps.length,
    llmCalls,
    toolCalls,
    errors,
    totalCost,
    totalTokens: tokens,
    totalLatencyMs: round2(latency),
    overBudget: budget !== undefined && totalCost > budget + 1e-9,
  };
}

export interface LoopFinding {
  signature: string;
  count: number;
  steps: number[];
}

/**
 * Flag tool calls repeated with identical args - the classic "agent stuck in a
 * loop" failure. Heuristic (exact arg match), not semantic, but it catches the
 * common case where a retry never changes its input.
 */
export function detectLoops(trace: AgentTrace, minRepeats = 3): LoopFinding[] {
  const groups = new Map<string, number[]>();
  for (const s of trace.steps) {
    if (s.type !== "tool") continue;
    const sig = `${s.name}(${stableStringify(s.args ?? {})})`;
    const list = groups.get(sig) ?? [];
    list.push(s.step);
    groups.set(sig, list);
  }

  const out: LoopFinding[] = [];
  for (const [signature, steps] of groups) {
    if (steps.length >= minRepeats) {
      out.push({ signature, count: steps.length, steps });
    }
  }
  out.sort((a, b) => b.count - a.count);
  return out;
}

/**
 * Latency outliers: steps whose duration exceeds factor x the median. Returns the
 * step indices so the timeline can highlight them.
 */
export function latencyOutliers(trace: AgentTrace, factor = 3): number[] {
  const timed = trace.steps.filter((s) => (s.latencyMs ?? 0) > 0);
  if (timed.length < 3) return [];
  const sorted = timed.map((s) => s.latencyMs as number).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  if (median <= 0) return [];
  return timed.filter((s) => (s.latencyMs as number) > factor * median).map((s) => s.step);
}

/** The chronological start offset (seconds) of each step, for the timeline axis. */
export function relativeTimeline(trace: AgentTrace): Map<number, number> {
  const withTs = trace.steps.filter((s) => s.ts !== undefined);
  const offsets = new Map<number, number>();
  if (withTs.length === 0) return offsets;
  const start = Math.min(...withTs.map((s) => s.ts as number));
  for (const s of trace.steps) {
    if (s.ts !== undefined) offsets.set(s.step, round2(s.ts - start));
  }
  return offsets;
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export function stepLabel(s: Step): string {
  switch (s.type) {
    case "llm":
      return s.model;
    case "tool":
      return s.name;
    case "error":
      return s.message;
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round6(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}
