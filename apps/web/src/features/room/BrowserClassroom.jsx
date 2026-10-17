import { useCallback, useEffect, useRef, useState } from "react";
import { Hand, Maximize2, Mic, MicOff, Minimize2, Radio, Video, VideoOff } from "lucide-react";
import { api, errorText, liveSignalUrl } from "../../lib/api.js";
import { Badge, Button } from "../../components/ui.jsx";
import LiveBoard from "./LiveBoard.jsx";

const handText = {
  raised: "Qo‘l ko‘tarilgan", approved: "Gapirishga ruxsat berilgan",
  denied: "Ruxsat berilmadi", revoked: "Ruxsat qaytarildi", lowered: "Qo‘l tushirildi",
};
const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];

export default function BrowserClassroom({ room, item, session, onActivated, onEnded, notify }) {
  const host = item.hostId === session.user.id;
  const student = room.role === "student";
  const prefix = `/classrooms/${room.id}/live-sessions/${item.id}`;
  const roomRef = useRef(null);
  const previewRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const audioHostRef = useRef(null);
  const previewStreamRef = useRef(null);
  const localStreamRef = useRef(null);
  const micStreamRef = useRef(null);
  const micSenderRef = useRef(null);
  const socketRef = useRef(null);
  const peersRef = useRef(new Map());
  const [hands, setHands] = useState([]);
  const [myHand, setMyHand] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewOn, setPreviewOn] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [error, setError] = useState("");
  const [board, setBoard] = useState([]);

  const refreshHands = useCallback(async () => {
    if (item.status !== "live") return;
    const result = await api(prefix + "/hand", { token: session.token });
    if (host) setHands(result.hands);
    else if (student) setMyHand(result.hand);
  }, [prefix, session.token, item.status, host, student]);

  useEffect(() => {
    if (item.status !== "live") return;
    refreshHands().catch(() => {});
    const timer = setInterval(() => refreshHands().catch(() => {}), 2500);
    return () => clearInterval(timer);
  }, [refreshHands, item.status]);

  useEffect(() => {
    const sync = () => setFullScreen(document.fullscreenElement === roomRef.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  function stopPreview() {
    previewStreamRef.current?.getTracks().forEach((track) => track.stop());
    previewStreamRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
    setPreviewOn(false);
  }

  function closePeer(userId) {
    const peer = peersRef.current.get(userId);
    if (!peer) return;
    peer.pc.close();
    peer.audio?.remove();
    peersRef.current.delete(userId);
    setParticipantCount(peersRef.current.size);
  }

  function cleanup() {
    socketRef.current?.close();
    socketRef.current = null;
    for (const id of peersRef.current.keys()) closePeer(id);
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    micSenderRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    previewStreamRef.current?.getTracks().forEach((track) => track.stop());
    previewStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (previewRef.current) previewRef.current.srcObject = null;
    setConnected(false); setVideoOn(false); setMicOn(false); setPreviewOn(false);
  }

  useEffect(() => () => {
    socketRef.current?.close();
    peersRef.current.forEach((peer) => { peer.pc.close(); peer.audio?.remove(); });
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    previewStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function signal(message) {
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify(message));
  }

  function createPeer(userId) {
    closePeer(userId);
    const pc = new RTCPeerConnection({ iceServers });
    const peer = { pc, pending: [], audio: null };
    peersRef.current.set(userId, peer);
    setParticipantCount(peersRef.current.size);
    pc.onicecandidate = ({ candidate }) => { if (candidate) signal({ type: "ice", targetId: userId, candidate: candidate.toJSON() }); };
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed") setError("Video aloqa uzildi. Darsdan chiqib qayta qo‘shiling.");
    };
    pc.ontrack = (event) => {
      if (host && event.track.kind === "audio") {
        const audio = document.createElement("audio");
        audio.autoplay = true;
        audio.srcObject = event.streams[0] ?? new MediaStream([event.track]);
        peer.audio?.remove();
        peer.audio = audio;
        audioHostRef.current?.appendChild(audio);
      } else if (!host && event.streams[0] && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    return peer;
  }

  async function flushCandidates(peer) {
    for (const candidate of peer.pending.splice(0)) await peer.pc.addIceCandidate(candidate);
  }

  async function offerTo(userId) {
    if (!localStreamRef.current) return;
    const peer = createPeer(userId);
    localStreamRef.current.getTracks().forEach((track) => peer.pc.addTrack(track, localStreamRef.current));
    peer.pc.addTransceiver("audio", { direction: "recvonly" });
    await peer.pc.setLocalDescription(await peer.pc.createOffer());
    signal({ type: "offer", targetId: userId, description: peer.pc.localDescription });
  }

  async function handleSignal(message) {
    if (message.type === "joined") {
      setConnected(true);
      setBoard(message.board ?? []);
      if (host) {
        if (item.status === "preparing") {
          const result = await api(prefix + "/activate", { method: "POST", token: session.token });
          onActivated(result.session);
        }
        for (const peer of message.peers.filter((entry) => !entry.host)) await offerTo(peer.userId);
        notify("Kamera darsi boshlandi. Guruh o‘quvchilariga xabar yuborildi.");
      } else notify("Kamera darsiga qo‘shildingiz.");
      await api(prefix + "/check-in", { method: "POST", token: session.token }).catch(() => {});
    } else if (message.type === "board-update") {
      setBoard(message.elements ?? []);
    } else if (message.type === "peer-joined" && host && !message.host) {
      await offerTo(message.userId);
    } else if (message.type === "peer-left") {
      closePeer(message.userId);
      if (!host) {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        notify("Ustoz aloqadan chiqdi. Qayta ulanishini kuting.");
      }
    } else if (message.type === "offer" && !host) {
      const peer = createPeer(message.fromId);
      await peer.pc.setRemoteDescription(message.description);
      const audioLines = peer.pc.getTransceivers().filter((entry) => entry.receiver.track.kind === "audio");
      const micLine = audioLines.at(-1);
      if (micLine) { micLine.direction = "sendonly"; micSenderRef.current = micLine.sender; }
      await peer.pc.setLocalDescription(await peer.pc.createAnswer());
      await flushCandidates(peer);
      signal({ type: "answer", targetId: message.fromId, description: peer.pc.localDescription });
    } else if (message.type === "answer" && host) {
      const peer = peersRef.current.get(message.fromId);
      if (peer) { await peer.pc.setRemoteDescription(message.description); await flushCandidates(peer); }
    } else if (message.type === "ice") {
      const peer = peersRef.current.get(message.fromId);
      if (peer) {
        if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(message.candidate);
        else peer.pending.push(message.candidate);
      }
    }
  }

  async function connect() {
    setConnecting(true); setError("");
    try {
      if (!window.RTCPeerConnection || !navigator.mediaDevices?.getUserMedia) throw new Error("Kamera darsi uchun localhost yoki HTTPS va WebRTC brauzer kerak.");
      if (host) {
        stopPreview();
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getAudioTracks().forEach((track) => { track.enabled = false; });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setVideoOn(true);
      }
      const socket = new WebSocket(liveSignalUrl());
      socketRef.current = socket;
      await new Promise((resolve, reject) => {
        socket.onopen = resolve;
        socket.onerror = () => reject(new Error("Dars serveriga ulanib bo‘lmadi."));
      });
      socket.onmessage = (event) => {
        handleSignal(JSON.parse(event.data)).catch((cause) => setError(errorText(cause)));
      };
      socket.onclose = (event) => {
        if (socketRef.current !== socket) return;
        if (event.code !== 1000) setError("Dars aloqasi uzildi. Qayta urinib ko‘ring.");
        cleanup();
      };
      signal({ type: "join", token: session.token, classroomId: room.id, sessionId: item.id });
    } catch (cause) { cleanup(); setError(errorText(cause)); }
    finally { setConnecting(false); }
  }

  async function previewCamera() {
    if (previewOn) { stopPreview(); return; }
    setBusy(true); setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      previewStreamRef.current = stream;
      if (previewRef.current) previewRef.current.srcObject = stream;
      setPreviewOn(true);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function toggleStudentMic() {
    if (!student || myHand?.status !== "approved" || !micSenderRef.current) return;
    setBusy(true); setError("");
    try {
      if (micOn) {
        await micSenderRef.current.replaceTrack(null);
        micStreamRef.current?.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
        setMicOn(false);
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        await micSenderRef.current.replaceTrack(stream.getAudioTracks()[0]);
        micStreamRef.current = stream;
        setMicOn(true);
      }
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (!student || myHand?.status === "approved" || !micStreamRef.current) return;
    micSenderRef.current?.replaceTrack(null).catch(() => {});
    micStreamRef.current.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    setMicOn(false);
  }, [student, myHand?.status]);

  async function changeHand(action) {
    setBusy(true); setError("");
    try {
      const result = await api(`${prefix}/hand/${action}`, { method: "POST", token: session.token });
      setMyHand(result.hand);
      notify(action === "raise" ? "Qo‘lingiz ustozga ko‘rindi." : "Qo‘lingiz tushirildi.");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function decide(hand, decision) {
    setBusy(true); setError("");
    try {
      await api(prefix + "/hand/decision", { method: "POST", token: session.token, body: { studentId: hand.studentId, decision } });
      await refreshHands();
      notify(decision === "approve" ? "O‘quvchiga gapirish ruxsati berildi." : "Ruxsat holati yangilandi.");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function leave() {
    await api(prefix + "/check-out", { method: "POST", token: session.token }).catch(() => {});
    cleanup();
    notify("Darsdan chiqdingiz.");
  }

  async function finish() {
    setBusy(true); setError("");
    try {
      const result = await api(prefix + "/end", { method: "POST", token: session.token });
      cleanup(); onEnded(result.session.id); notify("Jonli dars yakunlandi.");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function toggleFullScreen() {
    try {
      if (document.fullscreenElement === roomRef.current) await document.exitFullscreen();
      else await roomRef.current.requestFullscreen();
    } catch (cause) { setError(errorText(cause)); }
  }

  return <section className="panel zoom-room browser-room" ref={roomRef}>
    <div className="zoom-room-heading"><span className="zoom-room-mark"><Radio size={22} /></span><div className="zoom-room-title"><Badge tone={item.status === "live" ? "gold" : "neutral"}>{item.status === "live" ? "JONLI DARS" : item.status === "ended" ? "YAKUNLANGAN" : "TAYYORLANMOQDA"}</Badge><h3>{item.title}</h3><p>Guruh: {room.name} · {host ? `${participantCount} o‘quvchi ulangan` : "Brauzer kamerasi"}</p></div><button className="zoom-fullscreen-button" type="button" onClick={toggleFullScreen} aria-label={fullScreen ? "To‘liq ekrandan chiqish" : "To‘liq ekranga o‘tish"}>{fullScreen ? <Minimize2 size={19} /> : <Maximize2 size={19} />}</button></div>
    {error ? <div className="form-error" role="alert">{error}</div> : null}
    <div className="zoom-stage browser-stage">
      <video ref={localVideoRef} autoPlay muted playsInline hidden={!host || !connected} />
      <video ref={remoteVideoRef} autoPlay playsInline hidden={host || !connected} />
      <video ref={previewRef} autoPlay muted playsInline hidden={!previewOn} />
      {!connected && !previewOn ? <div className="zoom-stage-empty"><Video size={36} /><strong>Kamera darsi</strong><span>{host ? "Kamerani sinab ko‘ring va darsni boshlang." : "Ustoz boshlagach darsga qo‘shiling."}</span></div> : null}
      {previewOn ? <span className="zoom-preview-label">Kamera sinovi · faqat siz ko‘rasiz</span> : null}
    </div>
    <div ref={audioHostRef} hidden />
    <div className="zoom-controls">{item.status === "ended" ? <p className="muted">Bu dars yakunlangan.</p> : <>
      {!connected ? <><Button onClick={connect} loading={connecting}><Radio size={17} /> {host ? "Kamera darsini boshlash" : "Darsga qo‘shilish"}</Button>{host ? <Button variant="secondary" onClick={previewCamera} disabled={busy || connecting}>{previewOn ? "Sinovni yopish" : "Kamerani sinash"}</Button> : null}</> : <>
        {host ? <><Button variant="secondary" onClick={() => { const track = localStreamRef.current?.getVideoTracks()[0]; if (track) { track.enabled = !track.enabled; setVideoOn(track.enabled); } }}>{videoOn ? <VideoOff size={17} /> : <Video size={17} />}{videoOn ? "Kamerani o‘chirish" : "Kamerani yoqish"}</Button><Button variant={micOn ? "gold" : "secondary"} onClick={() => { const track = localStreamRef.current?.getAudioTracks()[0]; if (track) { track.enabled = !track.enabled; setMicOn(track.enabled); } }}>{micOn ? <Mic size={17} /> : <MicOff size={17} />}{micOn ? "Mikrofonni o‘chirish" : "Mikrofonni yoqish"}</Button></> : <><Button variant={micOn ? "gold" : "secondary"} onClick={toggleStudentMic} disabled={myHand?.status !== "approved" || busy || !micSenderRef.current}>{micOn ? <Mic size={17} /> : <MicOff size={17} />}{micOn ? "Mikrofonni o‘chirish" : "Mikrofonni yoqish"}</Button><Button variant="secondary" onClick={leave}>Darsdan chiqish</Button></>}
      </>}{host ? <Button variant="secondary" onClick={finish} loading={busy}>Darsni yakunlash</Button> : null}
    </>}</div>
    <LiveBoard elements={board} connected={connected} canEdit={host && connected && item.status !== "ended"} onChange={(elements) => { setBoard(elements); signal({ type: "board-update", elements }); }} />
    {item.status === "live" ? <div className="zoom-hand-area">{host ? <><h4><Hand size={17} /> Qo‘l ko‘targanlar</h4>{hands.filter((hand) => ["raised", "approved"].includes(hand.status)).length ? hands.filter((hand) => ["raised", "approved"].includes(hand.status)).map((hand) => <div className="zoom-hand-row" key={hand.studentId}><span><strong>{hand.displayName}</strong><small>{handText[hand.status]}</small></span><div className="inline-actions">{hand.status === "raised" ? <><Button onClick={() => decide(hand, "approve")} disabled={busy}>Ruxsat berish</Button><Button variant="secondary" onClick={() => decide(hand, "deny")} disabled={busy}>Rad etish</Button></> : <Button variant="secondary" onClick={() => decide(hand, "revoke")} disabled={busy}>Ruxsatni qaytarish</Button>}</div></div>) : <p className="muted">Hozircha hech kim qo‘l ko‘tarmagan.</p>}</> : student ? <><h4><Hand size={17} /> Gapirish uchun qo‘l ko‘taring</h4><p className="muted">Ustoz ruxsat bergach, mikrofonni o‘zingiz yoqasiz.</p><div className="inline-actions">{!["raised", "approved"].includes(myHand?.status) ? <Button onClick={() => changeHand("raise")} loading={busy}><Hand size={17} /> Qo‘l ko‘tarish</Button> : <Button variant="secondary" onClick={() => changeHand("lower")} loading={busy}>Qo‘lni tushirish</Button>}{myHand ? <Badge tone={myHand.status === "approved" ? "teal" : "gold"}>{handText[myHand.status]}</Badge> : null}</div></> : null}</div> : null}
  </section>;
}
