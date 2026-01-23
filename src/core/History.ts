import type { FluxaEventMap, FluxaEventMeta } from "./types";

type HistoryConfig = {
	limit: number;
};

export class History<Events extends FluxaEventMap = FluxaEventMap> {
	private readonly limit: number;
	private records = new Map<
		string,
		{
			event: keyof Events;
			data: { payload: Events[keyof Events]; meta: FluxaEventMeta };
		}
	>();
	private order: string[] = [];

	private static getId(meta: FluxaEventMeta) {
		return meta.id;
	}

	private static buildRecord<Events extends FluxaEventMap>(
		event: keyof Events,
		payload: Events[keyof Events],
		meta: FluxaEventMeta,
	) {
		return { event, data: { payload, meta } };
	}

	constructor(options: HistoryConfig) {
		this.limit = options.limit;
	}

	set<K extends keyof Events>(
		event: K,
		{ payload, meta }: { payload: Events[K]; meta: FluxaEventMeta },
	) {
		const id = History.getId(meta);
		if (this.records.has(id)) {
			this.records.set(
				id,
				History.buildRecord<Events>(event, payload, meta),
			);
			const index = this.order.indexOf(id);
			if (index !== -1) {
				this.order.splice(index, 1);
			}
			this.order.push(id);
			return;
		}

		this.records.set(id, History.buildRecord<Events>(event, payload, meta));
		this.order.push(id);

		while (this.order.length > this.limit) {
			const oldest = this.order.shift();
			if (oldest !== undefined) {
				this.records.delete(oldest);
			}
		}
	}

	getAll() {
		return this.order
			.map((id) => this.records.get(id))
			.filter(
				(record): record is NonNullable<typeof record> =>
					record !== undefined,
			);
	}

	clear() {
		this.records.clear();
		this.order = [];
	}

	get(id: string) {
		return this.records.has(id);
	}

	replay(
		handler: (
			event: keyof Events,
			data: {
				payload: Events[keyof Events];
				meta: FluxaEventMeta;
			},
		) => void,
	) {
		for (const id of this.order) {
			const record = this.records.get(id);
			if (!record) {
				continue;
			}
			handler(record.event, {
				payload: record.data.payload,
				meta: record.data.meta,
			});
		}
	}
}
