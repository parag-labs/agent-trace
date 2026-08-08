import { useRef, useState } from "react";
import type { AgentTrace } from "@agent-trace/core";
import { parseNativeJsonl } from "@agent-trace/core";

interface Props {
  label: string;
  onLoad: (trace: AgentTrace) => void;
}

/** A drag/drop + file-picker loader that parses native JSONL and surfaces errors. */
export function TraceLoader({ label, onLoad }: Props) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleText(text: string) {
    try {
      const trace = parseNativeJsonl(text);
      setError(null);
      onLoad(trace);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to parse trace");
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    handleText(await files[0].text());
  }

  return (
    <span
      className="drop"
      data-testid="trace-loader"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void handleFiles(e.dataTransfer.files);
      }}
    >
      <button className="btn" onClick={() => inputRef.current?.click()}>
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".jsonl,.json,.txt"
        style={{ display: "none" }}
        data-testid="file-input"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      {error && (
        <span className="badge over" data-testid="loader-error" style={{ marginLeft: 8 }}>
          {error}
        </span>
      )}
    </span>
  );
}
