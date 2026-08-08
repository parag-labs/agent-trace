// Bundle the shared sample traces as raw text so the demo works offline with no
// fetch. The files live at the repo root so every language/tool shares them.
import simple from "../../samples/simple-run.jsonl?raw";
import looping from "../../samples/looping-run.jsonl?raw";
import overBudget from "../../samples/over-budget-run.jsonl?raw";

export interface Sample {
  id: string;
  label: string;
  text: string;
}

export const SAMPLES: Sample[] = [
  { id: "simple", label: "simple run", text: simple },
  { id: "looping", label: "looping run", text: looping },
  { id: "over-budget", label: "over-budget run", text: overBudget },
];
