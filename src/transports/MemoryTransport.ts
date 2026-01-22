import { Transport } from "./Transport";
import type { FluxaEnvelope } from "../core/types";

export class MemoryTransport extends Transport {
  readonly name = "memory" as const;

  start() {}

  stop() {}

  send(envelope: FluxaEnvelope) {
    this.receive(envelope);
  }
}
