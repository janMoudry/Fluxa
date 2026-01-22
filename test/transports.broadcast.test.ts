import { describe, it, expect, beforeEach } from 'vitest';
import { Fluxa } from '../src/core/Fluxa';
import { MockBroadcastChannel } from './helpers';

type Events = { hello: { x: number } };

describe('BroadcastChannelTransport', () => {
  beforeEach(() => {
    (globalThis as unknown as { BroadcastChannel: new (name: string) => BroadcastChannel }).BroadcastChannel =
      MockBroadcastChannel as unknown as new (name: string) => BroadcastChannel;
    MockBroadcastChannel.channels.clear();
  });

  it('delivers events across tabs (channels)', () => {
    const a = new Fluxa<Events>({ propagation: { memory: true, tab: true }, context: { id: 'A' }, tab: { channel: 'ch' } });
    const b = new Fluxa<Events>({ propagation: { memory: true, tab: true }, context: { id: 'B' }, tab: { channel: 'ch' } });
    let got = 0;
    b.on('hello', (d, meta) => {
      expect(d.x).toBe(7);
      expect(meta.path).toEqual(['A', 'B']);
      got++;
    });
    a.emit('hello', { x: 7 });
    expect(got).toBe(1);
  });

  it('ignores invalid payloads on the channel', () => {
    const a = new Fluxa<Events>({ propagation: { memory: true, tab: true }, context: { id: 'A' }, tab: { channel: 'ch' } });
    const b = new Fluxa<Events>({ propagation: { memory: true, tab: true }, context: { id: 'B' }, tab: { channel: 'ch' } });
    let got = 0;
    b.on('hello', () => got++);
    // inject wrong type
    MockBroadcastChannel.inject('ch', JSON.stringify({ type: 'not-fluxa' }));
    MockBroadcastChannel.inject('ch', 'not-json');
    // normal emit
    a.emit('hello', { x: 1 });
    expect(got).toBe(1);
  });
});
