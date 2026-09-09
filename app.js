"use strict";

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

  supabase: null,
  channel: null,
  realtimeConnected: false,

  cameraStream: null,
  mediaRecorder: null,
  recordedChunks: [],
  cameraRecording: false,

  readyPeers: { A: false, B: false, C: false },
  uploadedPeers: { A: false, B: false, C: false },

  masterRunning: false,
  countdownTimer: null
};

function byId(id) {
  return document.getElementById(id);
}

function addClick(id, callback) {
  const element = byId(id);

  if (element) {
    element.addEventListener("click", callback);
  }
}

function setText(id, text) {
  const element = byId(id);

  if (element) {
    element.textContent = text;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
  }
}

function safeStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function safeStorageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
  }
}

function createTestId() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "BF-";

  for (let index = 0; index < 6; index += 1) {
    id += letters[Math.floor(Math.random() * letters.length)];
  }

  return id;
}

function validTestId(testId) {
  return /^BF-[A-Z0-9]{6}$/.test(testId || "");
}

function roleLongName(role) {
  const names = {
    A: "KAMERA A · SEITLICH",
    B: "KAMERA B · VORNE LINKS",
    C: "KAMERA C · HINTEN RECHTS"
  };

  return names[role] || names.A;
}

function roleShortName(role) {
  return `KAMERA ${role || "A"}`;
}

function saveSession() {
  safeStorageSet(
    "bestfit-session",
    JSON.stringify({
      testId: state.testId,
      role: state.role,
      dogName: state.dogName,
      harnessName: state.harnessName,
      selectedFrameRate: state.selectedFrameRate
    })
  );
}

function clearSession() {
  safeStorageRemove("bestfit-session");
}

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("is-active");
  });

  const screen = byId(screenId);

  if (screen) {
    screen.classList.add("is-active");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateClock() {
  setText("liveTime", new Date().toLocaleTimeString("de-DE"));
}

function updateUi() {
  const testId = state.testId || "BF-000000";
  const role = state.role || "A";

  setText(
    "sessionHeader",
    state.testId ? `${state.testId} · ${roleShortName(role)}` : "KEIN TEST AKTIV"
  );

  setText("inviteTestId", testId);
  setText("resultTestId", testId);
  setText("recordTestId", `${testId} · ${roleLongName(role)}`);
  setText("cameraDialogTitle", roleShortName(role));
  setText("cameraRoleLabel", roleLongName(role));
  setText(
    "recordTitle",
    `${roleShortName(role)} bereit machen`
  );

  const dogName = state.dogName
    ? state.dogName.toUpperCase()
    : "DEIN HUND";

  setText("resultDogName", dogName);

  const openCameraButton = byId("openCameraButton");

  if (openCameraButton) {
    openCameraButton.textContent = `${roleShortName(role)} ÖFFNEN`;
  }

  const masterButton = byId("masterStartButton");

  if (masterButton) {
    masterButton.style.display = role === "A" ? "" : "none";
    masterButton.textContent = state.masterRunning
      ? "ALLE KAMERAS STOPPEN"
      : "ALLE KAMERAS STARTEN";
  }

  const frameRate = byId("cameraFrameRate");

  if (frameRate) {
    frameRate.value = String(state.selectedFrameRate);
  }
}

function getJoinUrl() {
  const url = new URL(APP_URL);

  url.searchParams.set("test", state.testId);
  url.searchParams.set("join", "1");

  return url.toString();
}

function renderQrCode() {
  const qrCodeBox = byId("qrCode");

  if (!qrCodeBox || !state.testId) {
    return;
  }

  qrCodeBox.innerHTML = "";

  if (!window.QRCode) {
    qrCodeBox.textContent = getJoinUrl();
    return;
  }

  new QRCode(qrCodeBox, {
    text: getJoinUrl(),
    width: 210,
    height: 210,
    colorDark: "#07100c",
    colorLight: "#f2f5ed",
    correctLevel: QRCode.CorrectLevel.M
  });
}

function showJoinLinkOnScreen(url) {
  const status = byId("copyStatus");

  if (!status) {
    window.prompt("Kopiere diesen Beitritts-Link:", url);
    return;
  }

  status.innerHTML = "";

  const info = document.createElement("strong");
  info.textContent = "Link zum Kopieren:";

  const link = document.createElement("a");
  link.href = url;
  link.textContent = url;
  link.target = "_blank";
  link.rel = "noopener";
  link.style.display = "block";
  link.style.marginTop = "10px";
  link.style.overflowWrap = "anywhere";
  link.style.color = "inherit";

  status.appendChild(info);
  status.appendChild(link);
}

async function copyJoinLink() {
  if (!validTestId(state.testId)) {
    window.alert("Erstelle zuerst den Test auf Handy A.");
    return;
  }

  const url = getJoinUrl();
  const status = byId("copyStatus");

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Best Fit – Test beitreten",
        text: `Tritt dem Test ${state.testId} bei.`,
        url
      });

      if (status) {
        status.textContent = "Link geteilt.";
      }

      return;
    } catch (error) {
      if (error?.name === "AbortError") {
        if (status) {
          status.textContent = "Teilen abgebrochen.";
        }

        return;
      }
    }
  }

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(url);

      if (status) {
        status.textContent = "✓ Beitritts-Link kopiert.";
      }

      return;
    } catch (error) {
    }
  }

  showJoinLinkOnScreen(url);
}

