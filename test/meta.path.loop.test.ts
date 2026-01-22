import { describe, it, expect, beforeEach } from "vitest";

import { Fluxa } from "../src/core/Fluxa";

import { MockBroadcastChannel } from "./helpers";

type Events = {
  ping: { n: number };
};

describe("Meta path and loop prevention", () => {
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

  it("appends context id on receive and prevents re-entry loops", () => {
    const a = new Fluxa<Events>({
      propagation: { memory: true, tab: true },
      context: { id: "A" },
      tab: { channel: "fluxa" },
    });
    const b = new Fluxa<Events>({
      propagation: { memory: true, tab: true },
      context: { id: "B" },
      tab: { channel: "fluxa" },
    });

    // B handler should see path appended with B
    let bMetaPath: string[] | undefined;
    b.on("ping", (_d, meta) => {
      bMetaPath = meta.path;
    });

    a.emit("ping", { n: 1 });
    expect(bMetaPath).toEqual(["A", "B"]);

    // Inject a message that already traversed A and B back into A → should be ignored by A
    const envelope = {
      type: "fluxa:event",
      event: "ping",
      payload: {
        data: { n: 2 },
        meta: { id: "m1", timestamp: Date.now(), path: ["A", "B"] },
      },
    };
    let aCalled = 0;
    a.on("ping", () => aCalled++);
    MockBroadcastChannel.inject("fluxa", JSON.stringify(envelope));
    expect(aCalled).toBe(0);
  });
});
