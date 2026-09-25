import { SCAM_TYPES, type Entry, type ScamType } from "../../shared/types";

export interface Forecast {
  count: number;
  scamShare: number;
  avgPressure: number;
  avgLatencyMs: number;
  totalCostUsd: number;
  /** Share of messages where the author's guess matched Jev; null until someone guessed. */
  agreement: number | null;
  byType: { type: ScamType; count: number; avgRisk: number }[];
}

export function forecast(entries: Entry[]): Forecast {
  const n = entries.length;
  const sum = (f: (e: Entry) => number) => entries.reduce((a, e) => a + f(e), 0);
  const guessed = entries.filter((e) => e.guess !== "unsure" && e.analysis.verdict !== "doubtful");
  const agreed = guessed.filter((e) => (e.guess === "scam") === (e.analysis.verdict === "scam")).length;

  const byType = SCAM_TYPES.map((type) => {
    const of = entries.filter((e) => e.analysis.scamType === type);
    return { type, count: of.length, avgRisk: of.length ? of.reduce((a, e) => a + e.analysis.isScam, 0) / of.length : 0 };
  })
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    count: n,
    scamShare: n ? entries.filter((e) => e.analysis.verdict === "scam").length / n : 0,
    avgPressure: n ? sum((e) => e.analysis.pressure) / n : 0,
    avgLatencyMs: n ? sum((e) => e.analysis.latencyMs) / n : 0,
    totalCostUsd: sum((e) => e.analysis.costUsd),
    agreement: guessed.length ? agreed / guessed.length : null,
    byType,
  };
}
