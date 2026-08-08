import type { AgentTrace, Step } from "./types.js";
import { stableStringify, stepLabel } from "./analyze.js";
import { totalTokens } from "./types.js";

export type ChangeKind = "same" | "changed" | "added" | "removed";

export interface StepDiff {
  step: number;
  kind: ChangeKind;
  label: string;
  costDelta: number;
  latencyDelta: number;
  tokenDelta: number;
  /** True when both sides exist but their output/label differs. */
  outputChanged: boolean;
}

export interface TraceDiff {
  rows: StepDiff[];
  costDelta: number;
  latencyDelta: number;
}

/**
 * Align two runs by step index and classify each position. A step present in only
 * one run is added/removed; a step in both is "changed" when its label or output
 * differs, otherwise "same". Deltas are baseline -> candidate (candidate minus
 * baseline), so a cheaper candidate reads as a negative cost delta.
 */
export function diffTraces(baseline: AgentTrace, candidate: AgentTrace): TraceDiff {
  const byStepA = index(baseline);
  const byStepB = index(candidate);
  const allSteps = [...new Set([...byStepA.keys(), ...byStepB.keys()])].sort((a, b) => a - b);

  const rows: StepDiff[] = [];
  let costDelta = 0;
  let latencyDelta = 0;

  for (const step of allSteps) {
    const a = byStepA.get(step);
    const b = byStepB.get(step);

    if (a && !b) {
      rows.push(row(step, "removed", a, undefined, false));
      costDelta -= cost(a);
      latencyDelta -= a.latencyMs ?? 0;
    } else if (!a && b) {
      rows.push(row(step, "added", undefined, b, false));
      costDelta += cost(b);
      latencyDelta += b.latencyMs ?? 0;
    } else if (a && b) {
      const outputChanged = fingerprint(a) !== fingerprint(b);
      const metricsChanged =
        cost(a) !== cost(b) || (a.latencyMs ?? 0) !== (b.latencyMs ?? 0) || tokensOf(a) !== tokensOf(b);
      const kind: ChangeKind = outputChanged || metricsChanged ? "changed" : "same";
      rows.push(row(step, kind, a, b, outputChanged));
      costDelta += cost(b) - cost(a);
      latencyDelta += (b.latencyMs ?? 0) - (a.latencyMs ?? 0);
    }
  }

  return { rows, costDelta: round6(costDelta), latencyDelta: round2(latencyDelta) };
}

function row(
  step: number,
  kind: ChangeKind,
  a: Step | undefined,
  b: Step | undefined,
  outputChanged?: boolean,
): StepDiff {
  const primary = b ?? a;
  return {
    step,
    kind,
    label: primary ? stepLabel(primary) : "",
    costDelta: round6(cost(b) - cost(a)),
    latencyDelta: round2((b?.latencyMs ?? 0) - (a?.latencyMs ?? 0)),
    tokenDelta: (b ? totalTokens(b) : 0) - (a ? totalTokens(a) : 0),
    outputChanged: outputChanged ?? (kind === "added" || kind === "removed"),
  };
}

function index(trace: AgentTrace): Map<number, Step> {
  const map = new Map<number, Step>();
  for (const s of trace.steps) map.set(s.step, s);
  return map;
}

function cost(s: Step | undefined): number {
  return s && s.type === "llm" ? s.cost ?? 0 : 0;
}

function tokensOf(s: Step): number {
  return totalTokens(s);
}

/** A stable summary of a step's identity + output, used to detect changes. */
function fingerprint(s: Step): string {
  switch (s.type) {
    case "llm":
      return `llm:${s.model}:${s.completion ?? ""}`;
    case "tool":
      return `tool:${s.name}:${stableStringify(s.args ?? {})}:${s.result ?? ""}`;
    case "error":
      return `error:${s.message}`;
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round6(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}
