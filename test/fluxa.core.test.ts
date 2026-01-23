import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { Fluxa } from "../src/core/Fluxa";

import { MockBroadcastChannel } from "./helpers";

type Events = {
	"counter:inc": { amount: number };
	"ui:click": { id: string };
};

describe("Fluxa core: emit/on/off + scope + debugger", () => {
	beforeEach(() => {
		// fresh BC registry for each test
		(
			globalThis as unknown as {
				BroadcastChannel: new (name: string) => BroadcastChannel;
			}
		).BroadcastChannel = MockBroadcastChannel as unknown as new (
			name: string,
		) => BroadcastChannel;
		MockBroadcastChannel.channels.clear();
	});

	afterEach(() => {
		delete (globalThis as unknown as { BroadcastChannel?: unknown })
			.BroadcastChannel;
	});

	it("emits and receives via memory transport by default", () => {
		const bus = new Fluxa<Events>({ context: { id: "ctx-A" } });
		const calls: Array<{
			payload: Events["counter:inc"];
			// eslint-disable-next-line @typescript-eslint/consistent-type-imports
			meta: import("../src/core/types").FluxaEventMeta;
		}> = [];
		const off = bus.on("counter:inc", (payload, meta) =>
			calls.push({ payload, meta }),
		);

		bus.emit(
			"counter:inc",
			{ amount: 2 },
			{ traceId: "t1", id: "custom-id", timestamp: Date.now() },
		);

		expect(calls).toHaveLength(1);
		expect(calls[0].payload.amount).toBe(2);
		expect(calls[0].meta.id).toBeDefined();
		expect(calls[0].meta.timestamp).toBeTypeOf("number");
		expect(calls[0].meta.path).toEqual(["ctx-A"]);
		expect(calls[0].meta.traceId).toBe("t1");

		off();

		bus.emit("counter:inc", { amount: 3 });
		expect(calls).toHaveLength(1);
	});

	it("scope() prefixes event names", () => {
		const bus = new Fluxa<Events>({ context: { id: "ctx-A" } });
		const ui = bus.scope("ui");
		let clicks = 0;
		const off = ui.on("click", () => clicks++);
		ui.emit("click", { id: "b1" });
		expect(clicks).toBe(1);
		off();
		ui.emit("click", { id: "b2" });
		expect(clicks).toBe(1);
	});

	it("debugger records local/out/in directions", () => {
		// two buses, tab propagation
		const a = new Fluxa<Events>({
			debug: true,
			propagation: { memory: true, tab: true },
			context: { id: "A" },
			tab: { channel: "fluxa" },
		});
		const b = new Fluxa<Events>({
			debug: true,
			propagation: { memory: true, tab: true },
			context: { id: "B" },
			tab: { channel: "fluxa" },
		});

		let received = 0;
		b.on("counter:inc", () => received++);

		a.emit("counter:inc", { amount: 1 });

		// a should have local + out logs; b should have in
		const aDirs = a.getEventLog().map((e) => e.direction);
		const bDirs = b.getEventLog().map((e) => e.direction);
		expect(aDirs).toContain("local");
		expect(aDirs).toContain("out");
		expect(bDirs).toContain("in");
		expect(received).toBe(1);
	});

	it("dedupes emits by meta.id", () => {
		const bus = new Fluxa<Events>({ context: { id: "ctx-A" } });
		const calls: Array<{
			payload: Events["counter:inc"];
			// eslint-disable-next-line @typescript-eslint/consistent-type-imports
			meta: import("../src/core/types").FluxaEventMeta;
		}> = [];
		bus.on("counter:inc", (payload, meta) => calls.push({ payload, meta }));

		const meta = { id: "evt-1", timestamp: 1 };
		bus.emit("counter:inc", { amount: 1 }, meta);
		bus.emit("counter:inc", { amount: 2 }, meta);

		expect(calls).toHaveLength(1);
		expect(calls[0].payload.amount).toBe(1);
	});
});
