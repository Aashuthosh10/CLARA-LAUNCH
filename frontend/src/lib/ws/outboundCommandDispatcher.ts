/**
 * Authoritative outbound WebSocket command lifecycle.
 *
 * The socket owner (useWebSocket) opens/replaces sockets. This module only
 * accepts, holds, flushes, or invalidates commands.
 *
 * Transport semantics: frontend logical exactly-once dispatch. There is no
 * server ack; a command marked SENT is never resent, even if the TCP write
 * is lost.
 */

export type CommandState = 'PENDING' | 'SENT' | 'INVALIDATED';

export type OutboundPayload = Record<string, unknown>;

/** Minimal socket surface so the dispatcher stays free of the DOM WebSocket type. */
export type FlushSocket = {
  readyState: number;
  send: (data: string) => void;
};

/** WebSocket.OPEN — kept numeric so unit tests need no real WebSocket. */
export const WS_OPEN = 1;

const SINGLETON_ACTIONS = new Set(['wake', 'conversation_started']);

export type OutboundCommand = {
  instanceId: number;
  sessionEpoch: number;
  logicalKey: string;
  payload: OutboundPayload;
  state: CommandState;
};

export type DispatcherSnapshot = {
  socketGeneration: number;
  pending: OutboundCommand[];
  all: OutboundCommand[];
};

function actionOf(payload: OutboundPayload): string {
  return typeof payload.action === 'string' ? payload.action : '';
}

function isSingletonAction(action: string): boolean {
  return SINGLETON_ACTIONS.has(action);
}

export function createOutboundCommandDispatcher() {
  let nextInstanceId = 1;
  let socketGeneration = 0;
  let wakeUnacked = false;
  const commands: OutboundCommand[] = [];

  function nextSocketGeneration(): number {
    socketGeneration += 1;
    return socketGeneration;
  }

  function currentSocketGeneration(): number {
    return socketGeneration;
  }

  function enqueue(payload: unknown, sessionEpoch: number): boolean {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return false;
    }
    const body = payload as OutboundPayload;
    const action = actionOf(body);
    if (!action) return false;

    if (isSingletonAction(action)) {
      const logicalKey = `${sessionEpoch}:${action}`;
      const existing = commands.find(
        (c) =>
          c.logicalKey === logicalKey && (c.state === 'PENDING' || c.state === 'SENT'),
      );
      if (existing) {
        return true;
      }
      const instanceId = nextInstanceId;
      nextInstanceId += 1;
      commands.push({
        instanceId,
        sessionEpoch,
        logicalKey,
        payload: { ...body },
        state: 'PENDING',
      });
      if (action === 'wake') wakeUnacked = true;
      return true;
    }

    const instanceId = nextInstanceId;
    nextInstanceId += 1;
    commands.push({
      instanceId,
      sessionEpoch,
      logicalKey: `${sessionEpoch}:#${instanceId}`,
      payload: { ...body },
      state: 'PENDING',
    });
    return true;
  }

  function invalidateBelow(sessionEpoch: number): void {
    for (const c of commands) {
      if (c.state === 'PENDING' && c.sessionEpoch < sessionEpoch) {
        c.state = 'INVALIDATED';
      }
    }
    wakeUnacked = false;
  }

  /** Inbound chat state acknowledges the in-flight wake. */
  function acknowledgeInboundState(state: number): void {
    if (state === 3 || state === 4 || state === 5) {
      wakeUnacked = false;
    }
  }

  /**
   * Backend hello on a new TCP socket is state 0. If wake is queued or on
   * the wire, that sleep frame must not clobber the wake UI / language gate.
   */
  function shouldHoldSleep(): boolean {
    return wakeUnacked;
  }

  /**
   * Send PENDING commands on this socket iff `generation` is still current
   * and the socket is OPEN. Marks SENT before send so a later reconnect
   * cannot duplicate logical dispatch.
   */
  function flush(socket: FlushSocket, generation: number): number {
    if (generation !== socketGeneration) return 0;
    if (socket.readyState !== WS_OPEN) return 0;
    let sent = 0;
    for (const c of commands) {
      if (c.state !== 'PENDING') continue;
      c.state = 'SENT';
      socket.send(JSON.stringify(c.payload));
      sent += 1;
    }
    return sent;
  }

  function snapshot(): DispatcherSnapshot {
    return {
      socketGeneration,
      pending: commands.filter((c) => c.state === 'PENDING'),
      all: commands.map((c) => ({ ...c, payload: { ...c.payload } })),
    };
  }

  return {
    enqueue,
    invalidateBelow,
    nextSocketGeneration,
    currentSocketGeneration,
    flush,
    acknowledgeInboundState,
    shouldHoldSleep,
    snapshot,
  };
}

export type OutboundCommandDispatcher = ReturnType<typeof createOutboundCommandDispatcher>;
