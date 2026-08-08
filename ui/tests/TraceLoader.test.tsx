import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TraceLoader } from "../src/components/TraceLoader.js";

function fileWith(text: string): File {
  const file = new File([text], "trace.jsonl", { type: "application/jsonl" });
  // jsdom doesn't implement Blob.text(); real browsers do. Shim it for the test.
  if (typeof file.text !== "function") {
    Object.defineProperty(file, "text", { value: () => Promise.resolve(text) });
  }
  return file;
}

describe("TraceLoader", () => {
  it("parses a dropped file and calls onLoad", async () => {
    const onLoad = vi.fn();
    render(<TraceLoader label="load" onLoad={onLoad} />);
    const input = screen.getByTestId("file-input");
    const file = fileWith(`{"run_id":"r","step":0,"type":"error","message":"ok"}`);
    Object.defineProperty(input, "files", { value: [file] });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await waitFor(() => expect(onLoad).toHaveBeenCalledTimes(1));
    expect(onLoad.mock.calls[0][0].steps).toHaveLength(1);
  });

  it("surfaces a parse error instead of throwing", async () => {
    const onLoad = vi.fn();
    render(<TraceLoader label="load" onLoad={onLoad} />);
    const input = screen.getByTestId("file-input");
    Object.defineProperty(input, "files", { value: [fileWith("not json")] });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(await screen.findByTestId("loader-error")).toBeInTheDocument();
    expect(onLoad).not.toHaveBeenCalled();
  });
});
