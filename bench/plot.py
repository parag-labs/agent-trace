"""Render the agent-trace benchmark graph from bench/results/summary.json.

The measurement itself runs in Node (the core is TypeScript) via `npm run bench`;
this just draws the numbers. Kept as a separate step so the benchmark has no Node
charting dependency and the plotting matches the rest of parag-labs (matplotlib).

    npm run bench        # writes bench/results/summary.json
    python bench/plot.py # writes bench/results/throughput.png
"""

from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

RESULTS = Path(__file__).resolve().parent / "results"


def main() -> None:
    summary = json.loads((RESULTS / "summary.json").read_text(encoding="utf-8"))
    sizes = summary["sizes"]
    parse = [v / 1e6 for v in summary["parse_steps_per_sec"]]
    analyze = [v / 1e6 for v in summary["analyze_steps_per_sec"]]

    fig, ax = plt.subplots(figsize=(6.5, 4))
    ax.plot([s / 1000 for s in sizes], parse, "o-", color="tab:blue", label="parse JSONL")
    ax.plot([s / 1000 for s in sizes], analyze, "s--", color="tab:green", label="analyze (summary+loops+outliers)")
    ax.set_xlabel("trace size (thousand steps)")
    ax.set_ylabel("throughput (million steps/sec)")
    ax.set_title("agent-trace: core parse + analyze throughput")
    ax.set_ylim(bottom=0)
    ax.legend()
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(RESULTS / "throughput.png", dpi=110)
    plt.close(fig)
    print("wrote", RESULTS / "throughput.png")


if __name__ == "__main__":
    main()
