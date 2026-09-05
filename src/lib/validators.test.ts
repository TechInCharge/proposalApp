import { describe, it, expect } from "vitest";
import { proseMirrorDoc, boqItemInput } from "./validators";

describe("proseMirrorDoc", () => {
  it("accepts a rich doc (tables, images, marks) and returns a deep clone", () => {
    const input = {
      type: "doc" as const,
      content: [
        { type: "image", attrs: { src: "/api/files/x.png" } },
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                { type: "tableCell", content: [{ type: "paragraph" }] },
              ],
            },
          ],
        },
      ],
    };
    const out = proseMirrorDoc.parse(input);
    expect(out).toEqual(input);
    // must be a fresh structure — a Server Action arg may carry lazy proxies
    expect(out).not.toBe(input);
    expect((out as unknown as { content: unknown[] }).content).not.toBe(
      input.content,
    );
  });

  it("rejects a non-doc value", () => {
    expect(proseMirrorDoc.safeParse({ type: "paragraph" }).success).toBe(false);
  });
});

describe("boqItemInput", () => {
  it("coerces quantity to a positive integer, defaulting to 1", () => {
    expect(boqItemInput.parse({ description: "x", quantity: "3" }).quantity).toBe(3);
    expect(boqItemInput.parse({ description: "x" }).quantity).toBe(1);
    expect(boqItemInput.safeParse({ description: "x", quantity: 0 }).success).toBe(false);
  });
});