function setJoinScreenForQr(testId) {
  setText("joinedTestId", testId);

  const joinedCard = byId("joinedSessionCard");
  const manualField = byId("manualJoinField");
  const manualInput = byId("manualTestId");
  const roleSelect = byId("joinRole");

  if (joinedCard) {
    joinedCard.classList.remove("is-hidden");
  }

  if (manualField) {
    manualField.classList.add("is-hidden");
  }

  if (manualInput) {
    manualInput.value = testId;
  }

  if (roleSelect) {
    roleSelect.value = "B";
  }

  setText("joinTitle", "Diesem Test beitreten");
  setText(
    "joinHint",
    "✓ Test-ID erkannt. Wähle Kamera B oder Kamera C und tippe auf TEST BEITRETEN."
  );
}

function parseJoinUrl() {
  const params = new URLSearchParams(window.location.search);
  const testId = (params.get("test") || "").trim().toUpperCase();
  const isJoinLink = params.get("join") === "1";

  if (!isJoinLink || !validTestId(testId)) {
    return false;
  }

  state.testId = testId;
  state.role = "B";
  state.dogName = "";
  state.harnessName = "";

  saveSession();
  updateUi();
  setJoinScreenForQr(testId);
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

  const setup = positions[state.role] || positions.A;

  setText("setupTitle", setup.title);
  setText("setupDescription", setup.text);
  setText("cameraDirection", setup.direction);

  const marker = byId("phoneMarker");

  if (marker) {
    marker.textContent = setup.letter;
    marker.style.left = setup.left;
    marker.style.right = setup.right;
    marker.style.top = setup.top;
    marker.style.bottom = setup.bottom;
  }
}

function setRecordStatus(text) {
  setText("recordStatus", text);
}

function setCameraStatus(text, kind = "normal") {
  const status = byId("cameraStatus");
  const light = byId("cameraRecordLight");

  if (status) {
    status.textContent = text;
    status.classList.toggle("is-error", kind === "error");
    status.classList.toggle("is-recording", kind === "recording");
  }

  if (light) {
    light.textContent = kind === "recording"
      ? "REC ●"
      : state.cameraStream
        ? "BEREIT"
        : "KAMERA AUS";

    light.classList.toggle("is-recording", kind === "recording");
  }
}

function clearCountdown() {
  if (state.countdownTimer) {
    clearInterval(state.countdownTimer);
    state.countdownTimer = null;
  }
}

function ensureSupabase() {
  if (state.supabase) {
    return true;
  }

  if (!window.supabase?.createClient) {
    setRecordStatus(
      "Supabase konnte nicht geladen werden. Prüfe die Script-Zeile in index.html."
    );

    return false;
  }

  state.supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  return true;
}

async function leaveRealtime() {
  clearCountdown();

  if (state.supabase && state.channel) {
    try {
      await state.supabase.removeChannel(state.channel);
    } catch (error) {
    }
  }

  state.channel = null;
  state.realtimeConnected = false;
}

