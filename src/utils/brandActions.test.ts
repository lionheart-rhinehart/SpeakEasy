import { describe, it, expect } from "vitest";
import {
  brandActionId,
  isBrandActionId,
  brandActionName,
  docToAction,
  brandDocsToActions,
  spokenSatisfiesBrandAndName,
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
  it("namespaces under the 'paste' verb and scopes by brand (§5d)", () => {
    // Brand set → brand is part of the spoken phrase (prevents cross-brand collisions).
    expect(brandActionName({ name: "Testimonials", brand: "Athletic Acceleration" })).toBe(
      "paste Athletic Acceleration Testimonials"
    );
    // No brand → falls back to bare "paste {name}".
    expect(brandActionName({ name: "Testimonials", brand: "" })).toBe("paste Testimonials");
    expect(brandActionName({ name: "Testimonials" })).toBe("paste Testimonials");
  });

  it("requires BOTH brand and document name to be spoken (the formula)", () => {
    const BRAND = "Athletic Acceleration";
    const NAME = "Testimonials";
    // Full brand + name → eligible.
    expect(spokenSatisfiesBrandAndName("paste athletic acceleration testimonials", BRAND, NAME)).toBe(true);
    // Bare doc name (missing brand) → NOT eligible (the bug the owner caught).
    expect(spokenSatisfiesBrandAndName("testimonials", BRAND, NAME)).toBe(false);
    expect(spokenSatisfiesBrandAndName("paste testimonials", BRAND, NAME)).toBe(false);
    // Brand only (missing doc name) → NOT eligible.
    expect(spokenSatisfiesBrandAndName("athletic acceleration", BRAND, NAME)).toBe(false);
    // A dropped/mangled word → NOT eligible (tolerant fails safe to the review window).
    expect(spokenSatisfiesBrandAndName("acceleration testimonials", BRAND, NAME)).toBe(false);
    // Order-independent + punctuation/case normalized.
    expect(spokenSatisfiesBrandAndName("Testimonials — Athletic-Acceleration!", BRAND, NAME)).toBe(true);
    // A doc with no brand is gated on its name only.
    expect(spokenSatisfiesBrandAndName("testimonials", "", NAME)).toBe(true);
    expect(spokenSatisfiesBrandAndName("something else", "", NAME)).toBe(false);
  });

  it("keeps same-named docs in different brands distinct", () => {
    const a = docToAction(meta({ id: "1", name: "Testimonials", brand: "Castile Academy" }));
    const b = docToAction(meta({ id: "2", name: "Testimonials", brand: "Batty Performance" }));
    expect(a.name).toBe("paste Castile Academy Testimonials");
    expect(b.name).toBe("paste Batty Performance Testimonials");
    expect(a.name).not.toBe(b.name);
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
    expect(a.name).toBe("paste Acme Testimonials");
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
      meta({ id: "1", name: "One", brand: "" }),
      meta({ id: "2", name: "Two", brand: "" }),
    ]);
    expect(actions.map((a) => a.name)).toEqual(["paste One", "paste Two"]);
    expect(actions.map((a) => a.id)).toEqual(["brand:1", "brand:2"]);
  });
});
