import { DurableObject } from "cloudflare:workers";
import { REACTIONS, ROUNDS, type ClientEvent, type ControlAction, type Entry, type EntryStatus, type Guess, type Presence, type Round, type ServerEvent } from "../shared/types";
import { maskPersonalData } from "../shared/mask";
import { analyze } from "./jev";

type Role = "play" | "screen" | "control";
interface SocketMeta { role: Role; typingUntil: number; lastReactionAt: number }
interface Persisted { round: Round; frozen: boolean; entries: Entry[] }

const MAX_ENTRIES = 600;
const MIN_LENGTH = 20;
const MAX_LENGTH = 400;
const SEND_COOLDOWN_MS = 4000;
const TYPING_WINDOW_MS = 4000;
const REACTION_COOLDOWN_MS = 350;
const OPEN_ROUNDS: Round[] = ["real", "fool", "falsePositive"];

// One Durable Object = one live room. Every phone, the projector and the presenter panel connect here.
export class Room extends DurableObject<Env> {
  private state: Persisted = { round: "lobby", frozen: false, entries: [] };
  private lastSendByClient = new Map<string, number>();
  private presenceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.state = (await ctx.storage.get<Persisted>("state")) ?? this.state;
    });
  }

  async fetch(req: Request): Promise<Response> {
    const { pathname, searchParams } = new URL(req.url);
    if (pathname === "/api/ws") return this.openSocket(searchParams.get("role"), searchParams.get("token"));
    if (pathname === "/api/messages" && req.method === "POST") return this.submit(req);
    if (pathname === "/api/control" && req.method === "POST") return this.control(req);
    return json({ error: "Not found" }, 404);
  }

  private openSocket(role: string | null, token: string | null): Response {
    if (role !== "play" && role !== "screen" && role !== "control") return json({ error: "Invalid role" }, 400);
    if (role === "control" && token !== this.env.CONTROL_TOKEN) return json({ error: "Unauthorized" }, 401);
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server, [role]);
    server.serializeAttachment({ role, typingUntil: 0, lastReactionAt: 0 } satisfies SocketMeta);
    server.send(JSON.stringify(this.snapshot(role)));
    this.schedulePresence();
    return new Response(null, { status: 101, webSocket: client });
  }

  private async submit(req: Request): Promise<Response> {
    const body = (await req.json().catch(() => null)) as { text?: string; guess?: Guess; clientId?: string } | null;
    const text = body?.text?.trim() ?? "";
    const clientId = body?.clientId ?? "";
    const guess: Guess = body?.guess === "scam" || body?.guess === "safe" ? body.guess : "unsure";

    if (!OPEN_ROUNDS.includes(this.state.round)) return json({ error: "La ronda todavía no está abierta. ¡Mira la pantalla!" }, 409);
    if (text.length < MIN_LENGTH) return json({ error: "Escribe el mensaje completo (mínimo 20 caracteres)." }, 400);
    if (text.length > MAX_LENGTH) return json({ error: `Máximo ${MAX_LENGTH} caracteres.` }, 400);
    const last = this.lastSendByClient.get(clientId) ?? 0;
    if (Date.now() - last < SEND_COOLDOWN_MS) return json({ error: "Espera unos segundos antes de enviar otro." }, 429);
    this.lastSendByClient.set(clientId, Date.now());

    const masked = maskPersonalData(text);
    let analysis;
    try {
      analysis = await analyze(masked, this.env.OPENROUTER_API_KEY);
    } catch (err) {
      console.error("analyze failed", err);
      return json({ error: "La IA no respondió. Prueba de nuevo en un momento." }, 502);
    }

    // Moderation never relies on the model alone: doubtful content waits for the presenter.
    const status: EntryStatus = analysis.offensive >= 0.85 ? "hidden" : analysis.offensive >= 0.5 ? "pending" : "visible";
    const entry: Entry = { id: crypto.randomUUID(), text: masked, round: this.state.round, guess, analysis, status, at: Date.now() };
    this.state.entries = [...this.state.entries, entry].slice(-MAX_ENTRIES);
    await this.persist();
    this.broadcast({ type: "entry", entry });
    return json({ entry });
  }

  private async control(req: Request): Promise<Response> {
    if (req.headers.get("x-control-token") !== this.env.CONTROL_TOKEN) return json({ error: "Unauthorized" }, 401);
    const cmd = (await req.json().catch(() => null)) as ControlAction | null;
    switch (cmd?.action) {
      case "round":
        if (!ROUNDS.includes(cmd.round)) return json({ error: "Invalid round" }, 400);
        this.state.round = cmd.round;
        this.broadcast({ type: "round", round: cmd.round });
        break;
      case "status": {
        const entry = this.state.entries.find((e) => e.id === cmd.id);
        if (!entry) return json({ error: "Unknown entry" }, 404);
        entry.status = cmd.status;
        this.broadcast({ type: "status", id: cmd.id, status: cmd.status });
        break;
      }
      case "freeze":
        this.state.frozen = cmd.frozen;
        this.broadcast({ type: "frozen", frozen: cmd.frozen });
        break;
      case "reset":
        this.state = { round: "lobby", frozen: false, entries: [] };
        this.lastSendByClient.clear();
        this.broadcast({ type: "reset" });
        this.ctx.getWebSockets().forEach((ws) => ws.send(JSON.stringify(this.snapshot(meta(ws).role))));
        break;
      default:
        return json({ error: "Unknown action" }, 400);
    }
    await this.persist();
    return json({ ok: true });
  }

  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string") return;
    let event: ClientEvent;
    try {
      event = JSON.parse(message);
    } catch {
      return;
    }
    const current = meta(ws);
    const now = Date.now();
    if (event.type === "typing") {
      ws.serializeAttachment({ ...current, typingUntil: now + TYPING_WINDOW_MS });
      this.schedulePresence();
    } else if (event.type === "react" && REACTIONS.includes(event.reaction) && now - current.lastReactionAt >= REACTION_COOLDOWN_MS) {
      ws.serializeAttachment({ ...current, lastReactionAt: now });
      if (!this.state.frozen) this.broadcast({ type: "reaction", reaction: event.reaction });
    }
  }

  webSocketClose() {
    this.schedulePresence();
  }

  private snapshot(role: Role): ServerEvent {
    // Phones never receive the feed: it lives on the projector.
    const entries = role === "play" ? [] : role === "screen" ? this.state.entries.filter((e) => e.status === "visible") : this.state.entries;
    return { type: "snapshot", round: this.state.round, frozen: this.state.frozen, entries, presence: this.presence() };
  }

  private presence(): Presence {
    const phones = this.ctx.getWebSockets("play");
    const now = Date.now();
    return { online: phones.length, typing: phones.filter((ws) => meta(ws).typingUntil > now).length };
  }

  // Throttled: with hundreds of phones typing, presence goes out at most once per second.
  private schedulePresence() {
    if (this.presenceTimer) return;
    this.presenceTimer = setTimeout(() => {
      this.presenceTimer = null;
      this.broadcast({ type: "presence", presence: this.presence() });
    }, 1000);
  }

  private broadcast(event: ServerEvent) {
    const payload = JSON.stringify(event);
    for (const ws of this.ctx.getWebSockets()) {
      const { role } = meta(ws);
      if (role === "play" && event.type !== "round" && event.type !== "presence" && event.type !== "reset") continue;
      if (role === "control" && event.type === "reaction") continue;
      if (role === "screen" && event.type === "entry" && event.entry.status !== "visible") continue;
      if (role === "screen" && event.type === "status" && event.status === "visible") {
        const entry = this.state.entries.find((e) => e.id === event.id);
        if (entry) ws.send(JSON.stringify({ type: "entry", entry } satisfies ServerEvent));
        continue;
      }
      try {
        ws.send(payload);
      } catch {
        // Socket already closing; the close handler updates presence.
      }
    }
  }

  private persist() {
    return this.ctx.storage.put("state", this.state);
  }
}

const meta = (ws: WebSocket) => ws.deserializeAttachment() as SocketMeta;
const json = (data: unknown, status = 200) => Response.json(data, { status });
