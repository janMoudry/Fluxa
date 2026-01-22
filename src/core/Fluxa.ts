import { Debugger } from "../utils/debugger";
import { createMeta } from "../utils/meta";
import { MemoryTransport } from "../transports/MemoryTransport";
import { BroadcastChannelTransport } from "../transports/BroadcastChannelTransport";
import { PostMessageTransport } from "../transports/PostMessageTransport";
import type { Transport } from "../transports/Transport";

import { EventBus } from "./EventBus";
import { Scope } from "./Scope";
import type {
  FluxaConfig,
  FluxaEnvelope,
  FluxaEventMap,
  FluxaFilter,
  FluxaHandler,
  FluxaStoreBridge,
} from "./types";

export class Fluxa<Events extends FluxaEventMap = FluxaEventMap> {
  private initialized = false;

  private readonly bus = new EventBus<Events>();
  private readonly debugger = new Debugger();

  private readonly contextId: string;
  private readonly contextName: string;

  private readonly propagation: Required<
    NonNullable<FluxaConfig["propagation"]>
  >;
  private readonly historyEnabled: boolean;
  private readonly historyLimit: number;

  private storeBridge: FluxaStoreBridge | null = null;

  private transports: Transport[] = [];
  private memoryTransport: MemoryTransport | null = null;
  private tabTransport: BroadcastChannelTransport | null = null;
  private frameTransport: PostMessageTransport | null = null;

  constructor(private readonly options: FluxaConfig = {}) {
    this.contextId = options.context?.id ?? this.fallbackContextId();
    this.contextName = options.context?.name ?? "default";

    this.propagation = {
      memory: options.propagation?.memory ?? true,
      tab: options.propagation?.tab ?? false,
      frame: options.propagation?.frame ?? false,
    };

    this.historyEnabled = options.history?.enabled ?? true;
    this.historyLimit = options.history?.limit ?? 200;

    if (options.debug) {
      this.debugger.enable(this.historyLimit);
    }

    this.setupTransports();
    this.initialized = true;
  }

  scope<P extends string>(prefix: P) {
    this.ensureInitialized();
    return new Scope<Events, P>(this, prefix);
  }

  attachStore(bridge: FluxaStoreBridge) {
    this.storeBridge = bridge;
  }

  enableDebug(limit?: number) {
    this.debugger.enable(limit ?? this.historyLimit);
  }

  getEventLog() {
    return this.debugger.getLogs();
  }

  destroy() {
    for (const t of this.transports) t.stop();
    this.transports = [];
    this.memoryTransport = null;
    this.tabTransport = null;
    this.frameTransport = null;
    this.initialized = false;
  }

  emit<K extends keyof Events>(
    event: K,
    data: Events[K],
    meta?: Record<string, unknown>,
  ) {
    this.ensureInitialized();

    const eventName = String(event);

    const baseMeta = createMeta({
      sourceId:
        typeof window !== "undefined" ? window.location.href : undefined,
      sourceLocationFile: meta?.sourceLocationFile as string | undefined,
      path: [this.contextId],
      extra: meta,
    });

    const envelope: FluxaEnvelope = {
      type: "fluxa:event",
      event: eventName,
      payload: {
        data,
        meta: baseMeta,
      },
    };

    if (this.propagation.memory && this.memoryTransport) {
      this.debugger.push({ direction: "local", envelope });
      this.memoryTransport.send(envelope);
    }

    if (this.propagation.tab && this.tabTransport) {
      this.debugger.push({ direction: "out", envelope });
      this.tabTransport.send(envelope);
    }

    if (this.propagation.frame && this.frameTransport) {
      this.debugger.push({ direction: "out", envelope });
      this.frameTransport.send(envelope);
    }
  }

  on<K extends keyof Events>(
    event: K,
    handler: FluxaHandler<Events[K]>,
    filter?: FluxaFilter,
  ) {
    this.ensureInitialized();
    return this.bus.on(event, handler, filter);
  }

  off<K extends keyof Events>(event: K, handler: FluxaHandler<Events[K]>) {
    this.ensureInitialized();
    this.bus.off(event, handler);
  }

  registerFramePeer(id: string, targetWindow: Window, origin: string) {
    this.ensureInitialized();
    if (!this.frameTransport) return;
    this.frameTransport.registerPeer(id, targetWindow, origin);
  }

  unregisterFramePeer(id: string) {
    this.ensureInitialized();
    if (!this.frameTransport) return;
    this.frameTransport.unregisterPeer(id);
  }

  private setupTransports() {
    if (this.propagation.memory) {
      this.memoryTransport = new MemoryTransport();
      this.attachTransport(this.memoryTransport);
    }

    if (this.propagation.tab) {
      const channel = this.options.tab?.channel ?? "fluxa";
      this.tabTransport = new BroadcastChannelTransport(channel);
      this.attachTransport(this.tabTransport);
    }

    if (this.propagation.frame) {
      const channel = this.options.frame?.channel ?? "fluxa";
      this.frameTransport = new PostMessageTransport({
        allowedOrigins: this.options.frame?.allowedOrigins,
        channel,
      });
      this.attachTransport(this.frameTransport);
    }

    for (const t of this.transports) t.start();
  }

  private attachTransport(transport: Transport) {
    transport.attach((envelope) => this.receive(envelope));
    this.transports.push(transport);
  }

  private receive(envelope: FluxaEnvelope) {
    const meta = envelope.payload.meta;

    const path = Array.isArray(meta.path) ? meta.path : [];
    meta.path = path;

    // Prevent re-entry loops: if this context id is already present in the
    // path and it's not the last hop (i.e., message is re-entering), ignore it.
    if (
      path.includes(this.contextId) &&
      path[path.length - 1] !== this.contextId
    ) {
      return;
    }

    if (path[path.length - 1] !== this.contextId) {
      meta.path = [...path, this.contextId];
    }

    this.debugger.push({ direction: "in", envelope });

    const eventKey = envelope.event as keyof Events;
    this.bus.emit(
      eventKey,
      envelope.payload.data as Events[keyof Events],
      meta,
    );

    if (this.historyEnabled) {
      this.storeBridge?.receive(envelope);
    }
  }

  private ensureInitialized() {
    if (!this.initialized) {
      throw new Error("Fluxa is not initialized.");
    }
  }

  private fallbackContextId() {
    const base =
      typeof window !== "undefined"
        ? `${window.location.origin}|${window.location.pathname}`
        : "node";
    return `${base}|${Math.random().toString(16).slice(2)}`;
  }
}
