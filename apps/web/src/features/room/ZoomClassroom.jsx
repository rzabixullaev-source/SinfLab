import { useCallback, useEffect, useRef, useState } from "react";
import { Hand, Maximize2, Mic, MicOff, Minimize2, Radio, Video, VideoOff, Volume2 } from "lucide-react";
import { api, errorText } from "../../lib/api.js";
import { Badge, Button } from "../../components/ui.jsx";

const handText = {
  raised: "Qo‘l ko‘tarilgan", approved: "Gapirishga ruxsat berilgan",
  denied: "Ruxsat berilmadi", revoked: "Ruxsat qaytarildi", lowered: "Qo‘l tushirildi",
};

export default function ZoomClassroom({ room, item, session, demoMode, onActivated, onEnded, notify }) {
  const host = item.hostId === session.user.id;
  const student = room.role === "student";
  const prefix = "/classrooms/" + room.id + "/live-sessions/" + item.id;
  const roomRef = useRef(null);
  const clientRef = useRef(null);
  const streamRef = useRef(null);
  const stageRef = useRef(null);
  const previewRef = useRef(null);
  const previewStreamRef = useRef(null);
  const tilesRef = useRef(new Map());
  const speakingRef = useRef(false);
  const [hands, setHands] = useState([]);
  const [myHand, setMyHand] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [previewOn, setPreviewOn] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  function stopPreview() {
    previewStreamRef.current?.getTracks().forEach((track) => track.stop());
    previewStreamRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
    setPreviewOn(false);
  }

  useEffect(() => {
    const syncFullScreen = () => setFullScreen(document.fullscreenElement === roomRef.current);
    document.addEventListener("fullscreenchange", syncFullScreen);
    return () => document.removeEventListener("fullscreenchange", syncFullScreen);
  }, []);

  const refreshHands = useCallback(async () => {
    if (item.status !== "live" || room.role === "observer") return;
    const result = await api(prefix + "/hand", { token: session.token });
    if (host) setHands(result.hands);
    else if (student) setMyHand(result.hand);
  }, [prefix, session.token, item.status, host, student]);

  useEffect(() => {
    if (item.status !== "live" || room.role === "observer") return;
    let active = true;
    const tick = async () => {
      try {
        const result = await api(prefix + "/hand", { token: session.token });
        if (!active) return;
        if (host) setHands(result.hands);
        else if (student) setMyHand(result.hand);
      } catch (cause) { if (active && cause.status !== 409) setError(errorText(cause)); }
    };
    tick();
    const timer = setInterval(tick, 2500);
    return () => { active = false; clearInterval(timer); };
  }, [prefix, session.token, item.status, host, student]);

  useEffect(() => {
    if (host || myHand?.status === "approved" || !speakingRef.current || !streamRef.current) return;
    streamRef.current.muteAudio().catch(() => {});
    speakingRef.current = false;
    setSpeaking(false);
  }, [host, myHand?.status]);

  useEffect(() => () => {
    previewStreamRef.current?.getTracks().forEach((track) => track.stop());
    const client = clientRef.current;
    if (client) client.leave(false).catch(() => {});
    clientRef.current = null;
    streamRef.current = null;
  }, []);

  async function showVideo(userId, label) {
    const stream = streamRef.current;
    if (!stream || !stageRef.current || tilesRef.current.has(userId)) return;
    const tile = document.createElement("div");
    tile.className = "zoom-video-tile";
    const caption = document.createElement("span");
    caption.textContent = label;
    tile.appendChild(caption);
    stageRef.current.appendChild(tile);
    tilesRef.current.set(userId, tile);
    try {
      const player = await stream.attachVideo(userId, 3);
      if (!(player instanceof HTMLElement)) throw new Error("Zoom videosini ko‘rsatib bo‘lmadi.");
      if (tilesRef.current.get(userId) === tile) tile.prepend(player);
      else await stream.detachVideo(userId).catch(() => {});
    } catch (cause) {
      if (tilesRef.current.get(userId) === tile) {
        tile.remove();
        tilesRef.current.delete(userId);
      }
      setError(errorText(cause));
    }
  }

  async function hideVideo(userId) {
    const stream = streamRef.current;
    if (stream) {
      try { await stream.detachVideo(userId); } catch {}
    }
    tilesRef.current.get(userId)?.remove();
    tilesRef.current.delete(userId);
  }

  async function connect() {
    setConnecting(true); setError("");
    try {
      const access = await api(room.role === "observer" ? `/parents/live-sessions/${item.id}/zoom-token` : prefix + "/zoom-token", { method: "POST", token: session.token });
      stopPreview();
      const { default: ZoomVideo } = await import("@zoom/videosdk");
      const client = ZoomVideo.createClient();
      await client.init("en-US", "Global", { patchJsMedia: true, leaveOnPageUnload: true });
      await client.join(access.sessionName, access.token, access.userName, "");
      clientRef.current = client;
      const stream = client.getMediaStream();
      streamRef.current = stream;
      client.on("peer-video-state-change", (event) => {
        if (event.action === "Start") {
          const user = client.getAllUser().find((entry) => entry.userId === event.userId);
          showVideo(event.userId, user?.displayName ?? "Ishtirokchi");
        } else hideVideo(event.userId);
      });
      client.on("user-added", () => {
        if (host) refreshHands().catch(() => {});
      });
      client.on("user-removed", (users) => {
        users.forEach((user) => hideVideo(user.userId));
      });
      client.on("host-ask-unmute-audio", () => {
        notify("Ustoz gapirishga ruxsat berdi. Mikrofonni o‘zingiz yoqishingiz mumkin.");
      });
      if (host) {
        await stream.muteAudioUponStartAudio(true);
        await stream.muteAllAudio();
        await stream.allowAudioUnmutedBySelf(false);
        await stream.lockShare(true);
        if (item.status === "preparing") {
          const result = await api(prefix + "/activate", { method: "POST", token: session.token });
          onActivated(result.session);
        }
      }
      setConnected(true);
      if (room.role !== "observer") await api(prefix + "/check-in", { method: "POST", token: session.token }).catch(() => {});
      for (const user of client.getAllUser()) {
        if (user.bVideoOn) showVideo(user.userId, user.displayName);
      }
      notify(host ? "Dars boshlandi. Guruh o‘quvchilariga xabar yuborildi." : "Jonli darsga qo‘shildingiz.");
    } catch (cause) {
      setError(cause.code === "ZOOM_NOT_CONFIGURED"
        ? "Zoom Video SDK kalitlari hali sozlanmagan. Demo rejimida xabar va qo‘l ko‘tarishni sinashingiz mumkin."
        : errorText(cause));
      if (clientRef.current) {
        clientRef.current.leave(false).catch(() => {});
        clientRef.current = null;
        streamRef.current = null;
      }
    } finally { setConnecting(false); }
  }

  async function activateDemo() {
    setBusy(true); setError("");
    try {
      const result = await api(prefix + "/activate", { method: "POST", token: session.token });
      onActivated(result.session);
      notify("Demo dars e’lon qilindi. Audio/video uchun Zoom kalitlari kerak.");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function finish() {
    setBusy(true);
    try {
      await api(prefix + "/end", { method: "POST", token: session.token });
      stopPreview();
      if (clientRef.current) await clientRef.current.leave(host).catch(() => {});
      clientRef.current = null;
      streamRef.current = null;
      tilesRef.current.forEach((tile) => tile.remove());
      tilesRef.current.clear();
      setConnected(false); setAudioEnabled(false); setSpeaking(false); setVideoOn(false);
      speakingRef.current = false;
      onEnded(item.id);
      notify("Jonli dars yakunlandi.");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function leave() {
    setBusy(true); setError("");
    try {
      if (clientRef.current) await clientRef.current.leave(false);
      clientRef.current = null;
      streamRef.current = null;
      tilesRef.current.forEach((tile) => tile.remove());
      tilesRef.current.clear();
      if (room.role !== "observer") await api(prefix + "/check-out", { method: "POST", token: session.token }).catch(() => {});
      setConnected(false); setAudioEnabled(false); setSpeaking(false); setVideoOn(false);
      speakingRef.current = false;
      notify("Darsdan chiqdingiz.");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function changeHand(action) {
    setBusy(true); setError("");
    try {
      const result = await api(prefix + "/hand/" + action, { method: "POST", token: session.token });
      setMyHand(result.hand);
      if (action === "lower" && speakingRef.current && streamRef.current) {
        await streamRef.current.muteAudio();
        speakingRef.current = false; setSpeaking(false);
      }
      notify(action === "raise" ? "Qo‘lingiz ustozga ko‘rindi." : "Qo‘lingiz tushirildi.");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function decide(hand, decision) {
    setBusy(true); setError("");
    try {
      await api(prefix + "/hand/decision", {
        method: "POST", token: session.token,
        body: { studentId: hand.studentId, decision },
      });
      await refreshHands();
      if (streamRef.current && clientRef.current) {
        const user = clientRef.current.getAllUser().find((entry) => entry.userKey === hand.studentId);
        if (user) {
          try {
            if (decision === "approve") await streamRef.current.unmuteAudio(user.userId);
            if (decision === "revoke") await streamRef.current.muteAudio(user.userId);
          } catch (cause) { setError("Ruxsat saqlandi, ammo Zoom mikrofon buyrug‘i bajarilmadi: " + errorText(cause)); }
        }
      }
      notify(decision === "approve" ? "O‘quvchiga gapirish ruxsati berildi." : "Ruxsat holati yangilandi.");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function enableAudio() {
    setBusy(true); setError("");
    try {
      await streamRef.current.startAudio(host ? { mute: true } : { speakerOnly: true });
      setAudioEnabled(true);
      speakingRef.current = false;
      setSpeaking(false);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function toggleMic() {
    setBusy(true); setError("");
    try {
      const stream = streamRef.current;
      if (speakingRef.current) {
        await stream.muteAudio(); speakingRef.current = false; setSpeaking(false);
      } else {
        if (!host && myHand?.status !== "approved") return;
        if (!audioEnabled) await stream.startAudio({ mute: true });
        else if (!host) {
          await stream.stopAudio();
          await stream.startAudio({ mute: true });
        }
        await stream.unmuteAudio();
        speakingRef.current = true; setSpeaking(true); setAudioEnabled(true);
      }
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function toggleVideo() {
    if (!host) return;
    setBusy(true); setError("");
    try {
      const stream = streamRef.current;
      const own = clientRef.current.getCurrentUserInfo();
      if (videoOn) { await stream.stopVideo(); await hideVideo(own.userId); setVideoOn(false); }
      else { await stream.startVideo(); await showVideo(own.userId, own.displayName); setVideoOn(true); }
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function togglePreview() {
    if (!host || connected) return;
    if (previewOn) { stopPreview(); return; }
    setBusy(true); setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Bu brauzer kamerani qo‘llamaydi. localhost yoki HTTPS orqali oching.");
      const camera = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      previewStreamRef.current = camera;
      if (previewRef.current) previewRef.current.srcObject = camera;
      setPreviewOn(true);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function toggleFullScreen() {
    setError("");
    try {
      if (document.fullscreenElement === roomRef.current) await document.exitFullscreen();
      else if (roomRef.current?.requestFullscreen) await roomRef.current.requestFullscreen();
      else throw new Error("Bu brauzer to‘liq ekran rejimini qo‘llamaydi.");
    } catch (cause) { setError(errorText(cause)); }
  }

  return <section className="panel zoom-room" ref={roomRef}>
    <div className="zoom-room-heading">
      <span className="zoom-room-mark"><Radio size={22} /></span>
      <div className="zoom-room-title"><Badge tone={item.status === "live" ? "gold" : "neutral"}>{item.status === "live" ? "JONLI DARS" : item.status === "ended" ? "YAKUNLANGAN" : "TAYYORLANMOQDA"}</Badge><h3>{item.title}</h3><p>Guruh: {room.name}</p></div>
      <button className="zoom-fullscreen-button" type="button" onClick={toggleFullScreen} aria-label={fullScreen ? "To‘liq ekrandan chiqish" : "To‘liq ekranga o‘tish"} title={fullScreen ? "To‘liq ekrandan chiqish" : "To‘liq ekran"}>{fullScreen ? <Minimize2 size={19} /> : <Maximize2 size={19} />}</button>
    </div>
    {error ? <div className="form-error" role="alert">{error}</div> : null}
    <div className="zoom-stage">
      <video-player-container className="zoom-video-grid" ref={stageRef} />
      <video className="zoom-camera-preview" ref={previewRef} autoPlay muted playsInline hidden={!previewOn} />
      {!connected && !previewOn ? <div className="zoom-stage-empty"><Video size={36} /><strong>Zoom Video SDK dars oynasi</strong><span>{item.status === "preparing" ? "Ustoz ulanishi bilan o‘quvchilarga xabar yuboriladi." : "Darsga ulanish uchun tugmani bosing."}</span></div> : null}
      {previewOn ? <span className="zoom-preview-label">Kamera sinovi · faqat siz ko‘rasiz</span> : null}
    </div>
    <div className="zoom-controls">
      {item.status === "ended" ? <p className="muted">Bu dars yakunlangan.</p> : <>
        {!connected ? <>
          <Button onClick={connect} loading={connecting}><Radio size={17} /> {host ? "Zoom darsni boshlash" : "Zoom darsga qo‘shilish"}</Button>
          {host ? <Button variant="secondary" onClick={togglePreview} disabled={connecting || busy}>{previewOn ? <VideoOff size={17} /> : <Video size={17} />}{previewOn ? "Kamera sinovini yopish" : "Kamerani sinash"}</Button> : null}
        </> : <>
          <Button variant="secondary" onClick={enableAudio} disabled={audioEnabled || busy}><Volume2 size={17} /> {audioEnabled ? "Ovoz ulandi" : "Dars ovozini yoqish"}</Button>
          {host || myHand?.status === "approved" ? <Button variant={speaking ? "gold" : "secondary"} onClick={toggleMic} loading={busy}>{speaking ? <Mic size={17} /> : <MicOff size={17} />}{speaking ? "Mikrofonni o‘chirish" : "Mikrofonni yoqish"}</Button> : null}
          {host ? <Button variant="secondary" onClick={toggleVideo} loading={busy}>{videoOn ? <VideoOff size={17} /> : <Video size={17} />}{videoOn ? "Kamerani o‘chirish" : "Kamerani yoqish"}</Button> : <Button variant="secondary" onClick={leave} loading={busy}>Darsdan chiqish</Button>}
        </>}
        {host && item.status === "preparing" && demoMode ? <Button variant="secondary" onClick={activateDemo} loading={busy}>Demo xabarni yuborish</Button> : null}
        {host ? <Button variant="secondary" onClick={finish} loading={busy}>Darsni yakunlash</Button> : null}
      </>}
    </div>
    {item.status === "live" ? <div className="zoom-hand-area">{host ? <><h4><Hand size={17} /> Qo‘l ko‘targanlar</h4>{hands.filter((hand) => ["raised", "approved"].includes(hand.status)).length ? hands.filter((hand) => ["raised", "approved"].includes(hand.status)).map((hand) => <div className="zoom-hand-row" key={hand.studentId}><span><strong>{hand.displayName}</strong><small>{handText[hand.status]}</small></span><div className="inline-actions">{hand.status === "raised" ? <><Button onClick={() => decide(hand, "approve")} disabled={busy}>Ruxsat berish</Button><Button variant="secondary" onClick={() => decide(hand, "deny")} disabled={busy}>Rad etish</Button></> : <Button variant="secondary" onClick={() => decide(hand, "revoke")} disabled={busy}>Ruxsatni qaytarish</Button>}</div></div>) : <p className="muted">Hozircha hech kim qo‘l ko‘tarmagan.</p>}</> : student ? <><h4><Hand size={17} /> Gapirish uchun qo‘l ko‘taring</h4><p className="muted">Ustoz ruxsat bermaguncha mikrofon yopiq bo‘ladi. Ruxsatdan keyin ham uni o‘zingiz yoqasiz.</p><div className="inline-actions">{!["raised", "approved"].includes(myHand?.status) ? <Button onClick={() => changeHand("raise")} loading={busy}><Hand size={17} /> Qo‘l ko‘tarish</Button> : <Button variant="secondary" onClick={() => changeHand("lower")} loading={busy}>Qo‘lni tushirish</Button>}{myHand ? <Badge tone={myHand.status === "approved" ? "teal" : "gold"}>{handText[myHand.status]}</Badge> : null}</div></> : <p className="muted">Qo‘l ko‘tarishni shu guruh o‘quvchilari ishlatadi.</p>}</div> : null}
  </section>;
}
