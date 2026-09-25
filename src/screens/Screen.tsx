import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PenLine, Pause, Smartphone, Zap } from "lucide-react";
import type { Entry, Reaction } from "../../shared/types";
import { useRoom } from "../lib/useRoom";
import { forecast } from "../lib/metrics";
import { MISSIONS, PRESSURE_LEVELS, ROUND_LABEL, SCAM_LABEL, VERDICT_COLOR, VERDICT_LABEL, pct, riskColor, usd } from "../lib/copy";
import { Radar, RadarLegend, echoPosition } from "../components/Radar";
import { QR } from "../components/QR";
import { Logo } from "../components/Logo";
import { FloatingReactions, type Floating } from "../components/FloatingReactions";

const CALL_MS = 7000;
const joinUrl = `${location.origin}/jugar`;

export function Screen() {
  const [floating, setFloating] = useState<Floating[]>([]);
  const nextId = useRef(0);
  const onReaction = (reaction: Reaction) => {
    const id = nextId.current++;
    setFloating((f) => [...f.slice(-40), { id, reaction, x: 4 + Math.random() * 92 }]);
    setTimeout(() => setFloating((f) => f.filter((x) => x.id !== id)), 3400);
  };
  const room = useRoom("screen", { onReaction });

  // Freezing holds the wall exactly as it is; new messages wait until the presenter resumes.
  const [frozenAt, setFrozenAt] = useState<number | null>(null);
  useEffect(() => setFrozenAt(room.frozen ? Date.now() : null), [room.frozen]);
  const entries = useMemo(
    () => room.entries.filter((e) => e.status === "visible" && (frozenAt === null || e.at <= frozenAt)),
    [room.entries, frozenAt],
  );

  const called = useCalledEntry(entries, room.synced);
  const mission = MISSIONS[room.round];
  const stats = forecast(entries);
  const lobby = room.round === "lobby";

  return (
    <main className="relative grid h-dvh grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-[2.5vw] overflow-hidden p-[2.2vw]">
      <section className="flex min-h-0 flex-col">
        <header className="flex items-center justify-between gap-6">
          <h1>
            <Logo size="4.6vw" spinning />
          </h1>
          <p className="num text-[1.7vw] font-medium uppercase text-ink-soft">{ROUND_LABEL[room.round]}</p>
        </header>

        {lobby ? (
          <Lobby online={room.presence.online} />
        ) : (
          <>
            {mission && (
              <p className="mt-[0.8vw] text-[1.6vw] leading-tight">
                <b className="num uppercase">Misión:</b> {mission.title}
              </p>
            )}
            <div className="relative mx-auto mt-[0.6vw] aspect-[280/236] max-w-full min-h-0 flex-1">
              <Radar entries={entries} busy={room.presence.typing > 2 || entries.length > 20} />
              <AnimatePresence>{called && room.round !== "results" && <CalledCard key={called.id} entry={called} />}</AnimatePresence>
            </div>
            <RadarLegend />
          </>
        )}
      </section>

      <aside className="flex min-h-0 flex-col gap-[1.6vw]">
        {lobby ? (
          <div className="relative flex-1">
            <Radar entries={[]} busy={false} />
          </div>
        ) : (
          <ForecastPanel stats={stats} results={room.round === "results"} />
        )}
        <LiveStrip online={room.presence.online} typing={room.presence.typing} showQr={!lobby} />
      </aside>

      <FloatingReactions items={floating} />

      <AnimatePresence>
        {room.frozen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="num absolute left-1/2 top-[2vw] flex -translate-x-1/2 items-center gap-3 rounded-full bg-ink px-6 py-2 text-[1.5vw] font-bold uppercase text-paper shadow-[0_8px_24px_rgb(29_43_54/.25)]"
          >
            <Pause className="size-[1.4vw]" aria-hidden /> Pausa del presentador
          </motion.div>
        )}
      </AnimatePresence>
      {room.connection !== "open" && (
        <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-r1 px-4 py-1 text-sm font-semibold text-ink">
          Reconectando…
        </p>
      )}
    </main>
  );
}

