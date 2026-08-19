import { describe, expect, it } from 'vitest';
import {
  WS_OPEN,
  createOutboundCommandDispatcher,
  type FlushSocket,
} from './outboundCommandDispatcher';

function fakeSocket(readyState = 0): FlushSocket & { sent: string[]; readyState: number } {
  const sock = {
    readyState,
    sent: [] as string[],
    send(data: string) {
      sock.sent.push(data);
    },
  };
  return sock;
}

function actions(sock: { sent: string[] }): string[] {
  return sock.sent.map((raw) => JSON.parse(raw).action);
}

describe('outboundCommandDispatcher', () => {
  it('1. wake while CONNECTING is sent after OPEN', () => {
    const d = createOutboundCommandDispatcher();
    const gen = d.nextSocketGeneration();
    const sock = fakeSocket(0);
    expect(d.enqueue({ action: 'wake' }, 0)).toBe(true);
    expect(d.flush(sock, gen)).toBe(0);
    sock.readyState = WS_OPEN;
    expect(d.flush(sock, gen)).toBe(1);
    expect(actions(sock)).toEqual(['wake']);
  });

  it('2. conversation_started while CONNECTING is sent after OPEN', () => {
    const d = createOutboundCommandDispatcher();
    const gen = d.nextSocketGeneration();
    const sock = fakeSocket(0);
    d.enqueue({ action: 'conversation_started' }, 0);
    expect(d.flush(sock, gen)).toBe(0);
    sock.readyState = WS_OPEN;
    expect(d.flush(sock, gen)).toBe(1);
    expect(actions(sock)).toEqual(['conversation_started']);
  });

  it('3. wake then conversation_started before OPEN preserve order', () => {
    const d = createOutboundCommandDispatcher();
    const gen = d.nextSocketGeneration();
    const sock = fakeSocket(0);
    d.enqueue({ action: 'wake' }, 0);
    d.enqueue({ action: 'conversation_started' }, 0);
    sock.readyState = WS_OPEN;
    d.flush(sock, gen);
    expect(actions(sock)).toEqual(['wake', 'conversation_started']);
  });

  it('4. socket replacement before OPEN keeps pending commands', () => {
    const d = createOutboundCommandDispatcher();
    d.nextSocketGeneration();
    d.enqueue({ action: 'wake' }, 0);
    d.enqueue({ action: 'conversation_started' }, 0);
    const gen2 = d.nextSocketGeneration();
    const replacement = fakeSocket(WS_OPEN);
    expect(d.flush(replacement, gen2)).toBe(2);
    expect(actions(replacement)).toEqual(['wake', 'conversation_started']);
  });

  it('5. old socket OPEN after replacement cannot flush commands', () => {
    const d = createOutboundCommandDispatcher();
    const gen1 = d.nextSocketGeneration();
    d.enqueue({ action: 'wake' }, 0);
    const gen2 = d.nextSocketGeneration();
    const stale = fakeSocket(WS_OPEN);
    expect(d.flush(stale, gen1)).toBe(0);
    expect(stale.sent).toEqual([]);
    const current = fakeSocket(WS_OPEN);
    expect(d.flush(current, gen2)).toBe(1);
    expect(actions(current)).toEqual(['wake']);
  });

  it('6. reconnect does not resend SENT logical commands', () => {
    const d = createOutboundCommandDispatcher();
    const gen1 = d.nextSocketGeneration();
    d.enqueue({ action: 'wake' }, 0);
    const first = fakeSocket(WS_OPEN);
    d.flush(first, gen1);
    const gen2 = d.nextSocketGeneration();
    const second = fakeSocket(WS_OPEN);
    expect(d.flush(second, gen2)).toBe(0);
    expect(second.sent).toEqual([]);
    expect(d.enqueue({ action: 'wake' }, 0)).toBe(true);
    expect(d.flush(second, gen2)).toBe(0);
  });

  it('7. new session invalidates stale pending commands', () => {
    const d = createOutboundCommandDispatcher();
    const gen = d.nextSocketGeneration();
    d.enqueue({ action: 'wake' }, 0);
    d.enqueue({ action: 'user_message', text: 'old' }, 0);
    d.invalidateBelow(1);
    d.enqueue({ action: 'wake' }, 1);
    d.enqueue({ action: 'reset_session', type: 'RESET_SESSION' }, 1);
    const sock = fakeSocket(WS_OPEN);
    d.flush(sock, gen);
    expect(actions(sock)).toEqual(['wake', 'reset_session']);
    expect(d.snapshot().all.filter((c) => c.state === 'INVALIDATED')).toHaveLength(2);
  });

  it('8. normal user_message is unique FIFO and not coalesced', () => {
    const d = createOutboundCommandDispatcher();
    const gen = d.nextSocketGeneration();
    d.enqueue({ action: 'user_message', text: 'a' }, 0);
    d.enqueue({ action: 'user_message', text: 'b' }, 0);
    const sock = fakeSocket(WS_OPEN);
    d.flush(sock, gen);
    expect(sock.sent.map((raw) => JSON.parse(raw).text)).toEqual(['a', 'b']);
  });

  it('9. rapid wake/connect events dispatch one logical wake', () => {
    const d = createOutboundCommandDispatcher();
    const gen = d.nextSocketGeneration();
    expect(d.enqueue({ action: 'wake' }, 0)).toBe(true);
    expect(d.enqueue({ action: 'wake' }, 0)).toBe(true);
    expect(d.enqueue({ action: 'wake' }, 0)).toBe(true);
    const sock = fakeSocket(WS_OPEN);
    expect(d.flush(sock, gen)).toBe(1);
    expect(actions(sock)).toEqual(['wake']);
  });

  it('10. conversation_started enqueued before OPEN still reaches the socket', () => {
    const d = createOutboundCommandDispatcher();
    d.enqueue({ action: 'conversation_started' }, 0);
    const gen = d.nextSocketGeneration();
    const sock = fakeSocket(WS_OPEN);
    d.flush(sock, gen);
    expect(actions(sock)).toEqual(['conversation_started']);
  });

  it('holds inbound sleep while wake is unacked, then releases on state 5', () => {
    const d = createOutboundCommandDispatcher();
    expect(d.shouldHoldSleep()).toBe(false);
    d.enqueue({ action: 'wake' }, 0);
    expect(d.shouldHoldSleep()).toBe(true);
    d.acknowledgeInboundState(0);
    expect(d.shouldHoldSleep()).toBe(true);
    d.acknowledgeInboundState(5);
    expect(d.shouldHoldSleep()).toBe(false);
  });

  it('rejects non-object payloads', () => {
    const d = createOutboundCommandDispatcher();
    expect(d.enqueue(null, 0)).toBe(false);
    expect(d.enqueue('wake', 0)).toBe(false);
    expect(d.enqueue({ foo: 1 }, 0)).toBe(false);
  });

  it('marks SENT before send so a throw after mark cannot duplicate on retry', () => {
    const d = createOutboundCommandDispatcher();
    const gen = d.nextSocketGeneration();
    d.enqueue({ action: 'wake' }, 0);
    const sock: FlushSocket & { sent: string[] } = {
      readyState: WS_OPEN,
      sent: [],
      send() {
        throw new Error('wire failed');
      },
    };
    expect(() => d.flush(sock, gen)).toThrow(/wire failed/);
    const retry = fakeSocket(WS_OPEN);
    expect(d.flush(retry, gen)).toBe(0);
  });
});
