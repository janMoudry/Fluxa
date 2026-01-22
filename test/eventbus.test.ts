import { describe, it, expect } from "vitest";

import { EventBus } from "../src/core/EventBus";
import type { FluxaEventMeta } from "../src/core/types";

type Events = {
  a: { v: number };
  b: string;
};

describe("EventBus", () => {
  it("registers and emits to a single handler", () => {
    const bus = new EventBus<Events>();
    const calls: Array<{ d: Events["a"]; m: FluxaEventMeta }> = [];
    const off = bus.on("a", (d, m) => calls.push({ d, m }));

    bus.emit("a", { v: 1 }, { id: "x", timestamp: Date.now() });
    expect(calls).toHaveLength(1);
    expect(calls[0].d.v).toBe(1);

    off();
    bus.emit("a", { v: 2 }, { id: "y", timestamp: Date.now() });
    expect(calls).toHaveLength(1);
  });

  it("supports multiple handlers and off()", () => {
    const bus = new EventBus<Events>();
    let h1 = 0;
    let h2 = 0;
    const fn1 = () => h1++;
    const fn2 = () => h2++;
    const off1 = bus.on("b", fn1);
    const off2 = bus.on("b", fn2);
    bus.emit("b", "z", { id: "1", timestamp: Date.now() });
    expect(h1).toBe(1);
    expect(h2).toBe(1);
    off1();
    bus.emit("b", "z", { id: "2", timestamp: Date.now() });
    expect(h1).toBe(1);
    expect(h2).toBe(2);
    off2();
    bus.emit("b", "z", { id: "3", timestamp: Date.now() });
    expect(h2).toBe(2);
  });

  it("respects filters per handler", () => {
    const bus = new EventBus<Events>();
    let count = 0;
    bus.on(
      "a",
      () => count++,
      (meta) => (meta as { ok?: boolean }).ok === true,
    );
    bus.emit("a", { v: 1 }, { id: "1", timestamp: Date.now(), ok: false });
    bus.emit("a", { v: 2 }, { id: "2", timestamp: Date.now(), ok: true });
    expect(count).toBe(1);
  });

  it("does nothing if there are no listeners", () => {
    const bus = new EventBus<Events>();
    expect(() =>
      bus.emit("a", { v: 1 }, { id: "x", timestamp: Date.now() }),
    ).not.toThrow();
  });
});
