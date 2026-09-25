import { SCAM_TYPES, type Analysis, type ScamType, type Verdict } from "../shared/types";

const ENDPOINT = "https://openrouter.ai/api/alpha/decisions";
const MODEL = "typesafe/jev-1.13";

// Instructions stay in English (Jev's primary language); the state is the Spanish message itself.
// All questions go in a single call (speculative fan-out), each one is answered independently.
const QUESTIONS = {
  is_scam: {
    type: "noul",
    instructions: "Is `message` a scam, phishing or fraud attempt?",
    criteria: {
      true: "It tries to trick the reader into sending money, paying a fee, sharing credentials or personal data, or clicking a suspicious link, or it impersonates a relative, bank, company or authority.",
      false: "An ordinary personal, work or commercial message with no deceptive intent, even if it mentions money, payments or links.",
    },
  },
  scam_type: {
    type: "choice",
    instructions: "Which kind of message is `message`?",
    criteria: {
      family_impersonation: "Pretends to be a relative or friend in trouble, often with a new phone number",
      bank_phishing: "Pretends to be a bank or payment service asking to verify, unlock or confirm an account",
      parcel_delivery: "Fake parcel, courier or customs fee",
      prize_lottery: "Fake prize, giveaway, lottery or refund",
      investment: "Crypto, trading or get-rich-quick investment scheme",
      job_offer: "Fake job offer or easy money for simple tasks",
      legitimate: "Not a scam: a normal message",
    },
  },
  pressure: {
    type: "score",
    instructions: "How much psychological pressure does `message` put on the reader?",
    criteria: [
      "None: neutral tone",
      "Mild: polite request or soft deadline",
      "Strong: urgency, fear or emotional appeal",
      "Extreme: threats, immediate deadlines or demands for secrecy",
    ],
  },
  asks_money_or_data: {
    type: "noul",
    instructions: "Does `message` ask the reader to send money, make a payment, or share personal data, codes or passwords?",
  },
  is_offensive: {
    type: "noul",
    instructions: "Is `message` offensive, insulting, sexual, hateful or otherwise inappropriate to show on a public screen at a tech talk?",
  },
} as const;

interface JevResponse {
  answers: {
    is_scam: { noul: number };
    scam_type: { choice: ScamType; probabilities: Record<ScamType, number>; confidence: number };
    pressure: { score: number; probabilities: Record<string, number> };
    asks_money_or_data: { noul: number };
    is_offensive: { noul: number };
  };
  usage: { input_tokens: number; cost?: number };
}

export async function analyze(message: string, apiKey: string): Promise<Analysis> {
  const started = Date.now();
  const res = await callJev(message, apiKey);
  const { answers: a, usage } = res;

  const pressure = a.pressure.score;
  // Composite scoring: the model answers narrow questions, our code owns the weights.
  const risk = 0.5 * a.is_scam.noul + 0.3 * (pressure / 3) + 0.2 * a.asks_money_or_data.noul;

  return {
    isScam: a.is_scam.noul,
    scamType: a.scam_type.choice,
    typeProbabilities: Object.fromEntries(SCAM_TYPES.map((t) => [t, a.scam_type.probabilities[t] ?? 0])) as Record<ScamType, number>,
    typeConfidence: a.scam_type.confidence,
    pressure,
    pressureProbabilities: [0, 1, 2, 3].map((i) => a.pressure.probabilities[String(i)] ?? 0),
    asksMoneyOrData: a.asks_money_or_data.noul,
    offensive: a.is_offensive.noul,
    risk,
    verdict: verdictFor(a.is_scam.noul),
    latencyMs: Date.now() - started,
    inputTokens: usage.input_tokens,
    costUsd: usage.cost ?? (usage.input_tokens / 1e6) * 0.042,
  };
}

// Three tiers, as the Jev docs recommend: act when clear, flag the middle, never fake certainty.
function verdictFor(isScam: number): Verdict {
  if (isScam >= 0.7) return "scam";
  if (isScam <= 0.3) return "safe";
  return "doubtful";
}

async function callJev(message: string, apiKey: string): Promise<JevResponse> {
  const body = JSON.stringify({ model: MODEL, state: { message }, questions: QUESTIONS });
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "Radar Anti-Estafas" },
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return res.json();
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= 1) throw new Error(`Jev ${res.status}: ${await res.text()}`);
  }
}
