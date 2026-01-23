export type FluxaEventMap = Record<string, unknown>;

export type FluxaPropagation = {
	memory?: boolean;
	tab?: boolean;
	frame?: boolean;
};

export type FluxaFrameRole = "host" | "child";

export type FluxaFrameConfig = {
	role?: FluxaFrameRole;
	allowedOrigins?: string[];
	channel?: string;
};

export type FluxaConfig = {
	debug?: boolean;
	propagation?: FluxaPropagation;
	frame?: FluxaFrameConfig;
	tab?: {
		channel?: string;
	};
	context?: {
		id?: string;
		name?: string;
	};
	history?: {
		enabled?: boolean;
		limit?: number;
	};
};

export type FluxaEventMeta = {
	id: string;
	timestamp: number;
	sourceId?: string;
	sourceLocationFile?: string;
	traceId?: string;
	path?: string[];
	propagated?: Record<string, boolean>;
	replayed?: boolean;
	[key: string]: unknown;
};

export type FluxaEnvelope<K extends string = string, P = unknown> = {
	type: "fluxa:event";
	event: K;
	payload: {
		data: P;
		meta: FluxaEventMeta;
	};
};

export type FluxaHandler<P> = (data: P, meta: FluxaEventMeta) => void;

export type FluxaFilter = (meta: FluxaEventMeta) => boolean;

export type FluxaStoreBridge = {
	receive(envelope: FluxaEnvelope): void;
};