/** The newest message is "called" for the whole room before it settles onto the radar. */
function useCalledEntry(entries: Entry[], synced: boolean) {
  const seen = useRef<Set<string> | null>(null);
  const [called, setCalled] = useState<Entry | null>(null);
  useEffect(() => {
    if (!synced) return;
    if (seen.current === null) {
      seen.current = new Set(entries.map((e) => e.id));
      return;
    }
    const fresh = entries.filter((e) => !seen.current!.has(e.id));
    fresh.forEach((e) => seen.current!.add(e.id));
    if (fresh.length) setCalled(fresh[fresh.length - 1]);
  }, [entries, synced]);
  useEffect(() => {
    if (!called) return;
    const t = setTimeout(() => setCalled(null), CALL_MS);
    return () => clearTimeout(t);
  }, [called]);
  return called;
}

function CalledCard({ entry }: { entry: Entry }) {
  const a = entry.analysis;
  const { x, y } = echoPosition(entry);
  const color = VERDICT_COLOR[a.verdict];
  return (
    <motion.article
      className="absolute w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-[14px] bg-sheet p-[1.6vw] shadow-[0_18px_50px_rgb(29_43_54/.28)]"
      style={{ left: "50%", top: "50%" }}
      initial={{ opacity: 0, scale: 0.92, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ left: `${50 + (x / 280) * 100}%`, top: `${50 + (y / 236) * 100}%`, scale: 0.04, opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      aria-live="polite"
    >
      <p className="text-[1.45vw] leading-snug text-ink">“{entry.text}”</p>
      <div className="mt-[1.2vw] flex items-end justify-between gap-6 border-t border-graticule pt-[1vw]">
        <div>
          <p className="num text-[1.1vw] font-bold uppercase tracking-wide text-ink-soft">Probabilidad de estafa</p>
          <p className="num text-[5.2vw] font-bold leading-[0.9]" style={{ color }}>
            {pct(a.isScam)}
          </p>
        </div>
        <dl className="num grid grid-cols-2 gap-x-6 gap-y-1 text-right text-[1.25vw] font-medium uppercase">
          <dt className="text-ink-soft">Veredicto</dt>
          <dd className="font-bold">{VERDICT_LABEL[a.verdict]}</dd>
          <dt className="text-ink-soft">Tipo</dt>
          <dd className="font-bold">{SCAM_LABEL[a.scamType]}</dd>
          <dt className="text-ink-soft">Presión</dt>
          <dd className="font-bold">{PRESSURE_LEVELS[Math.round(a.pressure)]}</dd>
          <dt className="text-ink-soft">Seguridad de la IA</dt>
          <dd className="font-bold">{pct(a.typeConfidence)}</dd>
        </dl>
      </div>
    </motion.article>
  );
}

function Lobby({ online }: { online: number }) {
  return (
    <div className="flex min-h-0 flex-1 items-center gap-[3vw]">
      <div className="shrink-0 rounded-[16px] bg-sheet p-[1vw] shadow-[0_14px_40px_rgb(29_43_54/.18)]">
        <QR url={joinUrl} className="size-[min(56vh,27vw)] [&_svg]:size-full" />
      </div>
      <div className="min-w-0">
        <p className="num text-[4.6vw] font-bold uppercase leading-[0.9] text-balance">¿Te llegó un mensaje raro?</p>
        <p className="mt-[1.4vw] max-w-[28ch] text-[1.7vw] leading-snug text-ink-soft">
          Escanea, pégalo y la IA te dice en menos de un segundo qué tan probable es que sea estafa.
        </p>
        <p className="num mt-[2vw] text-[2.2vw] font-bold">{new URL(joinUrl).host}/jugar</p>
        <p className="mt-[1vw] flex items-center gap-2 text-[1.4vw] text-ink-soft">
          <Smartphone className="size-[1.4vw]" aria-hidden />
          <span>
            <b className="num text-[1.8vw] text-ink">{online}</b> {online === 1 ? "celular conectado" : "celulares conectados"}
          </span>
        </p>
      </div>
    </div>
  );
}

function ForecastPanel({ stats, results }: { stats: ReturnType<typeof forecast>; results: boolean }) {
  const pressureLabel = stats.count ? PRESSURE_LEVELS[Math.round(stats.avgPressure)] : "—";
  const top = stats.byType.slice(0, 5);
  const max = Math.max(1, ...top.map((t) => t.count));
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h2 className="num text-[1.5vw] font-bold uppercase text-ink-soft">
        {results ? "El parte final de la sala" : "Parte de estafas de la sala"}
      </h2>

      <div className="mt-[0.6vw] flex items-end gap-[1.2vw]">
        <p className="num text-[8.5vw] font-bold leading-[0.8]" style={{ color: stats.count ? riskColor(stats.scamShare) : undefined }}>
          {stats.count ? pct(stats.scamShare) : "—"}
        </p>
        <p className="pb-[0.5vw] text-[1.35vw] leading-tight text-ink-soft">
          de los mensajes
          <br />
          <b className="text-ink">son estafa</b>
        </p>
      </div>

      <dl className="mt-[1.6vw] grid grid-cols-3 gap-[1vw] border-y border-graticule py-[1vw]">
        <Stat label="Analizados" value={String(stats.count)} />
        <Stat label="Presión media" value={pressureLabel} small />
        <Stat label="La sala acertó" value={stats.agreement === null ? "—" : pct(stats.agreement)} />
      </dl>

      <h3 className="num mt-[1.4vw] text-[1.2vw] font-bold uppercase text-ink-soft">Por tipo</h3>
      <ul className="mt-[0.5vw] flex flex-col gap-[0.55vw]">
        {top.length === 0 && <li className="text-[1.3vw] text-ink-faint">Esperando los primeros ecos…</li>}
        {top.map((t) => (
          <li key={t.type} className="grid grid-cols-[minmax(0,9fr)_minmax(0,10fr)_2.6vw] items-center gap-[0.8vw]">
            <span className="num truncate text-[1.5vw] font-medium uppercase">{SCAM_LABEL[t.type]}</span>
            <motion.span
              className="h-[1vw] rounded-full"
              style={{ background: riskColor(t.avgRisk) }}
              animate={{ width: `${(t.count / max) * 100}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
            <span className="num text-right text-[1.5vw] font-bold">{t.count}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex items-center gap-[0.8vw] pt-[1vw] text-[1.2vw] text-ink-soft">
        <Zap className="size-[1.3vw] text-r2" aria-hidden />
        <span>
          Jev decide en <b className="num text-[1.6vw] text-ink">{stats.count ? `${Math.round(stats.avgLatencyMs)} ms` : "—"}</b> · toda la sala
          costó <b className="num text-[1.6vw] text-ink">{usd(stats.totalCostUsd)}</b>
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="num text-[1vw] font-bold uppercase text-ink-soft">{label}</dt>
      <dd className={`num font-bold leading-none ${small ? "mt-[0.4vw] text-[1.7vw]" : "text-[3vw]"}`}>{value}</dd>
    </div>
  );
}

function LiveStrip({ online, typing, showQr }: { online: number; typing: number; showQr: boolean }) {
  return (
    <div className="flex items-center justify-between gap-[1vw]">
      <div className="text-[1.25vw] text-ink-soft">
        <p className="flex items-center gap-2">
          <span className="relative flex size-[0.8vw]">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-r3 opacity-60" />
            <span className="relative inline-flex size-full rounded-full bg-r3" />
          </span>
          <b className="num text-[1.6vw] text-ink">{online}</b> conectados
        </p>
        <AnimatePresence>
          {typing > 0 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-1 flex items-center gap-2">
              <PenLine className="size-[1.2vw]" aria-hidden />
              <b className="num text-[1.6vw] text-ink">{typing}</b> {typing === 1 ? "persona escribiendo" : "personas escribiendo"}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      {showQr && (
        <div className="flex items-center gap-[0.8vw]">
          <p className="num text-right text-[1.1vw] font-bold uppercase leading-tight text-ink-soft">
            Entra
            <br />y participa
          </p>
          <div className="rounded-[10px] bg-sheet p-[0.4vw]">
            <QR url={joinUrl} className="size-[8vw] [&_svg]:size-full" />
          </div>
        </div>
      )}
    </div>
  );
}