function handleMessage(event, payload) {
  if (!payload || payload.testId !== state.testId) {
    return;
  }

  if (event === "ready") {
    state.readyPeers[payload.role] = true;
    setRecordStatus(`Bereit: ${Object.keys(state.readyPeers)
      .filter((role) => state.readyPeers[role])
      .map((role) => `Kamera ${role}`)
      .join(", ")}`);
    return;
  }

  if (event === "start") {
    startCountdown(payload.startAt);
    return;
  }

  if (event === "stop") {
    stopRecording();
    state.masterRunning = false;
    updateUi();
    return;
  }

  if (event === "uploaded") {
    state.uploadedPeers[payload.role] = true;
    showUploadStatus();
  }
}

async function connectRealtime() {
  if (!validTestId(state.testId) || !ensureSupabase()) {
    return;
  }

  await leaveRealtime();

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
    ({ payload }) => handleMessage("ready", payload)
  );

  state.channel.on(
    "broadcast",
    { event: "start" },
    ({ payload }) => handleMessage("start", payload)
  );

  state.channel.on(
    "broadcast",
    { event: "stop" },
    ({ payload }) => handleMessage("stop", payload)
  );

  state.channel.on(
    "broadcast",
    { event: "uploaded" },
    ({ payload }) => handleMessage("uploaded", payload)
  );

  state.channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      state.realtimeConnected = true;
      setRecordStatus(
        `Live verbunden · ${state.testId} · ${roleLongName(state.role)}`
      );
    }

    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      state.realtimeConnected = false;
      setRecordStatus(
        "Live-Verbindung fehlgeschlagen. Videos können trotzdem einzeln hochgeladen werden."
      );
    }
  });
}

async function broadcast(event, payload) {
  if (!state.channel || !state.realtimeConnected) {
    return;
  }

  try {
    await state.channel.send({
      type: "broadcast",
      event,
      payload
    });
  } catch (error) {
  }
}

function startCountdown(startAt) {
  clearCountdown();

  const tick = () => {
    const msLeft = startAt - Date.now();

    if (msLeft <= 0) {
      clearCountdown();
      startRecording();
      return;
    }

    const seconds = Math.ceil(msLeft / 1000);
    setCameraStatus(`MASTER-START in ${seconds} ...`, "recording");
  };

  tick();
  state.countdownTimer = setInterval(tick, 200);
}

function cameraAvailable() {
  return Boolean(
    window.isSecureContext &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );
}

function setActualSettings(text) {
  setText("cameraActualSettings", text);
}

function updateFrameRate() {
  const input = byId("cameraFrameRate");

  state.selectedFrameRate = Number(input?.value) || 60;

  setActualSettings(
    `Gewählt: ${state.selectedFrameRate} fps. Die echte Bildrate erscheint nach der Freigabe.`
  );

  saveSession();
}

function openCameraDialog() {
  const dialog = byId("cameraDialog");

  if (!dialog) {
    window.alert("Kamera-Dialog fehlt in index.html.");
    return;
  }

  if (!cameraAvailable()) {
    setCameraStatus(
      "Kamera nicht verfügbar. Öffne die App über HTTPS direkt im Browser.",
      "error"
    );

    return;
  }

  if (!dialog.open) {
    dialog.showModal();
  }

  setCameraStatus("Tippe auf KAMERA AKTIVIEREN.");
}

function closeCameraDialog() {
  stopCamera();

  const dialog = byId("cameraDialog");

  if (dialog?.open) {
    dialog.close();
  }
}

async function enableCamera() {
  if (!cameraAvailable()) {
    setCameraStatus(
      "Kamera nicht verfügbar. Öffne die App direkt in Chrome oder Safari.",
      "error"
    );

    return;
  }

  stopCamera();
  updateFrameRate();

  try {
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

    if (preview) {
      preview.srcObject = stream;
      preview.hidden = false;
      await preview.play().catch(() => undefined);
    }

    const track = stream.getVideoTracks()[0];
    const settings = track?.getSettings ? track.getSettings() : {};

    setActualSettings(
      `AKTIV: ${settings.width || "?"} × ${settings.height || "?"} · ${
        Math.round(settings.frameRate || 0) || "?"
      } fps`
    );

    const recordButton = byId("btnCameraRecord");
    const enableButton = byId("btnCameraEnable");

    if (recordButton) {
      recordButton.disabled = !window.MediaRecorder;
    }

    if (enableButton) {
      enableButton.textContent = "KAMERA AKTIV";
    }

    setCameraStatus("Kamera bereit.");
  } catch (error) {
    setCameraStatus(
      `Kamera konnte nicht gestartet werden: ${error?.name || "Fehler"}.`,
      "error"
    );
  }
}

