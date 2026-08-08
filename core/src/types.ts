/**
 * The normalized trace model. Everything the UI renders is derived from these
 * types, and both the native JSONL reader and the OpenTelemetry adapter produce
 * them - so the rest of the app never needs to know where a trace came from.
 */

export type StepType = "llm" | "tool" | "error";

export interface BaseStep {
  runId: string;
  step: number;
  type: StepType;
  /** Unix seconds. Optional - some traces only carry ordering, not wall-clock. */
  ts?: number;
  latencyMs?: number;
}

export interface LlmStep extends BaseStep {
  type: "llm";
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** USD. May be absent if the emitter didn't price the call. */
  cost?: number;
  prompt?: string;
  completion?: string;
}

export interface ToolStep extends BaseStep {
  type: "tool";
  name: string;
  args?: Record<string, unknown>;
  result?: string;
}

export interface ErrorStep extends BaseStep {
  type: "error";
  message: string;
}

export type Step = LlmStep | ToolStep | ErrorStep;

export interface AgentTrace {
  runId: string;
  steps: Step[];
}

export function totalTokens(step: Step): number {
  return step.type === "llm" ? step.inputTokens + step.outputTokens : 0;
}
