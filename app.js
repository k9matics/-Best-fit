"use strict";

const byId = (id) => document.getElementById(id);

const state = {
  testId: "",
  role: "A",
  dogName: "",
  harnessName: "",
  cameraStream: null,
  mediaRecorder: null,
  recordedChunks: [],
  recordedVideoUrl: null,
  cameraRecording: false,
  selectedFrameRate: 60
};

function createTestId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "BF-";

  for (let i = 0; i < 6; i += 1) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return id;
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
  localStorage.setItem(
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

  byId("sessionHeader").textContent = sessionText;
  byId("inviteTestId").textContent = state.testId || "BF-000000";
  byId("recordTestId").textContent =
    `${state.testId || "BF-000000"} · ${roleName(state.role)}`;
  byId("resultTestId").textContent = state.testId || "BF-000000";

  byId("resultDogName").textContent = state.dogName
    ? state.dogName.toUpperCase()
    : "DEIN HUND";

  byId("recordTitle").textContent = `${roleShortName(state.role)} bereit machen`;
  byId("openCameraButton").textContent = `${roleShortName(state.role)} ÖFFNEN`;
  byId("cameraDialogTitle").textContent = roleShortName(state.role);
  byId("cameraRoleLabel").textContent = roleName(state.role);

  byId("cameraFrameRate").value = String(state.selectedFrameRate);
}

function getJoinUrl() {
  const url = new URL(window.location.href);

  url.search = "";
  url.searchParams.set("test", state.testId);
  url.searchParams.set("join", "1");

  return url.toString();
}

function renderQrCode() {
  const box = byId("qrCode");

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

  if (!/^BF-[A-Z0-9]{6}$/.test(testId)) {
    return false;
  }

  state.testId = testId;
  state.role = "B";

  byId("joinedTestId").textContent = testId;
  byId("joinedSessionCard").classList.remove("is-hidden");
  byId("manualJoinField").classList.add("is-hidden");

  byId("joinTitle").textContent = "Diesem Test beitreten";
  byId("joinHint").textContent =
    "Die Test-ID wurde aus dem QR-Code übernommen. Wähle jetzt die Rolle dieses Handys.";

  updateSessionUi();
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
  const marker = byId("phoneMarker");

  byId("setupTitle").textContent = position.title;
  byId("setupDescription").textContent = position.text;
  byId("cameraDirection").textContent = position.direction;

  marker.textContent = position.letter;
  marker.style.left = position.left;
  marker.style.right = position.right;
  marker.style.top = position.top;
  marker.style.bottom = position.bottom;
}

function setCameraStatus(message, type = "normal") {
  const status = byId("cameraStatus");
  const light = byId("cameraRecordLight");

  status.textContent = message;
  status.classList.toggle("is-error", type === "error");
  status.classList.toggle("is-recording", type === "recording");

  if (type === "recording") {
    light.textContent = "REC ●";
  } else if (state.cameraStream) {
    light.textContent = "BEREIT";
  } else {
    light.textContent = "KAMERA AUS";
  }

  light.classList.toggle("is-recording", type === "recording");
}

function setCameraActualSettings(message) {
  byId("cameraActualSettings").textContent = message;
}

function setRecordStatus(message) {
  byId("recordStatus").textContent = message;
}

function cameraSupported() {
  return Boolean(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    window.MediaRecorder
  );
}

function updateFrameRateSelection() {
  state.selectedFrameRate = Number(byId("cameraFrameRate").value) || 60;

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

  playback.pause();
  playback.removeAttribute("src");
  playback.hidden = true;
  playback.load();

  preview.hidden = false;
  byId("btnCameraDiscard").disabled = true;
}

function stopCamera() {
  if (state.mediaRecorder && state.mediaRecorder.state === "recording") {
    state.mediaRecorder.stop();
  }

  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach((track) => {
      track.stop();
    });
  }

  state.cameraStream = null;
  state.mediaRecorder = null;
  state.cameraRecording = false;

  byId("cameraPreview").srcObject = null;
  byId("btnCameraRecord").disabled = true;
  byId("btnCameraRecord").textContent = "AUFNAHME STARTEN";
  byId("btnCameraEnable").textContent = "KAMERA AKTIVIEREN";

  setCameraStatus("Kamera geschlossen.");
}

function openCameraDialog() {
  const dialog = byId("cameraDialog");

  if (!dialog.open) {
    dialog.showModal();
  }

  resetPlayback();
  updateFrameRateSelection();

  if (!cameraSupported()) {
    byId("btnCameraEnable").disabled = true;

    setCameraStatus(
      "Kameraaufnahme wird von diesem Browser nicht unterstützt.",
      "error"
    );

    return;
  }

  byId("btnCameraEnable").disabled = false;

  setCameraStatus(
    "Wähle die Bildrate und tippe dann auf „KAMERA AKTIVIEREN“."
  );
}

