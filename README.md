# Radar Anti-Estafas

Live audience demo for a tech talk: attendees scan a QR, paste a suspicious message, and
[Jev](https://docs.typesafe.ai/introduction) (TypeSafe's System One model) answers in under a second
how likely it is to be a scam. The projector shows the whole room as a weather radar.

| Route | Who | What |
|---|---|---|
| `/jugar` | Attendees (QR) | Write or paste a message, guess, get a personal verdict, send reactions |
| `/pantalla` | Projector | Lobby QR, live radar of echoes, room forecast, floating reactions |
| `/control` | Presenter | Rounds, moderation, freeze, reset (token protected) |

## How it works

- **One Jev call per message** with five typed questions (`noul`, `choice`, `score`), via the
  [OpenRouter Decisions API](https://openrouter.ai/typesafe/jev-1.13). Instructions in English, messages in Spanish.
- **Our code owns the rules**: verdict tiers, a composite risk index, and moderation thresholds live in `worker/`.
- **Personal data is masked** (phones, emails, cards, IBAN, link paths) before analysis or display.
- **Realtime** through one Cloudflare Durable Object with hibernating WebSockets.

## Run locally

```bash
npm install
cp .dev.vars.example .dev.vars   # then fill in the values
npm run dev
```

## Deploy

```bash
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler secret put CONTROL_TOKEN
npm run deploy
```

Stack: React 19, Vite, Tailwind v4, Motion, Cloudflare Workers + Durable Objects.
