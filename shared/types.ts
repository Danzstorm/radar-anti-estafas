export const ROUNDS = ["lobby", "real", "fool", "falsePositive", "results"] as const;
export type Round = (typeof ROUNDS)[number];

export const SCAM_TYPES = [
  "family_impersonation",
  "bank_phishing",
  "parcel_delivery",
  "prize_lottery",
  "investment",
  "job_offer",
  "legitimate",
] as const;
export type ScamType = (typeof SCAM_TYPES)[number];

export type Verdict = "safe" | "doubtful" | "scam";
export type Guess = "scam" | "safe" | "unsure";
export type EntryStatus = "visible" | "pending" | "hidden";

export interface Analysis {
  isScam: number;
  scamType: ScamType;
  typeProbabilities: Record<ScamType, number>;
  typeConfidence: number;
  pressure: number;
  pressureProbabilities: number[];
  asksMoneyOrData: number;
  offensive: number;
  risk: number;
  verdict: Verdict;
  latencyMs: number;
  inputTokens: number;
  costUsd: number;
}

export interface Entry {
  id: string;
  text: string;
  round: Round;
  guess: Guess;
  analysis: Analysis;
  status: EntryStatus;
  at: number;
}

export interface Presence {
  online: number;
  typing: number;
}

export type ServerEvent =
  | { type: "snapshot"; round: Round; frozen: boolean; entries: Entry[]; presence: Presence }
  | { type: "entry"; entry: Entry }
  | { type: "status"; id: string; status: EntryStatus }
  | { type: "round"; round: Round }
  | { type: "frozen"; frozen: boolean }
  | { type: "presence"; presence: Presence }
  | { type: "reaction"; reaction: Reaction }
  | { type: "reset" };

export const REACTIONS = ["😱", "😂", "🤔", "🚩", "👏"] as const;
export type Reaction = (typeof REACTIONS)[number];

export type ClientEvent = { type: "typing" } | { type: "react"; reaction: Reaction };

export type ControlAction =
  | { action: "round"; round: Round }
  | { action: "status"; id: string; status: EntryStatus }
  | { action: "freeze"; frozen: boolean }
  | { action: "reset" };