function closeCameraDialog() {
  stopCamera();

  const dialog = byId("cameraDialog");

  if (dialog.open) {
    dialog.close();
  }
}

async function enableCamera() {
  if (!cameraSupported()) {
    setCameraStatus(
      "Kameraaufnahme wird von diesem Browser nicht unterstützt.",
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
        facingMode: {
          ideal: "environment"
        },
        width: {
          ideal: 1920
        },
        height: {
          ideal: 1080
        },
        frameRate: {
          ideal: state.selectedFrameRate,
          max: state.selectedFrameRate
        }
      }
    });

    state.cameraStream = stream;

    const preview = byId("cameraPreview");

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

    byId("btnCameraEnable").textContent = "KAMERA AKTIV";
    byId("btnCameraRecord").disabled = false;

    setCameraStatus(
      "Kamera bereit. Prüfe den Bildausschnitt und starte dann die Aufnahme."
    );

    setRecordStatus(
      `Kamera aktiv: ${width} × ${height} bei ${realFps} fps.`
    );
  } catch (error) {
    const denied =
      error &&
      (error.name === "NotAllowedError" || error.name === "SecurityError");

    setCameraStatus(
      denied
        ? "Kamera nicht freigegeben. Erlaube die Kamera in Chrome für diese Website."
        : "Kamera konnte mit dieser Einstellung nicht gestartet werden. Wähle 60 oder 30 fps und versuche es erneut.",
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

  return formats.find((format) => MediaRecorder.isTypeSupported(format)) || "";
}

function startRecording() {
  if (!state.cameraStream) {
    setCameraStatus("Bitte zuerst die Kamera aktivieren.", "error");
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
      const videoType = state.mediaRecorder
        ? state.mediaRecorder.mimeType
        : "video/webm";

      const blob = new Blob(state.recordedChunks, {
        type: videoType
      });

      state.cameraRecording = false;
      byId("btnCameraRecord").textContent = "AUFNAHME STARTEN";

      if (blob.size > 0) {
        state.recordedVideoUrl = URL.createObjectURL(blob);

        const playback = byId("cameraPlayback");

        playback.src = state.recordedVideoUrl;
        playback.hidden = false;

        byId("cameraPreview").hidden = true;
        byId("btnCameraDiscard").disabled = false;

        setCameraStatus(
          "Aufnahme beendet. Prüfe den Clip oder verwirf ihn für eine neue Aufnahme."
        );

        setRecordStatus(
          `Clip lokal gespeichert: ${state.testId} · ${roleName(state.role)} · Wunschwert ${state.selectedFrameRate} fps.`
        );
      } else {
        setCameraStatus("Es wurde kein Video erstellt.", "error");
      }

      state.mediaRecorder = null;
    });

    state.mediaRecorder.start(500);
    state.cameraRecording = true;

    byId("btnCameraRecord").textContent = "AUFNAHME BEENDEN";

    setCameraStatus(
      "AUFZEICHNUNG LÄUFT · Klatschen sichtbar machen, dann zwei gerade Laufsequenzen filmen.",
      "recording"
    );
  } catch (error) {
    setCameraStatus("Aufnahme konnte nicht gestartet werden.", "error");
  }
}

function toggleRecording() {
  if (state.cameraRecording) {
    if (state.mediaRecorder && state.mediaRecorder.state === "recording") {
      state.mediaRecorder.stop();
    }

    return;
  }

  startRecording();
}

function discardRecording() {
  resetPlayback();

  if (state.cameraStream) {
    byId("cameraPreview").hidden = false;
  }

  setCameraStatus(
    "Aufnahme verworfen. Kamera ist bereit für einen neuen Clip."
  );
}

async function copyJoinLink() {
  const joinUrl = getJoinUrl();

  try {
    await navigator.clipboard.writeText(joinUrl);

    byId("copyStatus").textContent =
      "Beitritts-Link kopiert. Sende ihn per WhatsApp an Handy B und C.";
  } catch (error) {
    byId("copyStatus").textContent =
      `Link kopieren und weitergeben: ${joinUrl}`;
  }
}

function createMainTest() {
  const dogName = byId("dogName").value.trim();

  if (!dogName) {
    window.alert("Bitte gib zuerst den Namen deines Hundes ein.");
    byId("dogName").focus();
    return;
  }

  state.testId = createTestId();
  state.role = "A";
  state.dogName = dogName;
  state.harnessName = byId("harnessName").value.trim();

  saveSession();
  updateSessionUi();
  renderQrCode();

  showScreen("screenInvite");
}

