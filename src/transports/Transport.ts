import type { FluxaEnvelope } from "../core/types";

export type TransportName = "memory" | "tab" | "frame";

export type TransportReceive = (envelope: FluxaEnvelope) => void;

export abstract class Transport {
  abstract readonly name: TransportName;

  protected onReceive: TransportReceive | null = null;

  attach(onReceive: TransportReceive) {
    this.onReceive = onReceive;
  }

  abstract start(): void;
  abstract stop(): void;
  abstract send(envelope: FluxaEnvelope): void;

  protected receive(envelope: FluxaEnvelope) {
    this.onReceive?.(envelope);
  }
}
