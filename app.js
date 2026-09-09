"use strict";

const byId = (id) => document.getElementById(id);

const APP_URL = "https://k9matics.github.io/-Best-fit/";
const SUPABASE_URL = "https://umosgsoigpnkvtzggnxa.supabase.co";
const SUPABASE_KEY = "sb_publishable_qZPWqxhMw47gD2qcXauVyg_Xnax020d";
const STORAGE_BUCKET = "bestfit-videos";

const state = {
  testId: "",
  role: "A",
  dogName: "",
  harnessName: "",
  selectedFrameRate: 60,

  cameraStream: null,
  mediaRecorder: null,
  recordedChunks: [],
  recordedVideoUrl: null,
  cameraRecording: false,

  supabase: null,
  channel: null,
  realtimeConnected: false,
  readyPeers: { A: false, B: false, C: false },
  uploadPeers: { A: false, B: false, C: false },

  countdownTimer: null,
  masterRunning: false,
  joinedFromQr: false
};

function addClick(id, handler) {
  const element = byId(id);

  if (element) {
    element.addEventListener("click", handler);
  }
}

function safeStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
  }
}

function safeStorageRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
  }
}

function createTestId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "BF-";

  for (let index = 0; index < 6; index += 1) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return id;
}

function isValidTestId(testId) {
  return /^BF-[A-Z0-9]{6}$/.test(testId || "");
}

function roleName(role) {
  const roles = {
    A: "KAMERA A · SEITLICH",
    B: "KAMERA B · VORNE LINKS",
    C: "KAMERA C · HINTEN RECHTS"
  };

  return roles[role] || roles.A;
}

function roleShortName(role) {
  const roles = {
    A: "KAMERA A",
    B: "KAMERA B",
    C: "KAMERA C"
  };

  return roles[role] || roles.A;
}

