import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { SCAM_TYPES, type Entry, type Verdict } from "../../shared/types";
import { SCAM_LABEL, VERDICT_COLOR, VERDICT_LABEL } from "../lib/copy";

const SECTOR = 360 / SCAM_TYPES.length;
const FADE_AFTER_MS = 4 * 60_000;
// Radius maps the scam probability; the zone edges sit exactly on the verdict thresholds.
const R0 = 12;
const R1 = 96;
const rOf = (p: number) => R0 + (R1 - R0) * p;
const ZONES: { verdict: Verdict; from: number; to: number }[] = [
  { verdict: "safe", from: 0, to: 0.3 },
  { verdict: "doubtful", from: 0.3, to: 0.7 },
  { verdict: "scam", from: 0.7, to: 1 },
];

/** Stable pseudo-random in [0,1) per message, so an echo never jumps between renders. */
function hash01(id: string, salt: number) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10_000) / 10_000;
}

/** Where a message lands: sector by fraud type, distance from the room by scam probability. */
export function echoPosition(entry: Entry) {
  const sector = SCAM_TYPES.indexOf(entry.analysis.scamType);
  const angle = (sector + 0.15 + 0.7 * hash01(entry.id, 1)) * SECTOR - 90;
  // Keep every echo inside its verdict's zone, including verdicts raised by our own rules.
  const { isScam, verdict } = entry.analysis;
  const p = verdict === "doubtful" ? Math.min(0.66, Math.max(0.34, isScam)) : verdict === "safe" ? Math.min(0.26, isScam) : Math.max(0.74, isScam);
  const radius = Math.min(R1 - 4, rOf(p) + 5 * (hash01(entry.id, 2) - 0.5));
  const rad = (angle * Math.PI) / 180;
  return { x: radius * Math.cos(rad), y: radius * Math.sin(rad) };
}

function ring(from: number, to: number) {
  const a = rOf(from);
  const b = rOf(to);
  // Annulus as one path: outer circle clockwise, inner counter-clockwise.
  return `M ${b} 0 A ${b} ${b} 0 1 1 ${-b} 0 A ${b} ${b} 0 1 1 ${b} 0 Z M ${a} 0 A ${a} ${a} 0 1 0 ${-a} 0 A ${a} ${a} 0 1 0 ${a} 0 Z`;
}

function Echo({ entry, now, latest }: { entry: Entry; now: number; latest: boolean }) {
  const { x, y } = echoPosition(entry);
  const color = VERDICT_COLOR[entry.analysis.verdict];
  const size = 3.4 + entry.analysis.pressure * 1.3;
  const age = Math.min(1, (now - entry.at) / FADE_AFTER_MS);
  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 - age * 0.3 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      style={{ transformBox: "fill-box", transformOrigin: "center" }}
    >
      <circle cx={x} cy={y} r={size * 1.9} fill={color} opacity={0.22} />
      <circle cx={x} cy={y} r={size} fill={color} stroke="var(--color-sheet)" strokeWidth=".8" />
      {latest && (
        <motion.circle
          cx={x}
          cy={y}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth=".9"
          initial={{ r: size, opacity: 0.9 }}
          animate={{ r: size * 3.2, opacity: 0 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        />
      )}
    </motion.g>
  );
}

export function Radar({ entries, busy }: { entries: Entry[]; busy: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);
  const latestId = entries.at(-1)?.id;
  const reduceMotion = useReducedMotion();

  return (
    <svg viewBox="-140 -118 280 236" className="h-full w-full" role="img" aria-label={`Radar con ${entries.length} mensajes analizados`}>
      <defs>
        <linearGradient id="sweep-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-ink)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--color-ink)" stopOpacity="0.14" />
        </linearGradient>
      </defs>

      <circle r={R1} fill="var(--color-sheet)" />
      {ZONES.map((z) => (
        <path key={z.verdict} d={ring(z.from, z.to)} fillRule="evenodd" fill={VERDICT_COLOR[z.verdict]} opacity={0.12} />
      ))}
      {[0.3, 0.7].map((p) => (
        <circle key={p} r={rOf(p)} fill="none" stroke="var(--color-ink)" strokeOpacity=".35" strokeWidth=".5" strokeDasharray="1.6 1.6" />
      ))}
      <circle r={R1} fill="none" stroke="var(--color-ink)" strokeOpacity=".55" strokeWidth=".7" />

      {SCAM_TYPES.map((type, i) => {
        const a = ((i * SECTOR - 90) * Math.PI) / 180;
        const mid = (((i + 0.5) * SECTOR - 90) * Math.PI) / 180;
        return (
          <g key={type}>
            <line x1={R0 * Math.cos(a)} y1={R0 * Math.sin(a)} x2={R1 * Math.cos(a)} y2={R1 * Math.sin(a)} stroke="var(--color-graticule)" strokeWidth=".5" />
            <text x={113 * Math.cos(mid)} y={112 * Math.sin(mid)} textAnchor="middle" dominantBaseline="middle" className="num" fontSize="6.6" fontWeight="700" fill="var(--color-ink-soft)">
              {SCAM_LABEL[type].toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* Zone names along the vertical spoke, inside each band. */}
      {ZONES.map((z) => (
        <text key={z.verdict} x="2" y={-rOf((z.from + z.to) / 2)} dominantBaseline="middle" className="num" fontSize="4.6" fontWeight="700" fill="var(--color-ink)" opacity=".7">
          {VERDICT_LABEL[z.verdict].toUpperCase()}
        </text>
      ))}

      {/* SVG-native rotation pivots on the radar center (0,0); CSS transform-origin would pivot on the viewBox corner. */}
      <g>
        {!reduceMotion && <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur={busy ? "3.2s" : "7s"} repeatCount="indefinite" />}
        <path d={`M0 0 L${R1} 0 A${R1} ${R1} 0 0 0 ${R1 * Math.cos(Math.PI / 6)} ${-R1 * Math.sin(Math.PI / 6)} Z`} fill="url(#sweep-fade)" transform="rotate(30)" />
        <line x1="0" y1="0" x2={R1} y2="0" stroke="var(--color-ink)" strokeOpacity=".5" strokeWidth=".7" />
      </g>

      <AnimatePresence>
        {entries.map((e) => (
          <Echo key={e.id} entry={e} now={now} latest={e.id === latestId} />
        ))}
      </AnimatePresence>

      <circle r={R0 - 3} fill="var(--color-ink)" />
      <text textAnchor="middle" dominantBaseline="middle" className="num" fontSize="4" fontWeight="700" fill="var(--color-paper)">
        SALA
      </text>
    </svg>
  );
}

/** One line under the radar so nobody has to guess what they are looking at. */
export function RadarLegend() {
  return (
    <p className="text-center text-[1.15vw] text-ink-soft">
      Cada punto es un mensaje · más lejos de la sala = más probable que sea estafa · más grande = más presión
    </p>
  );
}
