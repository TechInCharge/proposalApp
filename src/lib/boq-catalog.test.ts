import { describe, it, expect } from "vitest";
import { normaliseBoqCatalogRows } from "./boq-catalog";

describe("normaliseBoqCatalogRows", () => {
  it("trims fields and drops rows without a description", () => {
    expect(
      normaliseBoqCatalogRows([
        { partNumber: "  FW-1 ", description: "  Firewall  " },
        { partNumber: "X", description: "   " },
        { description: "" },
        { partNumber: "", description: "Install day" },
      ]),
    ).toEqual([
      { partNumber: "FW-1", description: "Firewall" },
      { partNumber: "", description: "Install day" },
    ]);
  });

  it("de-duplicates case-insensitively on (partNumber, description)", () => {
    expect(
      normaliseBoqCatalogRows([
        { partNumber: "FW-1", description: "Firewall" },
        { partNumber: "fw-1", description: "firewall" },
        { partNumber: "FW-1", description: "Firewall XL" },
      ]),
    ).toEqual([
      { partNumber: "FW-1", description: "Firewall" },
      { partNumber: "FW-1", description: "Firewall XL" },
    ]);
  });

  it("keeps same description under different part numbers", () => {
    expect(
      normaliseBoqCatalogRows([
        { partNumber: "A", description: "Cable" },
        { partNumber: "B", description: "Cable" },
        { description: "Cable" },
      ]),
    ).toEqual([
      { partNumber: "A", description: "Cable" },
      { partNumber: "B", description: "Cable" },
      { partNumber: "", description: "Cable" },
    ]);
  });
});