function updateClock() {
  const clock = byId("liveTime");

  if (clock) {
    clock.textContent = new Date().toLocaleTimeString("de-DE");
  }
}

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("is-active");
  });

  const target = byId(screenId);

  if (target) {
    target.classList.add("is-active");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function saveSession() {
  safeStorageSet(
    "bestFitSession",
    JSON.stringify({
      testId: state.testId,
      role: state.role,
      dogName: state.dogName,
      harnessName: state.harnessName,
      selectedFrameRate: state.selectedFrameRate
    })
  );
}

function updateSessionUi() {
  const sessionText = state.testId
    ? `${state.testId} · ${roleShortName(state.role)}`
    : "KEIN TEST AKTIV";

  const sessionHeader = byId("sessionHeader");
  const inviteTestId = byId("inviteTestId");
  const recordTestId = byId("recordTestId");
  const resultTestId = byId("resultTestId");
  const resultDogName = byId("resultDogName");
  const recordTitle = byId("recordTitle");
  const openCameraButton = byId("openCameraButton");
  const cameraDialogTitle = byId("cameraDialogTitle");
  const cameraRoleLabel = byId("cameraRoleLabel");
  const cameraFrameRate = byId("cameraFrameRate");
  const masterButton = byId("masterStartButton");

  if (sessionHeader) sessionHeader.textContent = sessionText;
  if (inviteTestId) inviteTestId.textContent = state.testId || "BF-000000";

  if (recordTestId) {
    recordTestId.textContent =
      `${state.testId || "BF-000000"} · ${roleName(state.role)}`;
  }

  if (resultTestId) resultTestId.textContent = state.testId || "BF-000000";

  if (resultDogName) {
    resultDogName.textContent = state.dogName
      ? state.dogName.toUpperCase()
      : "DEIN HUND";
  }

  if (recordTitle) {
    recordTitle.textContent = `${roleShortName(state.role)} bereit machen`;
  }

  if (openCameraButton) {
    openCameraButton.textContent = `${roleShortName(state.role)} ÖFFNEN`;
  }

  if (cameraDialogTitle) {
    cameraDialogTitle.textContent = roleShortName(state.role);
  }

  if (cameraRoleLabel) {
    cameraRoleLabel.textContent = roleName(state.role);
  }

  if (cameraFrameRate) {
    cameraFrameRate.value = String(state.selectedFrameRate);
  }

  if (masterButton) {
    masterButton.style.display = state.role === "A" ? "" : "none";
    masterButton.textContent = state.masterRunning
      ? "ALLE KAMERAS STOPPEN"
      : "ALLE KAMERAS STARTEN";
  }
}

function getJoinUrl() {
  const url = new URL(APP_URL);

  url.searchParams.set("test", state.testId);
  url.searchParams.set("join", "1");

  return url.toString();
}

function renderQrCode() {
  const box = byId("qrCode");

  if (!box) {
    return;
  }

  box.innerHTML = "";

  if (!window.QRCode) {
    box.textContent = "QR-MODUL NICHT GELADEN";
    return;
  }

  new QRCode(box, {
    text: getJoinUrl(),
    width: 210,
    height: 210,
    colorDark: "#07100c",
    colorLight: "#f2f5ed",
    correctLevel: QRCode.CorrectLevel.M
  });
}

function readJoinUrl() {
  const params = new URLSearchParams(window.location.search);
  const testId = (params.get("test") || "").trim().toUpperCase();
  const join = params.get("join");

  if (join !== "1" || !isValidTestId(testId)) {
    return false;
  }

  state.testId = testId;
  state.role = "B";
  state.joinedFromQr = true;
  state.dogName = "";
  state.harnessName = "";

  saveSession();
  updateSessionUi();

  const joinedTestId = byId("joinedTestId");
  const joinedSessionCard = byId("joinedSessionCard");
  const manualJoinField = byId("manualJoinField");
  const joinTitle = byId("joinTitle");
  const joinHint = byId("joinHint");
  const roleInput = byId("joinRole");
  const manualInput = byId("manualTestId");

  if (joinedTestId) {
    joinedTestId.textContent = testId;
  }

  if (joinedSessionCard) {
    joinedSessionCard.classList.remove("is-hidden");
  }

  if (manualJoinField) {
    manualJoinField.classList.add("is-hidden");
  }

  if (manualInput) {
    manualInput.value = testId;
  }

  if (roleInput) {
    roleInput.value = "B";
  }

  if (joinTitle) {
    joinTitle.textContent = "Diesem Test beitreten";
  }

  if (joinHint) {
    joinHint.textContent =
      "✓ Test-ID erkannt. Wähle Kamera B oder C und tippe auf TEST BEITRETEN.";
  }

  showScreen("screenJoin");

  return true;
}

function renderSetup() {
  const positions = {
    A: {
      title: "Kamera A seitlich aufstellen",
      text: "Stelle dieses Handy seitlich an der Laufstrecke auf. Der ganze Hund muss im Bild sein.",
      letter: "A",
      direction: "SEITLICH",
      left: "48%",
      right: "auto",
      top: "auto",
      bottom: "20px"
    },
    B: {
      title: "Kamera B vorne links aufstellen",
      text: "Stelle dieses Handy vorne links an der Strecke auf. Der Hund läuft gerade auf die Kamera zu.",
      letter: "B",
      direction: "VORNE LINKS",
      left: "11%",
      right: "auto",
      top: "25%",
      bottom: "auto"
    },
    C: {
      title: "Kamera C hinten rechts aufstellen",
      text: "Stelle dieses Handy hinter der Strecke auf. Der Hund läuft gerade von der Kamera weg.",
      letter: "C",
      direction: "HINTEN RECHTS",
      left: "auto",
      right: "10%",
      top: "25%",
      bottom: "auto"
    }
  };

  const position = positions[state.role] || positions.A;
  const setupTitle = byId("setupTitle");
  const setupDescription = byId("setupDescription");
  const cameraDirection = byId("cameraDirection");
  const marker = byId("phoneMarker");

  if (setupTitle) setupTitle.textContent = position.title;
  if (setupDescription) setupDescription.textContent = position.text;
  if (cameraDirection) cameraDirection.textContent = position.direction;

  if (marker) {
    marker.textContent = position.letter;
    marker.style.left = position.left;
    marker.style.right = position.right;
    marker.style.top = position.top;
    marker.style.bottom = position.bottom;
  }
}

function setCameraStatus(message, type = "normal") {
  const status = byId("cameraStatus");
  const recordLight = byId("cameraRecordLight");

  if (status) {
    status.textContent = message;
    status.classList.toggle("is-error", type === "error");
    status.classList.toggle("is-recording", type === "recording");
  }

  if (recordLight) {
    if (type === "recording") {
      recordLight.textContent = "REC ●";
    } else if (state.cameraStream) {
      recordLight.textContent = "BEREIT";
    } else {
      recordLight.textContent = "KAMERA AUS";
    }

    recordLight.classList.toggle("is-recording", type === "recording");
  }
}

function setCameraActualSettings(message) {
  const settings = byId("cameraActualSettings");

  if (settings) {
    settings.textContent = message;
  }
}

function setRecordStatus(message) {
  const status = byId("recordStatus");

  if (status) {
    status.textContent = message;
  }
}

function cameraSupported() {
  return Boolean(
    window.isSecureContext &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );
}

function updateFrameRateSelection() {
  const frameRate = byId("cameraFrameRate");

  state.selectedFrameRate = Number(frameRate?.value) || 60;

  setCameraActualSettings(
    `Gewählt: ${state.selectedFrameRate} fps. Die echte Bildrate wird nach der Kamera-Freigabe angezeigt.`
  );

  saveSession();
}

function revokeVideoUrl() {
  if (state.recordedVideoUrl) {
    URL.revokeObjectURL(state.recordedVideoUrl);
    state.recordedVideoUrl = null;
  }
}

function resetPlayback() {
  revokeVideoUrl();
  state.recordedChunks = [];

  const preview = byId("cameraPreview");
  const playback = byId("cameraPlayback");
  const discardButton = byId("btnCameraDiscard");

  if (playback) {
    playback.pause();
    playback.removeAttribute("src");
    playback.hidden = true;
    playback.load();
  }

  if (preview) {
    preview.hidden = false;
  }

  if (discardButton) {
    discardButton.disabled = true;
  }
}

function stopCamera() {
  if (state.mediaRecorder && state.mediaRecorder.state === "recording") {
    state.mediaRecorder.stop();
  }

  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach((track) => track.stop());
  }

  state.cameraStream = null;
  state.mediaRecorder = null;
  state.cameraRecording = false;

  const preview = byId("cameraPreview");
  const recordButton = byId("btnCameraRecord");
  const enableButton = byId("btnCameraEnable");

  if (preview) {
    preview.srcObject = null;
  }

  if (recordButton) {
    recordButton.disabled = true;
    recordButton.textContent = "AUFNAHME STARTEN";
  }

  if (enableButton) {
    enableButton.textContent = "KAMERA AKTIVIEREN";
  }

  setCameraStatus("Kamera geschlossen.");
}

