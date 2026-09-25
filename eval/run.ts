// Accuracy check for the production Jev questions against real-world Peruvian messages.
// Run: npm run eval  (needs OPENROUTER_API_KEY in .env)
import { readFileSync } from "node:fs";
import { analyze } from "../worker/jev";
import { maskPersonalData } from "../shared/mask";
import type { Analysis, ScamType } from "../shared/types";

type Expect = "scam" | "safe" | "flag" | "notscam";
interface Case { group: string; expect: Expect; type?: ScamType; text: string; knownLimit?: boolean }

const { cases } = JSON.parse(readFileSync(new URL("./cases.json", import.meta.url), "utf8")) as { cases: Case[] };
const key = process.env.OPENROUTER_API_KEY;
if (!key) throw new Error("OPENROUTER_API_KEY missing: run with --env-file=.env");

const passes = (e: Expect, a: Analysis) =>
  e === "flag" ? a.verdict !== "safe" : e === "notscam" ? a.verdict !== "scam" : a.verdict === e;

const results: { c: Case; a: Analysis; ok: boolean; typeOk: boolean }[] = [];
const queue = [...cases];
await Promise.all(
  Array.from({ length: 8 }, async () => {
    for (let c; (c = queue.shift()); ) {
      const a = await analyze(maskPersonalData(c.text), key);
      results.push({ c, a, ok: passes(c.expect, a), typeOk: !c.type || a.scamType === c.type });
    }
  }),
);

const failed = results.filter((r) => (!r.ok || !r.typeOk) && !r.c.knownLimit);
for (const r of results.filter((r) => r.c.knownLimit)) console.log(`~ known limit [${r.c.group}] ${r.a.verdict} (scam ${r.a.isScam.toFixed(2)})
    ${r.c.text}`);
for (const r of failed) {
  const why = !r.ok ? `expected ${r.c.expect}, got ${r.a.verdict}` : `expected type ${r.c.type}, got ${r.a.scamType}`;
  console.log(`✗ [${r.c.group}] ${why} (scam ${r.a.isScam.toFixed(2)}, money ${r.a.asksMoneyOrData.toFixed(2)}, pressure ${r.a.pressure.toFixed(1)})\n    ${r.c.text}`);
}

const groups = [...new Set(cases.map((c) => c.group))];
console.log("\ngroup          verdict   type");
for (const g of groups) {
  const of = results.filter((r) => r.c.group === g);
  const typed = of.filter((r) => r.c.type);
  const v = of.filter((r) => r.ok).length;
  const t = typed.filter((r) => r.typeOk).length;
  console.log(`${g.padEnd(14)} ${`${v}/${of.length}`.padEnd(9)} ${typed.length ? `${t}/${typed.length}` : "-"}`);
}
const verdictAcc = results.filter((r) => r.ok).length / results.length;
const typed = results.filter((r) => r.c.type);
const typeAcc = typed.filter((r) => r.typeOk).length / typed.length;
const falseAlarms = results.filter((r) => r.c.expect === "safe" && r.a.verdict === "scam").length;
console.log(`\nverdict ${(verdictAcc * 100).toFixed(0)}% · type ${(typeAcc * 100).toFixed(0)}% · legit flagged as scam: ${falseAlarms} · ${results.length} cases`);
process.exit(failed.length ? 1 : 0);