function joinExistingTest() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = (params.get("test") || "").trim().toUpperCase();
  const manual = byId("manualTestId").value.trim().toUpperCase();
  const testId = fromUrl || manual;

  if (!/^BF-[A-Z0-9]{6}$/.test(testId)) {
    window.alert(
      "Bitte gib eine gültige Test-ID ein, zum Beispiel BF-7K2M9P."
    );

    byId("manualTestId").focus();
    return;
  }

  state.testId = testId;
  state.role = byId("joinRole").value;

  saveSession();
  updateSessionUi();
  renderSetup();

  setRecordStatus(
    `Du bist Test ${state.testId} als ${roleName(state.role)} beigetreten.`
  );

  showScreen("screenSetup");
}

function resetApp() {
  stopCamera();
  revokeVideoUrl();

  state.testId = "";
  state.role = "A";
  state.dogName = "";
  state.harnessName = "";
  state.selectedFrameRate = 60;

  localStorage.removeItem("bestFitSession");

  byId("dogName").value = "";
  byId("harnessName").value = "";
  byId("manualTestId").value = "";
  byId("cameraFrameRate").value = "60";

  updateSessionUi();
  showScreen("screenWelcome");

  const url = new URL(window.location.href);

  url.search = "";

  window.history.replaceState({}, "", url);
}

function restoreSession() {
  const saved = localStorage.getItem("bestFitSession");

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
    localStorage.removeItem("bestFitSession");
  }
}

function bindEvents() {
  byId("startTestButton").addEventListener("click", () => {
    showScreen("screenProfile");
  });

  byId("joinTestButton").addEventListener("click", () => {
    showScreen("screenJoin");
  });

  byId("profileBackButton").addEventListener("click", () => {
    showScreen("screenWelcome");
  });

  byId("profileContinue").addEventListener("click", createMainTest);

  byId("joinBackButton").addEventListener("click", () => {
    showScreen("screenWelcome");
  });

  byId("joinContinue").addEventListener("click", joinExistingTest);

  byId("copyJoinLinkButton").addEventListener("click", copyJoinLink);

  byId("inviteBackButton").addEventListener("click", () => {
    showScreen("screenProfile");
  });

  byId("inviteContinue").addEventListener("click", () => {
    renderSetup();
    showScreen("screenSetup");
  });

  byId("setupBackButton").addEventListener("click", () => {
    showScreen(state.role === "A" ? "screenInvite" : "screenJoin");
  });

  byId("setupContinue").addEventListener("click", () => {
    updateSessionUi();
    showScreen("screenRecord");
    openCameraDialog();
  });

  byId("recordBackButton").addEventListener("click", () => {
    stopCamera();
    showScreen("screenSetup");
  });

  byId("openCameraButton").addEventListener("click", openCameraDialog);

  byId("openResultButton").addEventListener("click", () => {
    stopCamera();
    showScreen("screenResult");
  });

  byId("finishTestButton").addEventListener("click", () => {
    stopCamera();
    showScreen("screenResult");
  });

  byId("cameraFrameRate").addEventListener("change", updateFrameRateSelection);

  byId("btnCameraEnable").addEventListener("click", enableCamera);
  byId("btnCameraRecord").addEventListener("click", toggleRecording);
  byId("btnCameraDiscard").addEventListener("click", discardRecording);
  byId("btnCameraClose").addEventListener("click", closeCameraDialog);

  byId("cameraDialog").addEventListener("cancel", (event) => {
    event.preventDefault();
    closeCameraDialog();
  });

  byId("cameraDialog").addEventListener("close", () => {
    stopCamera();
  });

  byId("retestButton").addEventListener("click", () => {
    renderSetup();
    showScreen("screenSetup");
  });

  byId("newTestButton").addEventListener("click", resetApp);

  window.addEventListener("pagehide", stopCamera);
}

function init() {
  updateClock();
  window.setInterval(updateClock, 1000);

  updateSessionUi();
  renderSetup();
  bindEvents();

  if (readJoinUrl()) {
    return;
  }

  restoreSession();
  updateFrameRateSelection();
}

document.addEventListener("DOMContentLoaded", init);  setCameraStatus("Kamera geschlossen.");
}

