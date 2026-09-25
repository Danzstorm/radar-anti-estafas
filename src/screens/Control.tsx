import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Pause, Play as PlayIcon, RotateCcw, Check } from "lucide-react";
import { ROUNDS, type ControlAction, type Entry, type EntryStatus, type Round } from "../../shared/types";
import { useRoom } from "../lib/useRoom";
import { forecast } from "../lib/metrics";
import { ROUND_LABEL, ROUND_SCRIPT, SCAM_LABEL, VERDICT_LABEL, pct, riskColor, usd } from "../lib/copy";

const TOKEN_KEY = "radar-control-token";
const readToken = () => {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
};

export function Control() {
  const [token, setToken] = useState(readToken);
  const [draft, setDraft] = useState("");
  const room = useRoom("control", { token: token || undefined });
  const [busy, setBusy] = useState(false);

  if (!token || room.connection === "unauthorized") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
        <h1 className="num text-4xl font-bold uppercase">Panel del presentador</h1>
        {room.connection === "unauthorized" && <p role="alert" className="mt-3 text-r3">Esa clave no es correcta.</p>}
        <form
          className="mt-6 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              sessionStorage.setItem(TOKEN_KEY, draft);
            } catch {
              /* private mode: token lives in memory only */
            }
            setToken(draft);
          }}
        >
          <label htmlFor="token" className="text-ink-soft">Clave de control</label>
          <input id="token" type="password" autoComplete="off" value={draft} onChange={(e) => setDraft(e.target.value)} className="rounded-[12px] border border-graticule bg-sheet px-4 py-3" />
          <button className="rounded-[12px] bg-ink px-4 py-3 font-semibold text-paper">Entrar</button>
        </form>
      </main>
    );
  }

  const act = async (action: ControlAction) => {
    setBusy(true);
    try {
      await fetch("/api/control", { method: "POST", headers: { "Content-Type": "application/json", "x-control-token": token }, body: JSON.stringify(action) });
    } finally {
      setBusy(false);
    }
  };

  const pending = room.entries.filter((e) => e.status === "pending");
  const recent = [...room.entries].reverse().slice(0, 60);
  const stats = forecast(room.entries.filter((e) => e.status === "visible"));

  return (
    <main className="mx-auto max-w-3xl px-4 py-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="num text-3xl font-bold uppercase">Control</h1>
        <p className="text-sm text-ink-soft">
          <b className="num text-lg text-ink">{room.presence.online}</b> conectados · <b className="num text-lg text-ink">{room.presence.typing}</b> escribiendo ·{" "}
          {room.connection === "open" ? "en vivo" : "reconectando…"}
        </p>
      </header>

      <NowPanel round={room.round} busy={busy} onNext={(round) => act({ action: "round", round })} />

      <section className="mt-6">
        <h2 className="num text-lg font-bold uppercase text-ink-soft">Ir a cualquier ronda</h2>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {ROUNDS.map((r) => (
            <button
              key={r}
              disabled={busy}
              aria-pressed={room.round === r}
              onClick={() => act({ action: "round", round: r })}
              className={`rounded-[12px] border px-3 py-3 text-left text-sm font-semibold ${room.round === r ? "border-ink bg-ink text-paper" : "border-graticule bg-sheet"}`}
            >
              {ROUND_LABEL[r]}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => act({ action: "freeze", frozen: !room.frozen })} className={`flex items-center gap-2 rounded-[12px] px-4 py-3 font-semibold ${room.frozen ? "bg-r1 text-ink" : "bg-ink text-paper"}`}>
            {room.frozen ? <PlayIcon className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
            {room.frozen ? "Reanudar pantalla" : "Congelar pantalla"}
          </button>
          <button
            onClick={() => confirm("¿Borrar todos los mensajes y volver a la sala de espera?") && act({ action: "reset" })}
            className="flex items-center gap-2 rounded-[12px] border border-graticule bg-sheet px-4 py-3 font-semibold"
          >
            <RotateCcw className="size-4" aria-hidden /> Reiniciar sesión
          </button>
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          En pantalla: {stats.count} mensajes · {pct(stats.scamShare)} estafa · {Math.round(stats.avgLatencyMs)} ms · {usd(stats.totalCostUsd)}
        </p>
      </section>

      {pending.length > 0 && (
        <section className="mt-6">
          <h2 className="num text-lg font-bold uppercase text-r3">Por revisar ({pending.length})</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {pending.map((e) => (
              <EntryRow key={e.id} entry={e} onStatus={(status) => act({ action: "status", id: e.id, status })} />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="num text-lg font-bold uppercase text-ink-soft">Últimos mensajes</h2>
        {recent.length === 0 && <p className="mt-2 text-ink-faint">Todavía no llegó ninguno.</p>}
        <ul className="mt-2 flex flex-col gap-2">
          {recent.map((e) => (
            <EntryRow key={e.id} entry={e} onStatus={(status) => act({ action: "status", id: e.id, status })} />
          ))}
        </ul>
      </section>
    </main>
  );
}

/** The current step, what to say, and one big button to move on. */
function NowPanel({ round, busy, onNext }: { round: Round; busy: boolean; onNext: (r: Round) => void }) {
  const next = ROUNDS[ROUNDS.indexOf(round) + 1];
  return (
    <section className="mt-5 rounded-[14px] bg-sheet p-4 shadow-[0_8px_24px_rgb(29_43_54/.08)]">
      <p className="text-sm text-ink-soft">Ahora</p>
      <h2 className="num text-2xl font-bold uppercase">{ROUND_LABEL[round]}</h2>
      <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-snug">
        {ROUND_SCRIPT[round].map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {next && (
        <button
          disabled={busy}
          onClick={() => onNext(next)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-[12px] bg-ink px-4 py-4 text-lg font-semibold text-paper disabled:opacity-50"
        >
          Siguiente: {ROUND_LABEL[next]} <ArrowRight className="size-5" aria-hidden />
        </button>
      )}
    </section>
  );
}

function EntryRow({ entry, onStatus }: { entry: Entry; onStatus: (s: EntryStatus) => void }) {
  const a = entry.analysis;
  return (
    <li className={`rounded-[12px] bg-sheet p-3 ${entry.status === "hidden" ? "opacity-50" : ""}`}>
      <p className="text-[15px] leading-snug">{entry.text}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-full" style={{ background: riskColor(a.risk) }} aria-hidden />
          <b>{VERDICT_LABEL[a.verdict]} {pct(a.isScam)}</b> · {SCAM_LABEL[a.scamType]} · ofensivo {pct(a.offensive)}
        </span>
        <span className="flex gap-1.5">
          {entry.status !== "visible" && (
            <button onClick={() => onStatus("visible")} className="flex items-center gap-1 rounded-[10px] bg-ink px-3 py-1.5 font-semibold text-paper">
              {entry.status === "pending" ? <Check className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              Mostrar
            </button>
          )}
          {entry.status !== "hidden" && (
            <button onClick={() => onStatus("hidden")} className="flex items-center gap-1 rounded-[10px] border border-graticule px-3 py-1.5 font-semibold">
              <EyeOff className="size-4" aria-hidden /> Ocultar
            </button>
          )}
        </span>
      </div>
    </li>
  );
}