function openCameraDialog() {
  const dialog = byId("cameraDialog");
  const enableButton = byId("btnCameraEnable");

  if (!dialog) {
    window.alert("Kamera-Dialog fehlt in index.html.");
    return;
  }

  try {
    if (!dialog.open) {
      dialog.showModal();
    }
  } catch (error) {
    window.alert("Der Kamera-Dialog konnte nicht geöffnet werden.");
    return;
  }

  resetPlayback();
  updateFrameRateSelection();

  if (!cameraSupported()) {
    if (enableButton) {
      enableButton.disabled = true;
    }

    setCameraStatus(
      "Kamera nicht verfügbar: Öffne die Website in Chrome über HTTPS, nicht in einer eingebetteten Vorschau.",
      "error"
    );

    return;
  }

  if (enableButton) {
    enableButton.disabled = false;
  }

  setCameraStatus(
    "Wähle die Bildrate und tippe auf „KAMERA AKTIVIEREN“."
  );
}

function closeCameraDialog() {
  stopCamera();

  const dialog = byId("cameraDialog");

  if (dialog && dialog.open) {
    dialog.close();
  }
}

async function enableCamera() {
  if (!cameraSupported()) {
    setCameraStatus(
      "Kamera nicht verfügbar: Bitte in Chrome über HTTPS öffnen.",
      "error"
    );

    return;
  }

  stopCamera();
  resetPlayback();
  updateFrameRateSelection();

  try {
    setCameraStatus(
      `Kamera wird mit Wunschwert ${state.selectedFrameRate} fps aktiviert ...`
    );

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: state.selectedFrameRate }
      }
    });

    state.cameraStream = stream;

    const preview = byId("cameraPreview");

    if (!preview) {
      stream.getTracks().forEach((track) => track.stop());
      state.cameraStream = null;
      setCameraStatus("Video-Vorschau fehlt in index.html.", "error");
      return;
    }

    preview.srcObject = stream;
    preview.hidden = false;

    await preview.play().catch(() => undefined);

    const track = stream.getVideoTracks()[0];
    const settings = track && track.getSettings ? track.getSettings() : {};

    const realFps = settings.frameRate
      ? Math.round(settings.frameRate)
      : "unbekannt";

    const width = settings.width || "?";
    const height = settings.height || "?";

    setCameraActualSettings(
      `AKTIV: ${width} × ${height} · ${realFps} fps · angefordert: ${state.selectedFrameRate} fps`
    );

    const enableButton = byId("btnCameraEnable");
    const recordButton = byId("btnCameraRecord");

    if (enableButton) {
      enableButton.textContent = "KAMERA AKTIV";
    }

    if (recordButton) {
      recordButton.disabled = !window.MediaRecorder;
    }

    setCameraStatus(
      window.MediaRecorder
        ? "Kamera bereit. Prüfe den Bildausschnitt und starte die Aufnahme."
        : "Kamera bereit. Dieser Browser unterstützt jedoch keine lokale Videoaufnahme.",
      window.MediaRecorder ? "normal" : "error"
    );

    setRecordStatus(
      `Kamera aktiv: ${width} × ${height} bei ${realFps} fps.`
    );
  } catch (error) {
    const errorName = error?.name || "Unbekannter Fehler";

    const messages = {
      NotAllowedError:
        "Kamera nicht freigegeben. Tippe auf das Schloss-Symbol neben der Adresse und erlaube Kamera.",
      SecurityError:
        "Kamera wird durch die aktuelle Umgebung blockiert. Öffne die GitHub-Pages-Adresse direkt in Chrome.",
      NotFoundError:
        "Keine Kamera gefunden.",
      NotReadableError:
        "Die Kamera wird gerade von einer anderen App verwendet. Schließe Kamera, WhatsApp oder Instagram und versuche es erneut.",
      OverconstrainedError:
        "Diese Kamera unterstützt die gewählte Einstellung nicht. Wähle 30 fps und versuche es erneut."
    };

    setCameraStatus(
      messages[errorName] ||
        `Kamera konnte nicht gestartet werden: ${errorName}.`,
      "error"
    );
  }
}

