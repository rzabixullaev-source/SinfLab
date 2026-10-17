import { WebSocket, WebSocketServer } from "ws";
import { authenticateToken } from "../auth/auth.js";
import { classroomAccess } from "../../shared/access.js";
import { parseObjectId } from "../../shared/ids.js";
import { boardElementsSchema } from "./board.js";

const PATH = "/api/v1/live-signal";

export function attachLiveSignaling(server, { db, config }) {
  const rooms = new Map();
  const wss = new WebSocketServer({ noServer: true, maxPayload: 80 * 1024 });
  const send = (socket, message) => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  };

  server.on("upgrade", (request, socket, head) => {
    const path = new URL(request.url, "http://localhost").pathname;
    if (path !== PATH) return;
    if (request.headers.origin !== config.CORS_ORIGIN) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (client) => wss.emit("connection", client));
  });

  wss.on("connection", (socket) => {
    let identity = null;
    const timeout = setTimeout(() => socket.close(1008, "Join required"), 10000);

    socket.on("message", async (raw) => {
      let message;
      try { message = JSON.parse(raw.toString()); }
      catch { socket.close(1007, "Invalid message"); return; }

      if (!identity) {
        if (message?.type !== "join") { socket.close(1008, "Join required"); return; }
        try {
          const user = await authenticateToken(db, config, message.token);
          const { classroomId, membership } = await classroomAccess(db, message.classroomId, user._id);
          const sessionId = parseObjectId(message.sessionId);
          const session = await db.collection("live_sessions").findOne({ _id: sessionId, classroomId });
          if (!session || session.provider !== "browser_webrtc") throw new Error("Session unavailable");
          const host = session.createdBy.equals(user._id);
          if (!host && membership.role !== "student") throw new Error("Student access required");
          if (session.status !== "live" && !(host && session.status === "preparing")) throw new Error("Session is not live");
          identity = { userId: String(user._id), name: user.displayName, host, sessionId: String(sessionId) };
          clearTimeout(timeout);
          let room = rooms.get(identity.sessionId);
          if (!room) { room = new Map(); rooms.set(identity.sessionId, room); }
          room.get(identity.userId)?.close(1000, "Rejoined");
          room.set(identity.userId, socket);
          const peers = [...room.entries()].filter(([id]) => id !== identity.userId).map(([id, peer]) => ({ userId: id, name: peer.identity.name, host: peer.identity.host }));
          socket.identity = identity;
          send(socket, { type: "joined", userId: identity.userId, host, peers, board: session.board ?? [] });
          for (const [id, peer] of room) if (id !== identity.userId) send(peer, { type: "peer-joined", userId: identity.userId, name: identity.name, host });
        } catch {
          socket.close(1008, "Not allowed in this class");
        }
        return;
      }

      if (message?.type === "board-update") {
        if (!identity.host) return;
        const parsed = boardElementsSchema.safeParse(message.elements);
        if (!parsed.success) return;
        const sessionId = parseObjectId(identity.sessionId);
        const active = await db.collection("live_sessions").findOne({ _id: sessionId });
        if (!active || !["preparing", "live"].includes(active.status)) return;
        await db.collection("live_sessions").updateOne({ _id: sessionId }, { $set: { board: parsed.data, boardUpdatedAt: new Date() } });
        for (const peer of rooms.get(identity.sessionId)?.values() ?? []) {
          if (peer !== socket) send(peer, { type: "board-update", elements: parsed.data });
        }
        return;
      }

      if (!["offer", "answer", "ice"].includes(message?.type) || !/^[a-f0-9]{24}$/.test(message.targetId ?? "")) return;
      const target = rooms.get(identity.sessionId)?.get(message.targetId);
      if (!target?.identity || target.identity.host === identity.host) return;
      if (message.type === "offer" && !identity.host) return;
      if (message.type === "answer" && identity.host) return;
      if (["offer", "answer"].includes(message.type)) {
        if (message.description?.type !== message.type || typeof message.description.sdp !== "string" || message.description.sdp.length > 50000) return;
        send(target, { type: message.type, fromId: identity.userId, name: identity.name, description: message.description });
      } else if (typeof message.candidate?.candidate === "string" && message.candidate.candidate.length < 4000) {
        send(target, { type: "ice", fromId: identity.userId, candidate: message.candidate });
      }
    });

    socket.on("close", () => {
      clearTimeout(timeout);
      if (!identity) return;
      const room = rooms.get(identity.sessionId);
      if (room?.get(identity.userId) !== socket) return;
      room.delete(identity.userId);
      for (const peer of room.values()) send(peer, { type: "peer-left", userId: identity.userId });
      if (!room.size) rooms.delete(identity.sessionId);
    });
  });

  return wss;
}
