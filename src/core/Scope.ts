import type {
	FluxaEventMap,
	FluxaHandler,
	FluxaFilter,
	FluxaEventMeta,
} from "./types";
import type { Fluxa } from "./Fluxa";

type StripPrefix<
	K extends string,
	P extends string,
> = K extends `${P}:${infer R}` ? R : never;
type PrefixedKeys<E extends FluxaEventMap, P extends string> =
	Extract<keyof E, `${P}:${string}`> extends infer Keys
		? Keys extends string
			? Keys
			: never
		: never;
type EventsForPrefix<E extends FluxaEventMap, P extends string> = {
	[K in PrefixedKeys<E, P> as StripPrefix<K, P>]: E[K];
};

export class Scope<Events extends FluxaEventMap, P extends string> {
	constructor(
		private readonly bus: Fluxa<Events>,
		private readonly prefix: P,
	) {}

	emit<K extends keyof EventsForPrefix<Events, P>>(
		event: K,
		data: EventsForPrefix<Events, P>[K],
		meta?: FluxaEventMeta,
	) {
		const full = `${this.prefix}:${String(event)}` as PrefixedKeys<
			Events,
			P
		>;
		this.bus.emit(full, data as unknown as Events[typeof full], meta);
	}

	on<K extends keyof EventsForPrefix<Events, P>>(
		event: K,
		handler: FluxaHandler<EventsForPrefix<Events, P>[K]>,
		filter?: FluxaFilter,
	) {
		const full = `${this.prefix}:${String(event)}` as PrefixedKeys<
			Events,
			P
		>;
		return this.bus.on(
			full,
			handler as unknown as FluxaHandler<Events[typeof full]>,
			filter,
		);
	}

	off<K extends keyof EventsForPrefix<Events, P>>(
		event: K,
		handler: FluxaHandler<EventsForPrefix<Events, P>[K]>,
	) {
		const full = `${this.prefix}:${String(event)}` as PrefixedKeys<
			Events,
			P
		>;
		this.bus.off(
			full,
			handler as unknown as FluxaHandler<Events[typeof full]>,
		);
	}
}