function recorderMimeType() {
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) {
    return "";
  }

  const formats = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm"
  ];

  return formats.find((format) => {
    return MediaRecorder.isTypeSupported(format);
  }) || "";
}

function ensureSupabaseClient() {
  if (state.supabase || !window.supabase?.createClient) {
    return;
  }

  state.supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );
}

async function uploadRecordedVideo(blob) {
  ensureSupabaseClient();

  if (!state.supabase) {
    throw new Error("Supabase-SDK nicht geladen.");
  }

  if (!state.testId) {
    throw new Error("Keine Test-ID vorhanden.");
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName =
    `${state.testId}/${state.role}/aufnahme-${timestamp}.webm`;

  const { data, error } = await state.supabase
    .storage
    .from(STORAGE_BUCKET)
    .upload(fileName, blob, {
      contentType: blob.type || "video/webm",
      upsert: false
    });

  if (error) {
    throw error;
  }

  return data;
}

async function uploadAndNotify(blob) {
  setRecordStatus(
    `Kamera ${state.role}: Video wird zu Supabase hochgeladen ...`
  );

  try {
    const data = await uploadRecordedVideo(blob);

    state.uploadPeers[state.role] = true;

    setRecordStatus(
      `✓ Upload fertig: Kamera ${state.role} · ${data.path}`
    );

    await broadcast("uploaded", {
      testId: state.testId,
      role: state.role,
      path: data.path,
      uploadedAt: Date.now()
    });

    updateUploadStatus();
  } catch (error) {
    setRecordStatus(
      `Upload fehlgeschlagen: ${error.message || "unbekannter Fehler"}`
    );
  }
}

function startRecording() {
  if (!state.cameraStream) {
    setCameraStatus("Bitte zuerst die Kamera aktivieren.", "error");
    return;
  }

  if (!window.MediaRecorder) {
    setCameraStatus(
      "Lokale Videoaufnahme wird von diesem Browser nicht unterstützt.",
      "error"
    );
    return;
  }

  resetPlayback();
  state.recordedChunks = [];

  try {
    const mimeType = recorderMimeType();

    state.mediaRecorder = mimeType
      ? new MediaRecorder(state.cameraStream, { mimeType })
      : new MediaRecorder(state.cameraStream);

    state.mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size > 0) {
        state.recordedChunks.push(event.data);
      }
    });

    state.mediaRecorder.addEventListener("stop", () => {
      const videoType = state.mediaRecorder?.mimeType || "video/webm";
      const blob = new Blob(state.recordedChunks, { type: videoType });

      state.cameraRecording = false;

      const recordButton = byId("btnCameraRecord");

      if (recordButton) {
        recordButton.textContent = "AUFNAHME STARTEN";
      }

      if (blob.size <= 0) {
        setCameraStatus("Es wurde kein Video erstellt.", "error");
        state.mediaRecorder = null;
        return;
      }

      state.recordedVideoUrl = URL.createObjectURL(blob);

      const playback = byId("cameraPlayback");
      const preview = byId("cameraPreview");
      const discardButton = byId("btnCameraDiscard");

      if (playback) {
        playback.src = state.recordedVideoUrl;
        playback.hidden = false;
      }

      if (preview) {
        preview.hidden = true;
      }

      if (discardButton) {
        discardButton.disabled = false;
      }

      setCameraStatus("Aufnahme beendet. Video wird jetzt hochgeladen.");

      uploadAndNotify(blob);

      state.mediaRecorder = null;
    });

    state.mediaRecorder.start(500);
    state.cameraRecording = true;

    const recordButton = byId("btnCameraRecord");

    if (recordButton) {
      recordButton.textContent = "AUFNAHME BEENDEN";
    }

    setCameraStatus(
      "AUFZEICHNUNG LÄUFT · Erst sichtbar klatschen, dann zwei gerade Laufsequenzen filmen.",
      "recording"
    );
  } catch (error) {
    setCameraStatus(
      `Aufnahme konnte nicht gestartet werden: ${error?.name || "unbekannter Fehler"}.`,
      "error"
    );
  }
}

