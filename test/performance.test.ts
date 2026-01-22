import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { Fluxa } from "../src/core/Fluxa";
import { EventBus } from "../src/core/EventBus";
import type { FluxaEventMeta } from "../src/core/types";

import { MockBroadcastChannel, FakeWindow } from "./helpers";

describe("Performance & Reliability", () => {
  describe("EventBus burst delivery", () => {
    it("delivers 10k events without loss and under time limit", () => {
      type E = { tick: number };
      const bus = new EventBus<E>();
      const N = 10_000;
      let got = 0;
      let last = -1;
      const meta: FluxaEventMeta = { id: "m", timestamp: Date.now() };
      bus.on("tick", (n) => {
        got++;
        last = n;
      });
      const t0 = Date.now();
      for (let i = 0; i < N; i++) bus.emit("tick", i, meta);
      const dt = Date.now() - t0;
      expect(got).toBe(N);
      expect(last).toBe(N - 1);
      expect(dt).toBeLessThan(3000);
    });
  });

  describe("Fluxa memory transport burst", () => {
    it("delivers 5k local events without loss and under time limit", () => {
      type E = { ping: { n: number } };
      const a = new Fluxa<E>({
        propagation: { memory: true },
        context: { id: "A" },
      });
      const N = 5_000;
      let got = 0;
      let last = -1;
      a.on("ping", (d) => {
        got++;
        last = d.n;
      });
      const t0 = Date.now();
      for (let i = 0; i < N; i++) a.emit("ping", { n: i });
      const dt = Date.now() - t0;
      expect(got).toBe(N);
      expect(last).toBe(N - 1);
      expect(dt).toBeLessThan(3000);
    });
  });

  describe("BroadcastChannel (tab) burst", () => {
    beforeEach(() => {
      (
        globalThis as unknown as {
          BroadcastChannel: new (name: string) => BroadcastChannel;
        }
      ).BroadcastChannel = MockBroadcastChannel as unknown as new (
        name: string,
      ) => BroadcastChannel;
      MockBroadcastChannel.channels.clear();
    });

    it("delivers 2k events cross-tab without loss and under time limit", () => {
      type E = { hello: { x: number } };
      const a = new Fluxa<E>({
        propagation: { memory: false, tab: true },
        context: { id: "A" },
        tab: { channel: "perf-ch" },
      });
      const b = new Fluxa<E>({
        propagation: { memory: false, tab: true },
        context: { id: "B" },
        tab: { channel: "perf-ch" },
      });
      const N = 2_000;
      let got = 0;
      let last = -1;
      b.on("hello", (d) => {
        got++;
        last = d.x;
      });
      const t0 = Date.now();
      for (let i = 0; i < N; i++) a.emit("hello", { x: i });
      const dt = Date.now() - t0;
      expect(got).toBe(N);
      expect(last).toBe(N - 1);
      expect(dt).toBeLessThan(4000);
    });
  });

  describe("PostMessage (frame) burst", () => {
    const winA = new FakeWindow("https://a.example", "https://a.example/");
    const winB = new FakeWindow("https://b.example", "https://b.example/");
    const saveWindow = (globalThis as unknown as { window?: Window }).window;

    beforeEach(() => {
      winA.resetHandlers();
      winB.resetHandlers();
    });

    afterEach(() => {
      (globalThis as unknown as { window?: Window }).window = saveWindow;
    });

    it("delivers 1k events cross-frame without loss and under time limit", () => {
      type E = { ping: { n: number } };
      (globalThis as unknown as { window?: Window }).window =
        winA as unknown as Window;
      const a = new Fluxa<E>({
        propagation: { frame: true },
        context: { id: "A" },
        frame: { allowedOrigins: ["*"], channel: "perf-pm" },
      });
      (globalThis as unknown as { window?: Window }).window =
        winB as unknown as Window;
      const b = new Fluxa<E>({
        propagation: { frame: true },
        context: { id: "B" },
        frame: { allowedOrigins: ["*"], channel: "perf-pm" },
      });
      (globalThis as unknown as { window?: Window }).window =
        winA as unknown as Window;
      a.registerFramePeer("b", winB as unknown as Window, "*");

      const N = 1_000;
      let got = 0;
      let last = -1;
      (globalThis as unknown as { window?: Window }).window =
        winB as unknown as Window;
      b.on("ping", (d) => {
        got++;
        last = d.n;
      });

      (globalThis as unknown as { window?: Window }).window =
        winA as unknown as Window;
      const t0 = Date.now();
      for (let i = 0; i < N; i++) a.emit("ping", { n: i });
      const dt = Date.now() - t0;

      expect(got).toBe(N);
      expect(last).toBe(N - 1);
      expect(dt).toBeLessThan(5000);
    });
  });
});
