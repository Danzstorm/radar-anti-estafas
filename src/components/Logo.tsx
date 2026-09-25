import { motion } from "motion/react";

/**
 * Brand mark: the room at the center, the three verdict zones as rings, the sweep, and one
 * red echo caught at the edge. The same drawing as the favicon.
 */
export function LogoMark({ className, spinning = false }: { className?: string; spinning?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="24" cy="24" r="22" fill="var(--color-sheet)" />
      <circle cx="24" cy="24" r="22" fill="none" stroke="var(--color-r3)" strokeOpacity=".22" strokeWidth="7" />
      <circle cx="24" cy="24" r="14.5" fill="none" stroke="var(--color-r1)" strokeOpacity=".3" strokeWidth="8" />
      <circle cx="24" cy="24" r="8" fill="var(--color-r0)" fillOpacity=".22" />
      <circle cx="24" cy="24" r="22" fill="none" stroke="var(--color-ink)" strokeWidth="2.4" />
      <motion.g
        style={{ transformOrigin: "24px 24px" }}
        animate={spinning ? { rotate: 360 } : undefined}
        transition={spinning ? { repeat: Infinity, ease: "linear", duration: 6 } : undefined}
      >
        <path d="M24 24 L24 2.6 A21.4 21.4 0 0 1 42.5 13.3 Z" fill="var(--color-ink)" fillOpacity=".16" />
        <path d="M24 24 L42.5 13.3" stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" />
      </motion.g>
      <circle cx="36.4" cy="9.6" r="5.6" fill="var(--color-r3)" fillOpacity=".25" />
      <circle cx="36.4" cy="9.6" r="3.2" fill="var(--color-r3)" stroke="var(--color-sheet)" strokeWidth="1" />
      <circle cx="17.5" cy="29.5" r="2" fill="var(--color-r0)" />
      <circle cx="24" cy="24" r="3.4" fill="var(--color-ink)" />
    </svg>
  );
}

/** Mark plus stacked wordmark; `size` is the mark's height in any CSS length. */
export function Logo({ size = "3rem", spinning = false }: { size?: string; spinning?: boolean }) {
  return (
    <span className="inline-flex items-center gap-[0.28em]" style={{ fontSize: size }} role="img" aria-label="Radar Anti-Estafas">
      <LogoMark className="size-[1em] shrink-0" spinning={spinning} />
      <span className="num flex flex-col font-bold uppercase leading-[0.86]" aria-hidden>
        <span className="text-[0.56em] tracking-[0.02em]">Radar</span>
        <span className="text-[0.36em] tracking-[0.04em] text-r3">Anti-Estafas</span>
      </span>
    </span>
  );
}