function stopRecordingIfActive() {
  if (state.cameraRecording && state.mediaRecorder?.state === "recording") {
    state.mediaRecorder.stop();
  }
}

function toggleRecording() {
  if (state.cameraRecording) {
    stopRecordingIfActive();
  } else {
    startRecording();
  }
}

function discardRecording() {
  resetPlayback();

  const preview = byId("cameraPreview");

  if (state.cameraStream && preview) {
    preview.hidden = false;
  }

  setCameraStatus(
    "Aufnahme verworfen. Kamera ist bereit für einen neuen Clip."
  );
}

function readyText() {
  const peers = Object.entries(state.readyPeers)
    .filter(([, ready]) => ready)
    .map(([role]) => role)
    .join(", ");

  return peers ? `Bereit: Kamera ${peers}` : "Noch keine Kamera bereit.";
}

function updateUploadStatus() {
  const uploadedRoles = Object.entries(state.uploadPeers)
    .filter(([, uploaded]) => uploaded)
    .map(([role]) => role);

  const count = uploadedRoles.length;

  if (count === 3) {
    setRecordStatus(
      "✓ Alle drei Videos sind hochgeladen. Schließe den Kamera-Dialog und tippe auf TEST ABSCHLIESSEN."
    );
  } else {
    setRecordStatus(
      `Uploads fertig: ${uploadedRoles.join(", ") || "keine"} · ${count}/3 Videos vorhanden.`
    );
  }
}