function openCameraDialog() {
  const dialog = byId("cameraDialog");

  if (!dialog.open) {
    dialog.showModal();
  }

  resetPlayback();

  if (!cameraSupported()) {
    byId("btnCameraEnable").disabled = true;

    setCameraStatus(
      "Kameraaufnahme wird von diesem Browser nicht unterstützt.",
      "error"
    );

    return;
  }

  byId("btnCameraEnable").disabled = false;

  setCameraStatus(
    "Tippe auf „KAMERA AKTIVIEREN“ und erlaube Chrome den Kamerazugriff."
  );
}

function closeCameraDialog() {
  stopCamera();

  const dialog = byId("cameraDialog");

  if (dialog.open) {
    dialog.close();
  }
}

async function enableCamera() {
  if (!cameraSupported()) {
    setCameraStatus(
      "Kameraaufnahme wird von diesem Browser nicht unterstützt.",
      "error"
    );

    return;
  }

  stopCamera();
  resetPlayback();

  try {
    setCameraStatus("Kamera wird aktiviert ...");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,

      video: {
        facingMode: {
          ideal: "environment"
        },

        width: {
          ideal: 1280
        },

        height: {
          ideal: 720
        }
      }
    });

    state.cameraStream = stream;

    const preview = byId("cameraPreview");

    preview.srcObject = stream;
    preview.hidden = false;

    await preview.play().catch(() => undefined);

    byId("btnCameraEnable").textContent = "KAMERA AKTIV";
    byId("btnCameraRecord").disabled = false;

    setCameraStatus(
      "Kamera bereit. Prüfe den Bildausschnitt und starte dann die Aufnahme."
    );
  } catch (error) {
    const denied =
      error &&
      (
        error.name === "NotAllowedError" ||
        error.name === "SecurityError"
      );

    setCameraStatus(
      denied
        ? "Kamera nicht freigegeben. Erlaube die Kamera in Chrome für diese Website."
        : "Kamera konnte nicht gestartet werden. Schließe andere Kamera-Apps und versuche es erneut.",
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

function startRecording() {
  if (!state.cameraStream) {
    setCameraStatus("Bitte zuerst die Kamera aktivieren.", "error");
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
      const videoType = state.mediaRecorder
        ? state.mediaRecorder.mimeType
        : "video/webm";

      const blob = new Blob(state.recordedChunks, {
        type: videoType
      });

      state.cameraRecording = false;
      byId("btnCameraRecord").textContent = "AUFNAHME STARTEN";

      if (blob.size > 0) {
        state.recordedVideoUrl = URL.createObjectURL(blob);

        const playback = byId("cameraPlayback");

        playback.src = state.recordedVideoUrl;
        playback.hidden = false;

        byId("cameraPreview").hidden = true;
        byId("btnCameraDiscard").disabled = false;

        setCameraStatus(
          "Aufnahme beendet. Prüfe den Clip oder verwirf ihn für eine neue Aufnahme."
        );

        setRecordStatus(
          "Clip lokal gespeichert: Test-ID und Kamera-Rolle bleiben diesem Handy zugeordnet."
        );
      } else {
        setCameraStatus("Es wurde kein Video erstellt.", "error");
      }

      state.mediaRecorder = null;
    });

    state.mediaRecorder.start(500);

    state.cameraRecording = true;

    byId("btnCameraRecord").textContent = "AUFNAHME BEENDEN";

    setCameraStatus(
      "AUFZEICHNUNG LÄUFT · Klatschen sichtbar machen, dann zwei gerade Laufsequenzen filmen.",
      "recording"
    );
  } catch (error) {
    setCameraStatus("Aufnahme konnte nicht gestartet werden.", "error");
  }
}

function toggleRecording() {
  if (state.cameraRecording) {
    if (
      state.mediaRecorder &&
      state.mediaRecorder.state === "recording"
    ) {
      state.mediaRecorder.stop();
    }

    return;
  }

  startRecording();
}

function discardRecording() {
  resetPlayback();

  if (state.cameraStream) {
    byId("cameraPreview").hidden = false;
  }

  setCameraStatus(
    "Aufnahme verworfen. Kamera ist bereit für einen neuen Clip."
  );
}

async function copyJoinLink() {
  const joinUrl = getJoinUrl();

  try {
    await navigator.clipboard.writeText(joinUrl);

    byId("copyStatus").textContent =
      "Beitritts-Link kopiert. Sende ihn per WhatsApp an Handy B und C.";
  } catch (error) {
    byId("copyStatus").textContent =
      `Link kopieren und weitergeben: ${joinUrl}`;
  }
}

