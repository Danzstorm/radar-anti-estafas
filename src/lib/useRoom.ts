import { useEffect, useReducer, useRef, useState } from "react";
import type { ClientEvent, Entry, Presence, Reaction, Round, ServerEvent } from "../../shared/types";

export type Role = "play" | "screen" | "control";
export type Connection = "connecting" | "open" | "closed" | "unauthorized";

export interface RoomState {
  /** False until the first snapshot arrives, so late joiners don't treat history as news. */
  synced: boolean;
  round: Round;
  frozen: boolean;
  entries: Entry[];
  presence: Presence;
}

const initial: RoomState = { synced: false, round: "lobby", frozen: false, entries: [], presence: { online: 0, typing: 0 } };

function reduce(state: RoomState, event: ServerEvent): RoomState {
  switch (event.type) {
    case "snapshot":
      return { synced: true, round: event.round, frozen: event.frozen, entries: event.entries, presence: event.presence };
    case "entry":
      return state.entries.some((e) => e.id === event.entry.id)
        ? { ...state, entries: state.entries.map((e) => (e.id === event.entry.id ? event.entry : e)) }
        : { ...state, entries: [...state.entries, event.entry] };
    case "status":
      return { ...state, entries: state.entries.map((e) => (e.id === event.id ? { ...e, status: event.status } : e)) };
    case "round":
      return { ...state, round: event.round };
    case "frozen":
      return { ...state, frozen: event.frozen };
    case "presence":
      return { ...state, presence: event.presence };
    case "reset":
      return { ...initial, synced: true, presence: state.presence };
    default:
      return state;
  }
}

/** Live connection to the room Durable Object, with automatic reconnection. */
export function useRoom(role: Role, options: { token?: string; onReaction?: (r: Reaction) => void } = {}) {
  const [state, dispatch] = useReducer(reduce, initial);
  const [connection, setConnection] = useState<Connection>("connecting");
  const socketRef = useRef<WebSocket | null>(null);
  const onReactionRef = useRef(options.onReaction);
  onReactionRef.current = options.onReaction;

  useEffect(() => {
    if (role === "control" && !options.token) return;
    let closedByUs = false;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout>;

    const open = () => {
      const params = new URLSearchParams({ role });
      if (options.token) params.set("token", options.token);
      const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/ws?${params}`);
      socketRef.current = ws;
      setConnection("connecting");
      ws.onopen = () => {
        retry = 0;
        setConnection("open");
      };
      ws.onmessage = (msg) => {
        const event = JSON.parse(msg.data) as ServerEvent;
        if (event.type === "reaction") onReactionRef.current?.(event.reaction);
        else dispatch(event);
      };
      ws.onclose = (ev) => {
        if (closedByUs) return;
        // A rejected upgrade surfaces as an abnormal close before open.
        if (role === "control" && ev.code === 1006 && retry > 2) return setConnection("unauthorized");
        setConnection("closed");
        timer = setTimeout(open, Math.min(8000, 500 * 2 ** retry++));
      };
    };

    open();
    return () => {
      closedByUs = true;
      clearTimeout(timer);
      socketRef.current?.close();
    };
  }, [role, options.token]);

  const send = (event: ClientEvent) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify(event));
  };

  return { ...state, connection, send };
}