function clearCountdown() {
  if (state.countdownTimer) {
    window.clearInterval(state.countdownTimer);
    state.countdownTimer = null;
  }
}

function runCountdown(startAt) {
  clearCountdown();

  const tick = () => {
    const remainingMs = startAt - Date.now();
    const seconds = Math.max(0, Math.ceil(remainingMs / 1000));

    if (remainingMs <= 0) {
      clearCountdown();

      if (!state.cameraRecording) {
        startRecording();
      }

      return;
    }

    setCameraStatus(`MASTER-START in ${seconds} ...`, "recording");
  };

  tick();
  state.countdownTimer = window.setInterval(tick, 200);
}

async function broadcast(type, payload = {}) {
  if (!state.channel || !state.realtimeConnected) {
    return;
  }

  await state.channel.send({
    type: "broadcast",
    event: type,
    payload
  });
}

function handleRealtimeEvent(event, payload) {
  if (!payload || payload.testId !== state.testId) {
    return;
  }

  if (event === "ready") {
    state.readyPeers[payload.role] = Boolean(payload.ready);
    setRecordStatus(readyText());
    return;
  }

  if (event === "start") {
    runCountdown(payload.startAt);
    return;
  }

  if (event === "stop") {
    clearCountdown();
    stopRecordingIfActive();
    state.masterRunning = false;
    updateSessionUi();
    setCameraStatus("Master-Stopp empfangen. Video wird gespeichert.");
    return;
  }

  if (event === "uploaded") {
    state.uploadPeers[payload.role] = true;
    updateUploadStatus();
  }
}

async function leaveRealtime() {
  clearCountdown();

  if (state.channel && state.supabase) {
    try {
      await state.supabase.removeChannel(state.channel);
    } catch (error) {
    }
  }

  state.channel = null;
  state.realtimeConnected = false;
}

function connectRealtime() {
  if (!state.testId) {
    return;
  }

  ensureSupabaseClient();

  if (!state.supabase) {
    setRecordStatus(
      "Supabase-SDK fehlt. Prüfe die Script-Zeile in index.html."
    );
    return;
  }

  leaveRealtime();

  state.readyPeers = { A: false, B: false, C: false };
  state.uploadPeers = { A: false, B: false, C: false };

  const channelName = `bestfit-${state.testId}`;

  state.channel = state.supabase.channel(channelName, {
    config: {
      broadcast: {
        self: true
      }
    }
  });

  state.channel.on(
    "broadcast",
    { event: "ready" },
    ({ payload }) => handleRealtimeEvent("ready", payload)
  );

  state.channel.on(
    "broadcast",
    { event: "start" },
    ({ payload }) => handleRealtimeEvent("start", payload)
  );

  state.channel.on(
    "broadcast",
    { event: "stop" },
    ({ payload }) => handleRealtimeEvent("stop", payload)
  );

  state.channel.on(
    "broadcast",
    { event: "uploaded" },
    ({ payload }) => handleRealtimeEvent("uploaded", payload)
  );

  state.channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      state.realtimeConnected = true;

      setRecordStatus(
        `Live verbunden · ${state.testId} · ${roleName(state.role)}`
      );
    }
  });
}

