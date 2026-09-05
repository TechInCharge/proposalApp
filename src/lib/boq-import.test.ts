import { describe, it, expect } from "vitest";
import { parseBoqBuffer } from "./boq-import";

describe("parseBoqBuffer (CSV)", () => {
  it("maps common header aliases and coerces quantity", async () => {
    const csv = [
      "Part No,Description,Qty",
      "LIC-ATP-1YR,\"NGFW-1000 Advanced Threat Protection, 1-year\",2",
      "SFP-10G,10G SFP+ module,8",
    ].join("\n");

    const { rows, skipped } = await parseBoqBuffer(Buffer.from(csv), "boq.csv");

    expect(skipped).toBe(0);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      partNumber: "LIC-ATP-1YR",
      quantity: 2,
    });
    expect(rows[1].quantity).toBe(8);
  });

  it("skips rows with no description but keeps a running count", async () => {
    const csv = ["description,qty", "Real item,1", ",5", "Another,2"].join("\n");
    const { rows, skipped } = await parseBoqBuffer(Buffer.from(csv), "x.csv");
    expect(rows.map((r) => r.description)).toEqual(["Real item", "Another"]);
    expect(skipped).toBe(1);
  });

  it("defaults qty to 1 when the column is absent", async () => {
    const csv = ["Description", "Widget"].join("\n");
    const { rows } = await parseBoqBuffer(Buffer.from(csv), "x.csv");
    expect(rows[0]).toMatchObject({ description: "Widget", quantity: 1 });
  });
});
