import { describe, it, expect } from "vitest";
import {
  sectionHtmlBody,
  proseMirrorDoc,
  boqItemInput,
  boqCatalogItemInput,
} from "./validators";

describe("sectionHtmlBody", () => {
  it("accepts and trims an HTML string", () => {
    expect(sectionHtmlBody.parse("  <p>Hello {{customer.name}}</p>  ")).toBe(
      "<p>Hello {{customer.name}}</p>",
    );
  });

  it("accepts an empty body", () => {
    expect(sectionHtmlBody.parse("")).toBe("");
  });

  it("rejects a non-string and an oversized payload", () => {
    expect(sectionHtmlBody.safeParse({ type: "doc" }).success).toBe(false);
    expect(sectionHtmlBody.safeParse("x".repeat(500_001)).success).toBe(false);
  });
});

describe("proseMirrorDoc (legacy, migration only)", () => {
  it("still parses an old doc into a plain clone", () => {
    const input = { type: "doc" as const, content: [{ type: "paragraph" }] };
    const out = proseMirrorDoc.parse(input);
    expect(out).toEqual(input);
    expect(out).not.toBe(input);
  });
});

describe("boqCatalogItemInput", () => {
  it("trims, defaults partNumber to '', requires a description", () => {
    expect(
      boqCatalogItemInput.parse({ partNumber: "  A-1 ", description: "  Widget " }),
    ).toEqual({ partNumber: "A-1", description: "Widget" });
    expect(boqCatalogItemInput.parse({ description: "Widget" }).partNumber).toBe("");
    expect(boqCatalogItemInput.safeParse({ description: "   " }).success).toBe(false);
    expect(boqCatalogItemInput.safeParse({}).success).toBe(false);
  });
});

describe("boqItemInput", () => {
  it("coerces quantity to a positive integer, defaulting to 1", () => {
    expect(boqItemInput.parse({ description: "x", quantity: "3" }).quantity).toBe(3);
    expect(boqItemInput.parse({ description: "x" }).quantity).toBe(1);
    expect(boqItemInput.safeParse({ description: "x", quantity: 0 }).success).toBe(false);
  });
});