function stopCamera() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach((track) => track.stop());
  }

  state.cameraStream = null;

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

function getMimeType() {
  if (!window.MediaRecorder?.isTypeSupported) {
    return "";
  }

  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm"
  ];

  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function startRecording() {
  if (!state.cameraStream) {
    setCameraStatus("Bitte zuerst die Kamera aktivieren.", "error");
    return;
  }

  if (!window.MediaRecorder) {
    setCameraStatus("Videoaufnahme wird nicht unterstützt.", "error");
    return;
  }

  if (state.cameraRecording) {
    return;
  }

  state.recordedChunks = [];

  const mimeType = getMimeType();

  try {
    state.mediaRecorder = mimeType
      ? new MediaRecorder(state.cameraStream, { mimeType })
      : new MediaRecorder(state.cameraStream);

    state.mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        state.recordedChunks.push(event.data);
      }
    });

    state.mediaRecorder.addEventListener("stop", () => {
      const blob = new Blob(state.recordedChunks, {
        type: state.mediaRecorder?.mimeType || "video/webm"
      });

      state.cameraRecording = false;

      const recordButton = byId("btnCameraRecord");

      if (recordButton) {
        recordButton.textContent = "AUFNAHME STARTEN";
      }

      if (blob.size > 0) {
        uploadVideo(blob);
      } else {
        setRecordStatus("Kein Video aufgezeichnet.");
      }
    });

    state.mediaRecorder.start(500);
    state.cameraRecording = true;

    const recordButton = byId("btnCameraRecord");

    if (recordButton) {
      recordButton.textContent = "AUFNAHME STOPPEN";
    }

    setCameraStatus("AUFZEICHNUNG LÄUFT", "recording");
  } catch (error) {
    setCameraStatus(
      `Aufnahmefehler: ${error?.name || "Unbekannter Fehler"}.`,
      "error"
    );
  }
}

function stopRecording() {
  if (state.mediaRecorder?.state === "recording") {
    state.mediaRecorder.stop();
  }

  state.cameraRecording = false;
}

