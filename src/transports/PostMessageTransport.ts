import type { FluxaEnvelope } from "../core/types";
import { safeParse, safeSerialize } from "../utils/serialize";

import { Transport } from "./Transport";

type FramePeer = {
  id: string;
  windowRef: Window;
  origin: string;
};

export class PostMessageTransport extends Transport {
  readonly name = "frame" as const;

  private peers = new Map<string, FramePeer>();
  private allowedOrigins: string[] | null;
  private channel: string;
  private handler: ((e: MessageEvent) => void) | null = null;

  constructor(params: { allowedOrigins?: string[]; channel?: string }) {
    super();
    this.allowedOrigins = params.allowedOrigins ?? null;
    this.channel = params.channel ?? "fluxa";
  }

  registerPeer(id: string, windowRef: Window, origin: string) {
    this.peers.set(id, { id, windowRef, origin });
  }

  unregisterPeer(id: string) {
    this.peers.delete(id);
  }

  start() {
    // Ensure only one active listener per window per channel to avoid
    // multiple Fluxa instances in the same window processing the same
    // message. Newest instance wins.
    const globalKey = `__fluxa_pm_handler_${this.channel}` as const;

    // If there is an existing handler for this channel, remove it first.
    const existing = (window as unknown as Record<string, unknown>)[
      globalKey
    ] as ((e: MessageEvent) => void) | undefined;
    if (existing) {
      window.removeEventListener("message", existing);
    }

    this.handler = (e: MessageEvent) => {
      const originOk =
        this.allowedOrigins === null ||
        this.allowedOrigins.length === 0 ||
        this.allowedOrigins.includes(e.origin) ||
        this.allowedOrigins.includes("*");

      if (!originOk) return;

      const data =
        typeof e.data === "string"
          ? safeParse<FluxaEnvelope>(e.data)
          : (e.data as FluxaEnvelope);
      if (!data || data.type !== "fluxa:event") return;

      const meta = data.payload?.meta;
      if (!meta) return;

      const path = Array.isArray(meta.path) ? meta.path : [];
      meta.path = path;

      this.receive(data);
    };

    (window as unknown as Record<string, unknown>)[globalKey] = this
      .handler as unknown as unknown;
    window.addEventListener("message", this.handler);
  }

  stop() {
    const globalKey = `__fluxa_pm_handler_${this.channel}` as const;
    const current = (window as unknown as Record<string, unknown>)[
      globalKey
    ] as ((e: MessageEvent) => void) | undefined;
    if (this.handler && current === this.handler) {
      window.removeEventListener("message", this.handler);
      (window as unknown as Record<string, unknown>)[globalKey] =
        null as unknown as unknown;
    }
    this.handler = null;
  }

  send(envelope: FluxaEnvelope) {
    const serialized = safeSerialize(envelope);

    if (window.parent && window.parent !== window) {
      window.parent.postMessage(serialized, "*");
    }

    // Deduplicate by target window to avoid sending the same
    // message multiple times when multiple peer IDs point to
    // the same window reference.
    const sent = new Set<Window>();
    for (const peer of this.peers.values()) {
      if (sent.has(peer.windowRef)) continue;
      peer.windowRef.postMessage(serialized, peer.origin || "*");
      sent.add(peer.windowRef);
    }
  }
}
