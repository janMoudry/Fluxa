import type {
	FluxaEventMap,
	FluxaEventMeta,
	FluxaFilter,
	FluxaHandler,
} from "./types";

type Entry = {
	handler: FluxaHandler<unknown>;
	filter?: FluxaFilter;
};

export class EventBus<Events extends FluxaEventMap> {
	private listeners = new Map<keyof Events, Set<Entry>>();

	on<K extends keyof Events>(
		event: K,
		handler: FluxaHandler<Events[K]>,
		filter?: FluxaFilter,
	) {
		if (!this.listeners.has(event)) this.listeners.set(event, new Set());
		this.listeners
			.get(event)!
			.add({ handler: handler as FluxaHandler<unknown>, filter });
		return () => this.off(event, handler);
	}

	off<K extends keyof Events>(event: K, handler: FluxaHandler<Events[K]>) {
		const set = this.listeners.get(event);
		if (!set) return;
		for (const entry of set) {
			if (
				entry.handler === (handler as unknown as FluxaHandler<unknown>)
			) {
				set.delete(entry);
				break;
			}
		}
	}

	emit<K extends keyof Events>(
		event: K,
		data: Events[K],
		meta: FluxaEventMeta,
	) {
		const set = this.listeners.get(event);
		if (!set) return;
		for (const { handler, filter } of set) {
			if (!filter || filter(meta)) {
				(handler as FluxaHandler<Events[K]>)(data, meta);
			}
		}
	}
}
