import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SCAM_TYPES, type Entry } from "../../shared/types";
import { SCAM_LABEL } from "../lib/copy";

const RAMP = ["var(--color-r0)", "var(--color-r1)", "var(--color-r2)", "var(--color-r3)", "var(--color-r4)"];
const SECTOR = 360 / SCAM_TYPES.length;
const FADE_AFTER_MS = 4 * 60_000;

/** Stable pseudo-random in [0,1) per message, so an echo never jumps between renders. */
function hash01(id: string, salt: number) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10_000) / 10_000;
}

/** Where a message lands: sector by fraud type, distance from the station by risk. */
export function echoPosition(entry: Entry) {
  const sector = SCAM_TYPES.indexOf(entry.analysis.scamType);
  const angle = (sector + 0.18 + 0.64 * hash01(entry.id, 1)) * SECTOR - 90;
  const radius = 16 + 74 * entry.analysis.risk + 6 * (hash01(entry.id, 2) - 0.5);
  const rad = (angle * Math.PI) / 180;
  return { x: radius * Math.cos(rad), y: radius * Math.sin(rad) };
}

function Echo({ entry, now }: { entry: Entry; now: number }) {
  const { x, y } = echoPosition(entry);
  const level = Math.min(4, Math.floor(entry.analysis.risk * 5));
  const size = 4.2 + entry.analysis.pressure * 1.6;
  const age = Math.min(1, (now - entry.at) / FADE_AFTER_MS);
  // Reflectivity cell: outer bands are weaker returns, the core carries the message's risk color.
  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 - age * 0.6 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      style={{ transformOrigin: `${x}px ${y}px` }}
    >
      {RAMP.slice(0, level + 1).map((color, i) => (
        <circle key={i} cx={x} cy={y} r={size * (1 - i / (level + 1.6))} fill={color} opacity={i === level ? 1 : 0.55} />
      ))}
    </motion.g>
  );
}

export function Radar({ entries, busy }: { entries: Entry[]; busy: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <svg viewBox="-140 -118 280 236" className="h-full w-full" role="img" aria-label={`Radar con ${entries.length} mensajes analizados`}>
      <defs>
        <radialGradient id="radar-sheet">
          <stop offset="0%" stopColor="var(--color-sheet)" />
          <stop offset="100%" stopColor="var(--color-paper-deep)" />
        </radialGradient>
        <linearGradient id="sweep-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-ink)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--color-ink)" stopOpacity="0.16" />
        </linearGradient>
      </defs>

      <circle r="100" fill="url(#radar-sheet)" stroke="var(--color-ink)" strokeOpacity=".5" strokeWidth=".6" />

      {SCAM_TYPES.map((type, i) => {
        const a = ((i * SECTOR - 90) * Math.PI) / 180;
        const mid = (((i + 0.5) * SECTOR - 90) * Math.PI) / 180;
        return (
          <g key={type}>
            <line x1="0" y1="0" x2={100 * Math.cos(a)} y2={100 * Math.sin(a)} stroke="var(--color-graticule)" strokeWidth=".45" />
            <text
              x={109 * Math.cos(mid)}
              y={109 * Math.sin(mid)}
              textAnchor="middle"
              dominantBaseline="middle"
              className="num"
              fontSize="6.6"
              fontWeight="700"
              fill="var(--color-ink-soft)"
            >
              {SCAM_LABEL[type].toUpperCase()}
            </text>
          </g>
        );
      })}

      {[25, 50, 75].map((r) => (
        <circle key={r} r={r} fill="none" stroke="var(--color-graticule)" strokeWidth=".45" strokeDasharray={r === 75 ? "0" : "1.4 1.6"} />
      ))}
      {[
        [30, "RIESGO BAJO"],
        [55, "MEDIO"],
        [80, "ALTO"],
      ].map(([r, label]) => (
        <text key={label} x="1.6" y={-(r as number) + 2.6} fontSize="3.6" className="num" fill="var(--color-ink-faint)" fontWeight="500">
          {label}
        </text>
      ))}

      <motion.g
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, ease: "linear", duration: busy ? 3.2 : 7 }}
        style={{ transformOrigin: "0px 0px" }}
      >
        <path d="M0 0 L100 0 A100 100 0 0 0 86.6 -50 Z" fill="url(#sweep-fade)" transform="rotate(30)" />
        <line x1="0" y1="0" x2="100" y2="0" stroke="var(--color-ink)" strokeOpacity=".55" strokeWidth=".7" />
      </motion.g>

      <AnimatePresence>
        {entries.map((e) => (
          <Echo key={e.id} entry={e} now={now} />
        ))}
      </AnimatePresence>

      <circle r="3.2" fill="var(--color-ink)" />
      <circle r="6.5" fill="none" stroke="var(--color-ink)" strokeWidth=".6" />
    </svg>
  );
}