function toggleRecording() {
  if (state.cameraRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

async function uploadVideo(blob) {
  if (!ensureSupabase()) {
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath =
    `${state.testId}/${state.role}/aufnahme-${timestamp}.webm`;

  setRecordStatus(`Kamera ${state.role}: Video wird hochgeladen ...`);

  try {
    const { data, error } = await state.supabase
      .storage
      .from(STORAGE_BUCKET)
      .upload(filePath, blob, {
        contentType: blob.type || "video/webm",
        upsert: false
      });

    if (error) {
      throw error;
    }

    state.uploadedPeers[state.role] = true;

    setRecordStatus(`✓ Upload fertig: ${data.path}`);

    showUploadStatus();

    await broadcast("uploaded", {
      testId: state.testId,
      role: state.role,
      path: data.path
    });
  } catch (error) {
    setRecordStatus(
      `Upload fehlgeschlagen: ${error?.message || "Unbekannter Fehler"}`
    );
  }
}

function showUploadStatus() {
  const uploaded = Object.keys(state.uploadedPeers)
    .filter((role) => state.uploadedPeers[role]);

  setRecordStatus(
    uploaded.length === 3
      ? "✓ Alle drei Videos sind hochgeladen."
      : `Hochgeladen: ${uploaded.join(", ") || "noch keine"} · ${uploaded.length}/3`
  );
}

async function markReady() {
  if (!state.cameraStream) {
    setRecordStatus("Aktiviere zuerst die Kamera.");
    return;
  }

  state.readyPeers[state.role] = true;

  await broadcast("ready", {
    testId: state.testId,
    role: state.role
  });

  setRecordStatus(`Kamera ${state.role} ist bereit.`);
}

async function masterToggle() {
  if (state.role !== "A") {
    return;
  }

  if (!state.cameraStream) {
    setCameraStatus("Aktiviere zuerst die Kamera A.", "error");
    return;
  }

  if (state.masterRunning) {
    state.masterRunning = false;
    updateUi();

    await broadcast("stop", {
      testId: state.testId
    });

    stopRecording();
    return;
  }

  const startAt = Date.now() + 3000;

  state.masterRunning = true;
  updateUi();

  await broadcast("start", {
    testId: state.testId,
    startAt
  });

  startCountdown(startAt);
}

function createMainTest() {
  const dogInput = byId("dogName");
  const harnessInput = byId("harnessName");
  const dogName = dogInput?.value.trim();

  if (!dogName) {
    window.alert("Bitte gib den Namen deines Hundes ein.");
    dogInput?.focus();
    return;
  }

  clearSession();

  state.testId = createTestId();
  state.role = "A";
  state.dogName = dogName;
  state.harnessName = harnessInput?.value.trim() || "";
  state.readyPeers = { A: false, B: false, C: false };
  state.uploadedPeers = { A: false, B: false, C: false };
  state.masterRunning = false;

  saveSession();
  updateUi();
  renderQrCode();
  connectRealtime();

  showScreen("screenInvite");
}

function joinExistingTest() {
  const params = new URLSearchParams(window.location.search);
  const urlTestId = (params.get("test") || "").trim().toUpperCase();
  const manualTestId = (byId("manualTestId")?.value || "")
    .trim()
    .toUpperCase();
  const role = byId("joinRole")?.value || "B";

  const testId = validTestId(urlTestId)
    ? urlTestId
    : validTestId(state.testId)
      ? state.testId
      : manualTestId;

  if (!validTestId(testId)) {
    window.alert("Ungültige Test-ID. Beispiel: BF-7K2M9P");
    return;
  }

  state.testId = testId;
  state.role = role === "C" ? "C" : "B";
  state.readyPeers = { A: false, B: false, C: false };
  state.uploadedPeers = { A: false, B: false, C: false };

  saveSession();
  updateUi();
  renderSetup();
  connectRealtime();

  showScreen("screenSetup");
}

function resetApp() {
  leaveRealtime();
  stopCamera();
  clearSession();

  state.testId = "";
  state.role = "A";
  state.dogName = "";
  state.harnessName = "";
  state.masterRunning = false;
  state.readyPeers = { A: false, B: false, C: false };
  state.uploadedPeers = { A: false, B: false, C: false };

  window.history.replaceState({}, "", APP_URL);

  updateUi();
  showScreen("screenWelcome");
}

function restoreSession() {
  const saved = safeStorageGet("bestfit-session");

  if (!saved) {
    return false;
  }

  try {
    const session = JSON.parse(saved);

    if (!validTestId(session.testId)) {
      return false;
    }

    state.testId = session.testId;
    state.role = session.role || "A";
    state.dogName = session.dogName || "";
    state.harnessName = session.harnessName || "";
    state.selectedFrameRate = Number(session.selectedFrameRate) || 60;

    return true;
  } catch (error) {
    return false;
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
    updateUi();
    showScreen("screenRecord");
    openCameraDialog();
  });

  addClick("recordBackButton", () => {
    stopCamera();
    showScreen("screenSetup");
  });

  addClick("openCameraButton", openCameraDialog);
  addClick("readyCameraButton", markReady);
  addClick("masterStartButton", masterToggle);

  addClick("openResultButton", () => {
    stopCamera();
    showScreen("screenResult");
  });

  addClick("finishTestButton", () => {
    stopCamera();
    showScreen("screenResult");
  });

  addClick("btnCameraEnable", enableCamera);
  addClick("btnCameraRecord", toggleRecording);
  addClick("btnCameraClose", closeCameraDialog);

  const frameRate = byId("cameraFrameRate");

  if (frameRate) {
    frameRate.addEventListener("change", updateFrameRate);
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
  setInterval(updateClock, 1000);

  bindEvents();
  updateFrameRate();
  updateUi();

  if (parseJoinUrl()) {
    return;
  }

  if (restoreSession()) {
    updateUi();
    renderSetup();
    connectRealtime();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
