import { AnimatePresence, motion } from "motion/react";
import type { Reaction } from "../../shared/types";

export interface Floating {
  id: number;
  reaction: Reaction;
  x: number;
}

/** Emoji reactions from the audience rise from the bottom edge like weather balloons. */
export function FloatingReactions({ items }: { items: Floating[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <AnimatePresence>
        {items.map((f) => (
          <motion.span
            key={f.id}
            className="absolute bottom-0 text-6xl"
            style={{ left: `${f.x}%` }}
            initial={{ y: 40, opacity: 0, scale: 0.6 }}
            animate={{ y: -520, opacity: [0, 1, 1, 0], scale: 1, x: [0, 18, -14, 8] }}
            transition={{ duration: 3.2, ease: "easeOut" }}
          >
            {f.reaction}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
