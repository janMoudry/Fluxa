import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { Fluxa } from "../src/core/Fluxa";

import { FakeWindow } from "./helpers";

type Events = { ping: { n: number } };

describe("PostMessageTransport", () => {
  const winA = new FakeWindow("https://a.example", "https://a.example/");
  const winB = new FakeWindow("https://b.example", "https://b.example/");
  const saveWindow = (globalThis as unknown as { window?: Window }).window;

  beforeEach(() => {
    // reset handlers
    winA.resetHandlers();
    winB.resetHandlers();
  });

  afterEach(() => {
    (globalThis as unknown as { window?: Window }).window = saveWindow;
  });

  it("delivers messages to registered peers and respects origins", () => {
    // Bus A runs in window A
    (globalThis as unknown as { window?: Window }).window =
      winA as unknown as Window;
    const a = new Fluxa<Events>({
      propagation: { frame: true },
      context: { id: "A" },
      frame: { allowedOrigins: ["*"], channel: "fluxa" },
    });

    // Bus B runs in window B
    (globalThis as unknown as { window?: Window }).window =
      winB as unknown as Window;
    const b = new Fluxa<Events>({
      propagation: { frame: true },
      context: { id: "B" },
      frame: { allowedOrigins: ["https://a.example"], channel: "fluxa" },
    });

    // Register B as peer of A
    (globalThis as unknown as { window?: Window }).window =
      winA as unknown as Window;
    a.registerFramePeer("b", winB as unknown as Window, "https://b.example");

    let got = 0;
    (globalThis as unknown as { window?: Window }).window =
      winB as unknown as Window;
    b.on("ping", (d, meta) => {
      expect(d.n).toBe(5);
      expect(meta.path).toEqual(["A", "B"]);
      got++;
    });

    (globalThis as unknown as { window?: Window }).window =
      winA as unknown as Window;
    a.emit("ping", { n: 5 });
    expect(got).toBe(1);

    // Now restrict B to refuse origin a.example
    (globalThis as unknown as { window?: Window }).window =
      winB as unknown as Window;
    const b2 = new Fluxa<Events>({
      propagation: { frame: true },
      context: { id: "B2" },
      frame: { allowedOrigins: ["https://other.example"], channel: "fluxa" },
    });
    (globalThis as unknown as { window?: Window }).window =
      winA as unknown as Window;
    a.registerFramePeer("b2", winB as unknown as Window, "https://b.example");

    let got2 = 0;
    (globalThis as unknown as { window?: Window }).window =
      winB as unknown as Window;
    b2.on("ping", () => got2++);
    (globalThis as unknown as { window?: Window }).window =
      winA as unknown as Window;
    a.emit("ping", { n: 6 });
    expect(got2).toBe(0);
  });

  it("unregisters peers and stops delivery", () => {
    (globalThis as unknown as { window?: Window }).window =
      winA as unknown as Window;
    const a = new Fluxa<Events>({
      propagation: { frame: true },
      context: { id: "A" },
      frame: { allowedOrigins: ["*"] },
    });
    (globalThis as unknown as { window?: Window }).window =
      winB as unknown as Window;
    const b = new Fluxa<Events>({
      propagation: { frame: true },
      context: { id: "B" },
      frame: { allowedOrigins: ["*"] },
    });
    (globalThis as unknown as { window?: Window }).window =
      winA as unknown as Window;
    a.registerFramePeer("b", winB as unknown as Window, "*");

    let got = 0;
    (globalThis as unknown as { window?: Window }).window =
      winB as unknown as Window;
    b.on("ping", () => got++);

    (globalThis as unknown as { window?: Window }).window =
      winA as unknown as Window;
    a.emit("ping", { n: 1 });
    expect(got).toBe(1);

    a.unregisterFramePeer("b");
    a.emit("ping", { n: 2 });
    expect(got).toBe(1);
  });
});
