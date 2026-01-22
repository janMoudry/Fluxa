import { describe, it, expect } from "vitest";

import { safeSerialize, safeParse } from "../src/utils/serialize";
import { createMeta } from "../src/utils/meta";

describe("Utils", () => {
  it("safeSerialize handles unserializable values", () => {
    const val: { a: number; self?: unknown } = { a: 1 };
    val.self = val; // circular
    const s = safeSerialize(val);
    expect(typeof s).toBe("string");
    const parsed = JSON.parse(s);
    expect(parsed.__fluxa_unserializable__).toBe(true);
  });

  it("safeParse returns null for non-strings and invalid JSON", () => {
    expect(safeParse(123)).toBeNull();
    expect(safeParse("{ invalid")).toBeNull();
    expect(safeParse('{"a":1}')).toEqual({ a: 1 });
  });

  it("createMeta merges extra and sets defaults", () => {
    const m = createMeta({
      sourceId: "x",
      path: ["p"],
      extra: { hello: "world" },
    });
    expect(m.id).toBeDefined();
    expect(m.timestamp).toBeTypeOf("number");
    expect(m.sourceId).toBe("x");
    expect(m.path).toEqual(["p"]);
    expect((m as { hello?: unknown }).hello).toBe("world");
  });
});
