import type { FluxaEnvelope } from "../core/types";

import { Transport } from "./Transport";

export class MemoryTransport extends Transport {
  readonly name = "memory" as const;

  start() {}

  stop() {}

  send(envelope: FluxaEnvelope) {
    this.receive(envelope);
  }
}
