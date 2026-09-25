import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Dices, Loader2, Monitor, Send, ShieldAlert, ShieldCheck, ShieldQuestion, EyeOff, Clock3 } from "lucide-react";
import { REACTIONS, type Entry, type Guess, type Reaction } from "../../shared/types";
import { useRoom } from "../lib/useRoom";
import { MISSIONS, PRESSURE_LEVELS, SCAM_LABEL, VERDICT_COLOR, VERDICT_LABEL, ZONE_NAME, pct, riskColor } from "../lib/copy";

const MAX = 400;
const REACTION_LABEL: Record<Reaction, string> = { "😱": "Qué miedo", "😂": "Qué risa", "🤔": "Qué raro", "🚩": "Bandera roja", "👏": "Aplausos" };

function clientId() {
  try {
    const saved = localStorage.getItem("radar-client");
    if (saved) return saved;
    const id = crypto.randomUUID();
    localStorage.setItem("radar-client", id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function Play() {
  const room = useRoom("play");
  const mission = MISSIONS[room.round];
  const [text, setText] = useState("");
  const [guess, setGuess] = useState<Guess>("unsure");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Entry | null>(null);
  const idRef = useRef(clientId());
  const lastTyping = useRef(0);

  useEffect(() => {
    setResult(null);
    setText("");
    setError(null);
  }, [room.round]);

  const onType = (value: string) => {
    setText(value.slice(0, MAX));
    if (Date.now() - lastTyping.current > 2000) {
      lastTyping.current = Date.now();
      room.send({ type: "typing" });
    }
  };

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, guess, clientId: idRef.current }),
      });
      const data = (await res.json()) as { entry?: Entry; error?: string };
      if (!res.ok || !data.entry) throw new Error(data.error ?? "Algo falló. Prueba de nuevo.");
      setResult(data.entry);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sin conexión. Revisa tus datos o el wifi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-28 pt-5">
      <header className="flex items-center justify-between">
        <p className="num text-2xl font-bold uppercase">Radar Anti-Estafas</p>
        <p className="flex items-center gap-1.5 text-sm text-ink-soft">
          <span className={`size-2 rounded-full ${room.connection === "open" ? "bg-r0" : "bg-r1"}`} aria-hidden />
          {room.connection === "open" ? "En vivo" : "Conectando…"}
        </p>
      </header>

      <AnimatePresence mode="wait">
        {!mission ? (
          <Waiting key={room.round} results={room.round === "results"} />
        ) : result ? (
          <Result key={result.id} entry={result} onAgain={() => { setResult(null); setText(""); setGuess("unsure"); }} />
        ) : (
          <motion.section
            key={`form-${room.round}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 flex flex-col"
          >
            <h1 className="num text-[2.4rem] font-bold uppercase leading-[0.95]">{mission.title}</h1>
            <p className="mt-2 text-[15px] leading-snug text-ink-soft">{mission.hint}</p>

            <label htmlFor="msg" className="sr-only">Tu mensaje</label>
            <textarea
              id="msg"
              value={text}
              onChange={(e) => onType(e.target.value)}
              rows={6}
              placeholder="Pega o escribe aquí el mensaje…"
              className="mt-5 w-full resize-none rounded-[14px] border border-graticule bg-sheet p-4 text-[16px] leading-relaxed text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
            />
            <div className="mt-1.5 flex items-center justify-between text-xs text-ink-faint">
              <span>Tapamos números, correos y tarjetas.</span>
              <span className="num text-sm">{text.length}/{MAX}</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {mission.chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => onType(chip.replace("…", " "))}
                  className="rounded-full border border-graticule bg-sheet px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink"
                >
                  {chip}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onType(mission.examples[Math.floor(Math.random() * mission.examples.length)])}
                className="flex items-center gap-1.5 rounded-full bg-paper-deep px-3 py-1.5 text-sm font-semibold text-ink"
              >
                <Dices className="size-4" aria-hidden /> Dame un ejemplo
              </button>
            </div>

            <fieldset className="mt-6">
              <legend className="num text-lg font-bold uppercase">Antes de enviarlo, ¿tú qué crees?</legend>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {([
                  ["scam", "Es estafa"],
                  ["safe", "Es normal"],
                  ["unsure", "No sé"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={guess === value}
                    onClick={() => setGuess(value)}
                    className={`rounded-[12px] border px-2 py-3 text-[15px] font-semibold transition-colors ${
                      guess === value ? "border-ink bg-ink text-paper" : "border-graticule bg-sheet text-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {error && (
              <p role="alert" className="mt-4 rounded-[12px] bg-r1/30 px-4 py-3 text-[15px] text-ink">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={sending || text.trim().length < 8}
              className="mt-5 flex items-center justify-center gap-2 rounded-[14px] bg-ink px-5 py-4 text-lg font-semibold text-paper transition-opacity disabled:opacity-40"
            >
              {sending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Send className="size-5" aria-hidden />}
              {sending ? "Analizando…" : "Analizar mensaje"}
            </button>
          </motion.section>
        )}
      </AnimatePresence>

      <ReactionBar onReact={(reaction) => room.send({ type: "react", reaction })} />
    </main>
  );
}