async function sendReady() {
  if (!state.testId) {
    setRecordStatus("Erstelle oder betrete zuerst einen Test.");
    return;
  }

  if (!state.cameraStream) {
    setRecordStatus("Aktiviere zuerst die Kamera auf diesem Handy.");
    return;
  }

  state.readyPeers[state.role] = true;
  setRecordStatus(readyText());

  await broadcast("ready", {
    testId: state.testId,
    role: state.role,
    ready: true,
    at: Date.now()
  });

  setCameraStatus(
    "Diese Kamera ist bereit und wartet auf den Master-Start."
  );
}

async function masterStartAll() {
  if (state.role !== "A") {
    setRecordStatus("Master-Start ist nur auf Kamera A verfügbar.");
    return;
  }

  if (!state.cameraStream) {
    setCameraStatus("Bitte zuerst die Kamera aktivieren.", "error");
    return;
  }

  const startAt = Date.now() + 3200;

  state.masterRunning = true;
  updateSessionUi();

  await broadcast("start", {
    testId: state.testId,
    startAt,
    from: state.role
  });

  runCountdown(startAt);
}

async function masterStopAll() {
  state.masterRunning = false;
  updateSessionUi();

  await broadcast("stop", {
    testId: state.testId,
    from: state.role,
    at: Date.now()
  });

  clearCountdown();
  stopRecordingIfActive();

  setRecordStatus(
    "Alle Videos werden auf den jeweiligen Handys gespeichert und zu Supabase hochgeladen."
  );
}

function createMainTest() {
  const dogNameInput = byId("dogName");
  const harnessNameInput = byId("harnessName");
  const dogName = dogNameInput?.value.trim();

  if (!dogName) {
    window.alert("Bitte gib zuerst den Namen deines Hundes ein.");
    dogNameInput?.focus();
    return;
  }

  state.testId = createTestId();
  state.role = "A";
  state.dogName = dogName;
  state.harnessName = harnessNameInput?.value.trim() || "";
  state.joinedFromQr = false;

  saveSession();
  updateSessionUi();
  renderQrCode();
  connectRealtime();

  showScreen("screenInvite");
}

function joinExistingTest() {
  const params = new URLSearchParams(window.location.search);
  const manualInput = byId("manualTestId");
  const roleInput = byId("joinRole");

  const fromUrl = (params.get("test") || "").trim().toUpperCase();
  const manual = manualInput?.value.trim().toUpperCase() || "";
  const testId = state.joinedFromQr ? state.testId : (fromUrl || manual);

  if (!isValidTestId(testId)) {
    window.alert(
      "Bitte gib eine gültige Test-ID ein, zum Beispiel BF-7K2M9P."
    );

    manualInput?.focus();
    return;
  }

  state.testId = testId;
  state.role = roleInput?.value || "B";
  state.joinedFromQr = false;

  saveSession();
  updateSessionUi();
  renderSetup();
  connectRealtime();

  setRecordStatus(
    `Du bist Test ${state.testId} als ${roleName(state.role)} beigetreten.`
  );

  showScreen("screenSetup");
}

