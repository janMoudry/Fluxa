# Fluxa

Fluxa is a lightweight, type-safe communication layer for frontend applications.
It provides a small event bus with optional propagation across memory, browser tabs, and iframe boundaries.

Designed for embedded widgets, micro-frontends, and apps that need cross-context event routing without Redux or heavy state layers.

- Typed event bus (TypeScript generics)
- Propagation: memory (in‑page), cross‑tab, cross‑frame
- Simple namespacing via `scope()`
- Metadata filters per handler
- Optional debugger with in/out/local log

## Installation

```
npm install fluxa
# or
yarn add fluxa
# or
pnpm add fluxa
```

The package ships ESM and CJS builds:

- ESM import: `import { Fluxa } from 'fluxa'`
- CJS require: `const { Fluxa } = require('fluxa')`

## Quick start

```ts
import { Fluxa } from 'fluxa';

// 1) Define your event map for type safety
type Events = {
  'counter:increment': { amount: number };
  'user:login': { id: string };
};

// 2) Create an instance with desired propagation
const bus = new Fluxa<Events>({
  debug: true, // enables internal logging (see getEventLog())
  propagation: {
    memory: true,  // in the current page
    tab: false,    // across tabs via BroadcastChannel
    frame: false,  // between window and iframes via postMessage
  },
});

// 3) Listen and emit
const off = bus.on('counter:increment', (payload, meta) => {
  console.log('Increment by', payload.amount, 'meta:', meta);
});

bus.emit('counter:increment', { amount: 1 });

// Unsubscribe
off();
```

### Namespacing with scope()

```ts
// Typed variant – include the scoped event in your map
type Events = {
  'ui:click': { id: string };
};

const bus = new Fluxa<Events>();
const ui = bus.scope('ui');
ui.on('click', (data) => console.log('UI click', data));
ui.emit('click', { id: 'btn1' });
// scope('ui') prefixes event names at runtime → emits "ui:click"
```

Note: `scope('prefix')` only transforms the event name at runtime; typing stays intact if your `Events` map includes the prefixed keys.

## Fluxa is not a state manager

Fluxa is designed for event propagation and cross-context signaling, not long-lived application state.
If you need persistent global state, Fluxa can complement tools like Redux, Zustand, Jotai, or RxJS.

## Why Fluxa?

- Communicate between iframe ↔ parent without custom plumbing
- Cross-tab messaging without backend sync
- A typed event bus, not a full state manager
- Lighter than Redux/RxJS for simple event routing
- Built for widgets, micro-frontends, and SDKs

## Event propagation

Fluxa supports three transports (enabled via `options.propagation`):

- `memory` – local, within the current JS context (works in Node as well)
- `tab` – cross‑tab/window of the same origin via `BroadcastChannel`
- `frame` – between window and iframes via `window.postMessage`

### Cross‑tab (BroadcastChannel)

```ts
const bus = new Fluxa({
  propagation: { memory: true, tab: true },
  tab: { channel: 'my-app' }, // optional, defaults to 'fluxa'
});
```

- Requires browser support for `BroadcastChannel`.
- Events are sent to all instances listening on the same `channel`.

### Cross‑frame (postMessage)

```ts
const bus = new Fluxa({
  propagation: { frame: true },
  frame: {
    channel: 'my-app',               // optional, defaults to 'fluxa'
    allowedOrigins: ['https://example.com'], // strongly recommended in prod
  },
});

// In the parent window you can explicitly register child iframes
const iframe = document.querySelector('iframe')!;
bus.registerFramePeer('child-1', iframe.contentWindow!, 'https://child.example');

// Later you can unregister
bus.unregisterFramePeer('child-1');
```

Security notes:
- If `allowedOrigins` is omitted, messages from any origin are accepted. Always restrict this in production.
- `registerFramePeer` lets you target specific known iframe windows with explicit `origin`.

## Metadata and filters

Every event carries metadata:

```ts
export type FluxaEventMeta = {
  id: string;            // unique event ID
  timestamp: number;     // creation time
  sourceId?: string;     // e.g. window URL (when in browser)
  sourceLocationFile?: string; // optional diagnostic field
  traceId?: string;      // optional trace correlation
  path?: string[];       // traversal path across instances (context IDs)
  [key: string]: unknown;
};
```

You can add a metadata filter when registering a handler:

```ts
bus.on('user:login', (payload) => {
  // ...
}, (meta) => meta.sourceId?.includes('app.example.com') === true);
```

`emit(event, data, metaExtra)` allows you to merge your own keys into the metadata.

## Debugger and history

- Set `debug: true` in the constructor or call `bus.enableDebug(limit?)` to start recording logs (direction + event envelope).
- `bus.getEventLog()` returns an array of `{ direction: 'in'|'out'|'local', envelope }`.

For custom persistence/inspection you can attach a store bridge:

```ts
import type { FluxaEnvelope } from 'fluxa';

bus.attachStore({
  receive(envelope: FluxaEnvelope) {
    // store to devtools, localStorage, timeline view, etc.
  },
});
```

Quick peek at logs:

```ts
console.table(
  bus.getEventLog().map((e) => ({
    direction: e.direction,
    event: e.envelope.event,
    time: e.envelope.payload.meta.timestamp,
  }))
);
```

## API reference

- `new Fluxa<Events>(options?: FluxaConfig)`
  - `options.debug?: boolean`
  - `options.propagation?: { memory?: boolean; tab?: boolean; frame?: boolean }`
  - `options.tab?: { channel?: string }`
  - `options.frame?: { allowedOrigins?: string[]; channel?: string }`
  - `options.context?: { id?: string; name?: string }`
  - `options.history?: { enabled?: boolean; limit?: number }`
- `emit(event, data, metaExtra?)`
- `on(event, handler, filter?) => () => void`
- `off(event, handler)`
- `scope(prefix)`
- `registerFramePeer(id, windowRef, origin)` / `unregisterFramePeer(id)`
- `enableDebug(limit?)`, `getEventLog()`
- `attachStore(bridge)`
- `destroy()` – stops transports and listeners

## Environment

- Browser: all transports work; `tab` requires `BroadcastChannel`, `frame` uses `postMessage`.
- Node/SSR: `memory` transport is available; `tab`/`frame` require a browser.

## When to use Fluxa

- Share events between an embedded widget and host page (iframe ↔ parent)
- Coordinate multiple windows/tabs of the same app (BroadcastChannel)
- A simple local event bus that can also bridge to other contexts

## Example: widget ↔ host

```ts
// Parent page
const parentBus = new Fluxa({ propagation: { frame: true }, frame: { allowedOrigins: ['https://widget.example'] } });
parentBus.on('widget:ready', () => console.log('Widget is ready'));

const iframe = document.querySelector('iframe')!;
parentBus.registerFramePeer('widget', iframe.contentWindow!, 'https://widget.example');

// Widget (inside the iframe)
const widgetBus = new Fluxa({ propagation: { frame: true }, frame: { allowedOrigins: ['https://parent.example'] } });
widgetBus.emit('widget:ready', {});
```

## Maintainer notes

- `npm run build` – build with `tsup` into `dist`
- `npm run typecheck` – `tsc --noEmit`
- `npm run test` – `vitest` (no tests yet)
- `prepublishOnly` runs clean + build + typecheck

## Roadmap

Planned for v1.1:
- Event deduplication by ID
- Optional replay buffer
- Frame handshake helpers
- DevTools bridge

## License

MIT © Jan Moudrý
# Fluxa
