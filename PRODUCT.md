# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19 + Vite + Tailwind v4 + Motion, served by a Cloudflare Worker (static assets + API). Live state lives in one Durable Object ("the room") with hibernating WebSockets. Decisions come from TypeSafe's Jev (`typesafe/jev-1.13`) through the OpenRouter Decisions API; the key is a Worker secret. Deployed to `*.daniel-santos-emprende.workers.dev`.

## Users

- **Attendees** of a live tech talk in Peru (fewer than 50 people). They sit in a room with a projector, scan a QR with their phone, and take part for a few minutes. They are not technical by default; they all know suspicious WhatsApp/SMS messages first-hand.
- **Presenter** (one person, the talk host). Runs the session from a phone or laptop: opens rounds, moderates, freezes the wall, comments on messages live.

## Product Purpose

"Radar Anti-Estafas" shows, live and with the audience's own messages, how a System One model (Jev) makes fast typed decisions with calibrated probabilities. Attendees paste or write a suspicious message, get a personal verdict on their phone in under a second, and watch the room's picture build up on the projector. Success: the room understands what Jev does (decides, doesn't write; tells you how sure it is) and everyone participated at least once.

## Positioning

Not a chatbot demo. The model never writes text: it answers narrow questions (is it a scam? what kind? how much pressure? does it ask for money or data? is it offensive?) with probabilities and confidence, and our code owns the rules (thresholds, composite risk index, moderation). The audience sees the decision, the certainty, the latency and the cost in real time.

## Operating Context

- Three views: `/jugar` (attendee phone, reached via QR), `/pantalla` (projector, 16:9, viewed from the back of a room), `/control` (presenter, token-protected).
- Session flow: lobby with giant QR → round 1 "paste a real suspicious message" → round 2 "write the most believable scam" → round 3 "write a normal message that looks like a scam" → results summary.
- Interactions: missions per round, suggestion chips, "what do you think?" guess before sending, personal verdict card, "your message is on screen" notice, live typing counter, live emoji reactions from phones floating on the projector.
- Venue network is unknown; phones may be on mobile data.

## Capabilities and Constraints

- One Jev call per message with all questions (speculative fan-out). Instructions in English, message state in Spanish.
- Verdict tiers: scam (P ≥ 0.7), doubtful, safe (P ≤ 0.3). Risk index = 0.5·scam + 0.3·pressure/3 + 0.2·asks money/data.
- Personal data (phones, emails, cards, IBAN, link paths) is masked before analysis and display; link hosts are kept.
- Moderation: offensive ≥ 0.4 waits for presenter approval, ≥ 0.85 hidden; presenter can hide, show and freeze at any time. Moderation never relies on the model alone.
- Jev weaknesses to respect: numbers/dates (handle in code), literal reading, adversarial prompt injection (round 2 will surface this; treat as teaching moment).
- Undecided: "words that give it away" heatmap, "fooled the AI" ranking, audience vote mode (not in scope now).

## Brand Commitments

- UI copy in Spanish for a Peruvian audience: natural "tú", warm, human, never robotic or corporate. Sample and suggestion messages must read like real Peruvian WhatsApp/SMS (Yape, Plin, BCP, Interbank, BBVA, SUNAT, Olva/Serpost couriers, family "ma", informal spelling) so the demo does not feel basic or staged.
- Honest framing: probabilities are Jev's; the risk index and thresholds are ours and shown as such.

## Evidence on Hand

- Real Jev calls validated with Spanish messages: family impersonation 0.92–0.94, parcel fee 0.96–0.97, casual dinner invite 0.02; warm latency ~270–300 ms from the Worker; ~US$0.00002 per message.
- No testimonials, partners or usage numbers exist; none may be invented.

## Product Principles

1. The audience's own messages are the content; the UI stages them, never outshines them.
2. Show certainty, not just answers: every verdict carries its probability and confidence.
3. The model decides, our code governs — make the rules visible.
4. Nothing reaches the projector that the presenter could not stop.
5. Readable from the back of the room, usable with one thumb.

## Accessibility & Inclusion

Projector legibility at distance (large type, high contrast, color never the only signal for verdicts). Phone view works one-handed on small screens and slow connections; respects reduced motion.
