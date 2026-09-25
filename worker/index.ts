export { Room } from "./room";

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    if (!pathname.startsWith("/api/")) return new Response("Not found", { status: 404 });
    // Single room for the talk. Add an event code to idFromName() to run several rooms.
    return env.ROOM.get(env.ROOM.idFromName("main")).fetch(req);
  },
} satisfies ExportedHandler<Env>;
