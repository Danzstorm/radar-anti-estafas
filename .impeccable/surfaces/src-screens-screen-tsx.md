---
version: 1
slug: "src-screens-screen-tsx"
primary_target: "src/screens/Screen.tsx"
related_targets: ["src/screens/Play.tsx","src/screens/Control.tsx"]
---

## Scope

Live-talk surfaces of Radar Anti-Estafas: `/pantalla` (projector, Experience mode, primary), `/jugar` (attendee phone, Operate), `/control` (presenter, Operate). All three share one world.

Scene: a lit meeting room in Lima, projector washed out by room light, fewer than 50 people with phones; the projector must read from the back row, so the world is light-ground and high-contrast.

## Direction contract

THESIS: The room is a weather forecast. Jev states "probabilidad de estafa" the way the TV weather states chance of rain; each message is an echo on a weather radar. Refuses the category default of a chat-bubble feed plus KPI cards, and refuses the dark neon "hacker" radar.

OWN-WORLD: Light cartographic ground (pale map paper, fine graticule rings, sector spokes), deep ink navy for type, and the reflectivity ramp green→yellow→orange→red→magenta as the only saturated color, always meaning risk. Echo blobs, sweep line, range rings, a forecast "parte" panel with big numerals like a TV weather board. Verdict never by color alone: word + icon + number.

STORY: The audience sees their own message "called" big, then drop onto the radar in its fraud-type sector at a distance by risk; the forecast panel updates (count, % scam, avg pressure, latency, cost, room vs AI). They understand Jev decides with probabilities; our code draws the rules.

FIRST VIEWPORT: Lobby: giant QR left third with the invitation; radar right sweeping empty with live "conectados" count. Round: radar fills left ~62%, forecast panel right; newest message called as a card overlaying the radar's top-left for 6s; small QR bottom-right.

FORM: Radar del clima de estafas, candidate 7 of 7 on the grounded list, seed fca92f87. Signature interaction: the called card shrinks into its echo on the radar. Motion grammar: continuous sweep; echoes fade with age (raised from plankton); sweep speeds up with activity (raised from riley); called card (raised from loteria).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
