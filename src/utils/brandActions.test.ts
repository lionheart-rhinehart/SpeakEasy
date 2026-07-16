import { describe, it, expect } from "vitest";
import {
  brandActionId,
  isBrandActionId,
  brandActionName,
  docToAction,
  brandDocsToActions,
} from "./brandActions";
import type { BrandDocMeta } from "../types";

function meta(over: Partial<BrandDocMeta> = {}): BrandDocMeta {
  return {
    id: "abc-123",
    name: "Testimonials",
    brand: "Acme",
    hotkey: "",
    bytes: 42,
    created_at: "2026-07-15T00:00:00Z",
    updated_at: "2026-07-15T00:00:00Z",
    ...over,
  };
}

describe("brandActions synthesis", () => {
  it("namespaces the action name under the 'paste' verb (§5d)", () => {
    expect(brandActionName("Testimonials")).toBe("paste Testimonials");
  });

  it("prefixes ids so they never collide with webhook/prompt action ids", () => {
    expect(brandActionId("abc-123")).toBe("brand:abc-123");
    expect(isBrandActionId("brand:abc-123")).toBe(true);
    expect(isBrandActionId("some-webhook-id")).toBe(false);
  });

  it("synthesizes a brand_paste Action carrying the doc id and no hotkey by default", () => {
    const a = docToAction(meta());
    expect(a.kind).toBe("brand_paste");
    expect(a.id).toBe("brand:abc-123");
    expect(a.name).toBe("paste Testimonials");
    expect(a.brandDocId).toBe("abc-123");
    expect(a.hotkey).toBe("");
    expect(a.enabled).toBe(true);
    // No body is ever carried on the action — it is lazy-loaded at paste time.
    expect("text" in a).toBe(false);
  });

  it("carries an optional per-doc hotkey when set", () => {
    const a = docToAction(meta({ hotkey: "Control+Shift+1" }));
    expect(a.hotkey).toBe("Control+Shift+1");
  });

  it("maps a list of docs to a list of actions", () => {
    const actions = brandDocsToActions([
      meta({ id: "1", name: "One" }),
      meta({ id: "2", name: "Two" }),
    ]);
    expect(actions.map((a) => a.name)).toEqual(["paste One", "paste Two"]);
    expect(actions.map((a) => a.id)).toEqual(["brand:1", "brand:2"]);
  });
});
