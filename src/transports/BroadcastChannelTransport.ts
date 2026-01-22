import { Transport } from "./Transport";
import type { FluxaEnvelope } from "../core/types";
import { safeParse, safeSerialize } from "../utils/serialize";

export class BroadcastChannelTransport extends Transport {
  readonly name = "tab" as const;

  private channelName: string;
  private channel: BroadcastChannel | null = null;

  constructor(channelName: string) {
    super();
    this.channelName = channelName;
  }

  start() {
    if (typeof BroadcastChannel === "undefined") return;
    this.channel = new BroadcastChannel(this.channelName);
    this.channel.onmessage = (e) => {
      const parsed = safeParse<FluxaEnvelope>(
        typeof e.data === "string" ? e.data : safeSerialize(e.data),
      );
      if (!parsed || parsed.type !== "fluxa:event") return;
      this.receive(parsed);
    };
  }

  stop() {
    if (!this.channel) return;
    this.channel.close();
    this.channel = null;
  }

  send(envelope: FluxaEnvelope) {
    if (!this.channel) return;
    this.channel.postMessage(safeSerialize(envelope));
  }
}