function resetApp() {
  clearCountdown();
  stopCamera();
  revokeVideoUrl();
  leaveRealtime();

  state.testId = "";
  state.role = "A";
  state.dogName = "";
  state.harnessName = "";
  state.selectedFrameRate = 60;
  state.masterRunning = false;
  state.joinedFromQr = false;
  state.readyPeers = { A: false, B: false, C: false };
  state.uploadPeers = { A: false, B: false, C: false };

  safeStorageRemove("bestFitSession");

  const dogNameInput = byId("dogName");
  const harnessNameInput = byId("harnessName");
  const manualTestIdInput = byId("manualTestId");
  const cameraFrameRate = byId("cameraFrameRate");

  if (dogNameInput) dogNameInput.value = "";
  if (harnessNameInput) harnessNameInput.value = "";
  if (manualTestIdInput) manualTestIdInput.value = "";
  if (cameraFrameRate) cameraFrameRate.value = "60";

  updateSessionUi();
  showScreen("screenWelcome");

  const url = new URL(APP_URL);
  window.history.replaceState({}, "", url);
}

function restoreSession() {
  const saved = safeStorageGet("bestFitSession");

  if (!saved) {
    return;
  }

  try {
    const session = JSON.parse(saved);

    state.testId = session.testId || "";
    state.role = session.role || "A";
    state.dogName = session.dogName || "";
    state.harnessName = session.harnessName || "";
    state.selectedFrameRate = Number(session.selectedFrameRate) || 60;

    updateSessionUi();
    renderSetup();
  } catch (error) {
    safeStorageRemove("bestFitSession");
  }
}

function bindEvents() {
  addClick("startTestButton", () => showScreen("screenProfile"));
  addClick("joinTestButton", () => showScreen("screenJoin"));
  addClick("profileBackButton", () => showScreen("screenWelcome"));
  addClick("profileContinue", createMainTest);
  addClick("joinBackButton", () => showScreen("screenWelcome"));
  addClick("joinContinue", joinExistingTest);
  addClick("copyJoinLinkButton", copyJoinLink);
  addClick("inviteBackButton", () => showScreen("screenProfile"));

  addClick("inviteContinue", () => {
    renderSetup();
    showScreen("screenSetup");
  });

  addClick("setupBackButton", () => {
    showScreen(state.role === "A" ? "screenInvite" : "screenJoin");
  });

  addClick("setupContinue", () => {
    updateSessionUi();
    showScreen("screenRecord");
    openCameraDialog();
  });

  addClick("recordBackButton", () => {
    stopCamera();
    showScreen("screenSetup");
  });

  addClick("openCameraButton", openCameraDialog);
  addClick("readyCameraButton", sendReady);

  addClick("masterStartButton", async () => {
    if (state.masterRunning) {
      await masterStopAll();
    } else {
      await masterStartAll();
    }
  });

  addClick("openResultButton", () => {
    stopCamera();
    showScreen("screenResult");
  });

  addClick("finishTestButton", () => {
    stopCamera();
    showScreen("screenResult");
  });

  const frameRate = byId("cameraFrameRate");

  if (frameRate) {
    frameRate.addEventListener("change", updateFrameRateSelection);
  }

  addClick("btnCameraEnable", enableCamera);
  addClick("btnCameraRecord", toggleRecording);
  addClick("btnCameraDiscard", discardRecording);
  addClick("btnCameraClose", closeCameraDialog);

  const cameraDialog = byId("cameraDialog");

  if (cameraDialog) {
    cameraDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeCameraDialog();
    });

    cameraDialog.addEventListener("close", () => {
      stopCamera();
    });
  }

  addClick("retestButton", () => {
    renderSetup();
    showScreen("screenSetup");
  });

  addClick("newTestButton", resetApp);

  window.addEventListener("pagehide", () => {
    stopCamera();
    leaveRealtime();
  });
}

function init() {
  updateClock();
  window.setInterval(updateClock, 1000);

  bindEvents();
  updateFrameRateSelection();

  if (readJoinUrl()) {
    return;
  }

  restoreSession();
  updateSessionUi();
  renderSetup();

  if (state.testId) {
    connectRealtime();
  }
}

document.addEventListener("DOMContentLoaded", init);
