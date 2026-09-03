import { describe, it, expect } from "vitest";
import { parseBoqBuffer } from "./boq-import";

describe("parseBoqBuffer (CSV)", () => {
  it("maps common header aliases and coerces numbers", async () => {
    const csv = [
      "Part No,Description,Qty,Unit,Unit Price",
      "FW-1000,Perimeter firewall HA pair,2,ea,\"$18,500.00\"",
      "SFP-10G,10G SFP+ module,8,ea,120",
    ].join("\n");

    const { rows, skipped } = await parseBoqBuffer(Buffer.from(csv), "boq.csv");

    expect(skipped).toBe(0);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      partNumber: "FW-1000",
      description: "Perimeter firewall HA pair",
      quantity: 2,
      unit: "ea",
      unitPrice: 18500,
    });
    expect(rows[1].unitPrice).toBe(120);
  });

  it("skips rows with no description but keeps a running count", async () => {
    const csv = ["description,qty", "Real item,1", ",5", "Another,2"].join("\n");
    const { rows, skipped } = await parseBoqBuffer(Buffer.from(csv), "x.csv");
    expect(rows.map((r) => r.description)).toEqual(["Real item", "Another"]);
    expect(skipped).toBe(1);
  });

  it("defaults qty to 1 and unit to 'ea' when columns are absent", async () => {
    const csv = ["Description", "Widget"].join("\n");
    const { rows } = await parseBoqBuffer(Buffer.from(csv), "x.csv");
    expect(rows[0]).toMatchObject({ description: "Widget", quantity: 1, unit: "ea", unitPrice: 0 });
  });
});