function Waiting({ results }: { results: boolean }) {
  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-14">
      <h1 className="num text-[2.8rem] font-bold uppercase leading-[0.95]">{results ? "¡Gracias por participar!" : "Ya estás dentro"}</h1>
      <p className="mt-3 text-[17px] leading-snug text-ink-soft">
        {results
          ? "Mira la pantalla: ahí está el parte final de toda la sala."
          : "Cuando se abra la ronda, aquí aparecerá tu misión. Mientras tanto, reacciona abajo 👇"}
      </p>
    </motion.section>
  );
}

function Result({ entry, onAgain }: { entry: Entry; onAgain: () => void }) {
  const a = entry.analysis;
  const color = VERDICT_COLOR[a.verdict];
  const Icon = a.verdict === "scam" ? ShieldAlert : a.verdict === "safe" ? ShieldCheck : ShieldQuestion;
  const matched = entry.guess !== "unsure" && a.verdict !== "doubtful" ? (entry.guess === "scam") === (a.verdict === "scam") : null;
  const screen =
    entry.status === "visible"
      ? { Icon: Monitor, text: `¡Ya está en la pantalla! Búscalo en la zona ${ZONE_NAME[a.verdict]} del radar, sector «${SCAM_LABEL[a.scamType]}». Es el punto que late.` }
      : entry.status === "pending"
        ? { Icon: Clock3, text: "El presentador lo revisará antes de mostrarlo." }
        : { Icon: EyeOff, text: "Este mensaje no se mostrará en pantalla." };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mt-6"
      aria-live="polite"
    >
      <div className="rounded-[16px] bg-sheet p-5 shadow-[0_10px_30px_rgb(29_43_54/.12)]">
        <p className="flex items-center gap-2 num text-xl font-bold uppercase" style={{ color }}>
          <Icon className="size-6" aria-hidden /> {VERDICT_LABEL[a.verdict]}
        </p>
        <p className="num mt-1 text-[5rem] font-bold leading-[0.85]" style={{ color }}>
          {pct(a.isScam)}
        </p>
        <p className="text-[15px] text-ink-soft">de probabilidad de que sea estafa</p>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-paper-deep">
          <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: pct(a.isScam) }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-[15px]">
          <div>
            <dt className="text-ink-soft">Tipo</dt>
            <dd className="font-semibold">{SCAM_LABEL[a.scamType]}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">¿Pide plata o datos?</dt>
            <dd className="font-semibold">{a.asksMoneyOrData >= 0.5 ? "Sí" : "No"} <span className="text-ink-soft">({pct(a.asksMoneyOrData)})</span></dd>
          </div>
          <div className="col-span-2">
            <dt className="text-ink-soft">{PRESSURE_LEVELS[Math.round(a.pressure)]}</dt>
            <dd className="mt-1.5 grid grid-cols-4 gap-1" aria-label={`Presión ${a.pressure.toFixed(1)} de 3`}>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="h-2 rounded-full" style={{ background: i <= Math.round(a.pressure) ? riskColor(0.2 + i * 0.22) : "var(--color-paper-deep)" }} />
              ))}
            </dd>
          </div>
        </dl>

        <p className="mt-5 border-t border-graticule pt-4 text-[14px] leading-snug text-ink-soft">
          La IA está <b className="text-ink">{pct(a.typeConfidence)}</b> segura del tipo y respondió en{" "}
          <b className="num text-base text-ink">{a.latencyMs} ms</b>.
        </p>
      </div>

      {matched !== null && (
        <p className="mt-4 text-[16px] font-semibold">
          {matched ? "¡Coincidiste con la IA!" : "Tú y la IA no coincidieron. ¿Quién tendrá razón?"}
        </p>
      )}
      <p className="mt-3 flex items-start gap-2 text-[15px] text-ink-soft">
        <screen.Icon className="mt-0.5 size-5 shrink-0" aria-hidden /> {screen.text}
      </p>

      <button type="button" onClick={onAgain} className="mt-6 w-full rounded-[14px] border border-ink px-5 py-3.5 text-lg font-semibold">
        Probar otro mensaje
      </button>
    </motion.section>
  );
}

function ReactionBar({ onReact }: { onReact: (r: Reaction) => void }) {
  const [burst, setBurst] = useState<{ id: number; r: Reaction } | null>(null);
  return (
    <nav aria-label="Reacciones" className="fixed inset-x-0 bottom-0 border-t border-graticule bg-paper/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
      <div className="mx-auto flex max-w-md justify-between">
        {REACTIONS.map((r) => (
          <motion.button
            key={r}
            type="button"
            aria-label={REACTION_LABEL[r]}
            whileTap={{ scale: 1.35 }}
            onClick={() => {
              onReact(r);
              setBurst({ id: Date.now(), r });
            }}
            className="relative grid size-14 place-items-center rounded-full bg-sheet text-3xl"
          >
            {r}
            <AnimatePresence>
              {burst?.r === r && (
                <motion.span
                  key={burst.id}
                  className="pointer-events-none absolute text-3xl"
                  initial={{ y: 0, opacity: 1 }}
                  animate={{ y: -60, opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  aria-hidden
                >
                  {r}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>
    </nav>
  );
}
