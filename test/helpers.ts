export class MockBroadcastChannel {
  static channels = new Map<string, Set<MockBroadcastChannel>>();

  onmessage: ((ev: MessageEvent) => void) | null = null;
  constructor(public name: string) {
    if (!MockBroadcastChannel.channels.has(name)) {
      MockBroadcastChannel.channels.set(name, new Set());
    }
    MockBroadcastChannel.channels.get(name)!.add(this);
  }

  postMessage(data: unknown) {
    const set = MockBroadcastChannel.channels.get(this.name);
    if (!set) return;
    for (const inst of set) {
      if (inst === this) continue; // do not echo to self, mirrors real BC behavior
      inst.onmessage?.({ data } as unknown as MessageEvent);
    }
  }

  close() {
    MockBroadcastChannel.channels.get(this.name)?.delete(this);
  }

  // Test-only helper to inject a raw message to all listeners (including sender-like behavior)
  static inject(name: string, data: unknown) {
    const set = MockBroadcastChannel.channels.get(name);
    if (!set) return;
    for (const inst of set) {
      inst.onmessage?.({ data } as unknown as MessageEvent);
    }
  }
}

type MessageHandler = (e: MessageEvent) => void;

type SimpleLocation = { href: string; origin: string; pathname: string };

export class FakeWindow {
  private handlers = new Set<MessageHandler>();
  constructor(public origin: string, public href: string) {}

  // minimal DOM-like shape
  location: SimpleLocation = { href: this.href, origin: this.origin, pathname: "/" };
  parent: FakeWindow = this; // make it self by default (top window)

  resetHandlers() {
    this.handlers.clear();
  }

  // Overloads to align with Window API used by the transport
  addEventListener(type: "message", handler: (e: MessageEvent) => void): void;
  addEventListener(type: string, handler: (e: MessageEvent) => void): void;
  addEventListener(type: string, handler: (e: MessageEvent) => void) {
    if (type !== "message") return;
    this.handlers.add(handler);
  }

  removeEventListener(type: "message", handler: (e: MessageEvent) => void): void;
  removeEventListener(type: string, handler: (e: MessageEvent) => void): void;
  removeEventListener(type: string, handler: (e: MessageEvent) => void) {
    if (type !== "message") return;
    this.handlers.delete(handler);
  }

  postMessage(data: unknown, _targetOrigin: string) {
    // In real browsers, the MessageEvent.origin is the sender's origin
    // (i.e., the window from which postMessage was called), not the
    // target window's origin. Our tests switch global window to simulate
    // the active/sender window.
    const sender = (globalThis as unknown as { window?: FakeWindow }).window;
    const e = { data, origin: sender ? sender.origin : this.origin } as unknown as MessageEvent;
    // deliver to all registered message handlers on this window
    for (const h of this.handlers) h(e);
  }
}
