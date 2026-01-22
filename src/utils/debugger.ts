import type { FluxaEnvelope } from "../core/types";

export type FluxaLogEntry = {
  direction: "in" | "out" | "local";
  envelope: FluxaEnvelope;
};

export class Debugger {
  private enabled = false;
  private limit = 200;
  private logs: FluxaLogEntry[] = [];

  enable(limit?: number) {
    this.enabled = true;
    if (typeof limit === "number" && limit > 0) this.limit = limit;
  }

  disable() {
    this.enabled = false;
  }

  push(entry: FluxaLogEntry) {
    if (!this.enabled) return;
    this.logs.push(entry);
    if (this.logs.length > this.limit) {
      this.logs.splice(0, this.logs.length - this.limit);
    }
  }

  getLogs() {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
  }
}