function createMainTest() {
  const dogName = byId("dogName").value.trim();

  if (!dogName) {
    window.alert("Bitte gib zuerst den Namen deines Hundes ein.");
    byId("dogName").focus();
    return;
  }

  state.testId = createTestId();
  state.role = "A";
  state.dogName = dogName;
  state.harnessName = byId("harnessName").value.trim();

  saveSession();
  updateSessionUi();
  renderQrCode();

  showScreen("screenInvite");
}

function joinExistingTest() {
  const params = new URLSearchParams(window.location.search);

  const fromUrl = (params.get("test") || "").trim().toUpperCase();

  const manual = byId("manualTestId")
    .value
    .trim()
    .toUpperCase();

  const testId = fromUrl || manual;

  if (!/^BF-[A-Z0-9]{6}$/.test(testId)) {
    window.alert(
      "Bitte gib eine gültige Test-ID ein, zum Beispiel BF-7K2M9P."
    );

    byId("manualTestId").focus();

    return;
  }

  state.testId = testId;
  state.role = byId("joinRole").value;

  saveSession();
  updateSessionUi();
  renderSetup();

  setRecordStatus(
    `Du bist Test ${state.testId} als ${roleName(state.role)} beigetreten.`
  );

  showScreen("screenSetup");
}

function resetApp() {
  stopCamera();
  revokeVideoUrl();

  state.testId = "";
  state.role = "A";
  state.dogName = "";
  state.harnessName = "";

  localStorage.removeItem("bestFitSession");

  byId("dogName").value = "";
  byId("harnessName").value = "";
  byId("manualTestId").value = "";

  updateSessionUi();
  showScreen("screenWelcome");

  const url = new URL(window.location.href);

  url.search = "";

  window.history.replaceState({}, "", url);
}

function restoreSession() {
  const saved = localStorage.getItem("bestFitSession");

  if (!saved) {
    return;
  }

  try {
    const session = JSON.parse(saved);

    state.testId = session.testId || "";
    state.role = session.role || "A";
    state.dogName = session.dogName || "";
    state.harnessName = session.harnessName || "";

    updateSessionUi();
    renderSetup();
  } catch (error) {
    localStorage.removeItem("bestFitSession");
  }
}

function bindEvents() {
  byId("startTestButton").addEventListener("click", () => {
    showScreen("screenProfile");
  });

  byId("joinTestButton").addEventListener("click", () => {
    showScreen("screenJoin");
  });

  byId("profileBackButton").addEventListener("click", () => {
    showScreen("screenWelcome");
  });

  byId("profileContinue").addEventListener("click", createMainTest);

  byId("joinBackButton").addEventListener("click", () => {
    showScreen("screenWelcome");
  });

  byId("joinContinue").addEventListener("click", joinExistingTest);

  byId("copyJoinLinkButton").addEventListener("click", copyJoinLink);

  byId("inviteBackButton").addEventListener("click", () => {
    showScreen("screenProfile");
  });

  byId("inviteContinue").addEventListener("click", () => {
    renderSetup();
    showScreen("screenSetup");
  });

  byId("setupBackButton").addEventListener("click", () => {
    showScreen(state.role === "A" ? "screenInvite" : "screenJoin");
  });

  byId("setupContinue").addEventListener("click", () => {
    updateSessionUi();
    showScreen("screenRecord");
    openCameraDialog();
  });

  byId("recordBackButton").addEventListener("click", () => {
    stopCamera();
    showScreen("screenSetup");
  });

  byId("openCameraButton").addEventListener("click", openCameraDialog);

  byId("openResultButton").addEventListener("click", () => {
    stopCamera();
    showScreen("screenResult");
  });

  byId("finishTestButton").addEventListener("click", () => {
    stopCamera();
    showScreen("screenResult");
  });

  byId("btnCameraEnable").addEventListener("click", enableCamera);
  byId("btnCameraRecord").addEventListener("click", toggleRecording);
  byId("btnCameraDiscard").addEventListener("click", discardRecording);
  byId("btnCameraClose").addEventListener("click", closeCameraDialog);

  byId("cameraDialog").addEventListener("cancel", (event) => {
    event.preventDefault();
    closeCameraDialog();
  });

  byId("cameraDialog").addEventListener("close", () => {
    stopCamera();
  });

  byId("retestButton").addEventListener("click", () => {
    renderSetup();
    showScreen("screenSetup");
  });

  byId("newTestButton").addEventListener("click", resetApp);

  window.addEventListener("pagehide", stopCamera);
}

function init() {
  updateClock();

  window.setInterval(updateClock, 1000);

  updateSessionUi();
  renderSetup();
  bindEvents();

  if (readJoinUrl()) {
    return;
  }

  restoreSession();
}

document.addEventListener("DOMContentLoaded", init);
