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

  if (sessionHeader) sessionHeader.textContent = sessionText;
  if (inviteTestId) inviteTestId.textContent = state.testId || "BF-000000";
  if (recordTestId) {
    recordTestId.textContent = `${state.testId || "BF-000000"} · ${roleName(state.role)}`;
  }
  if (resultTestId) resultTestId.textContent = state.testId || "BF-000000";
  if (resultDogName) {
    resultDogName.textContent = state.dogName ? state.dogName.toUpperCase() : "DEIN HUND";
  }
  if (recordTitle) recordTitle.textContent = `${roleShortName(state.role)} bereit machen`;
  if (openCameraButton) openCameraButton.textContent = `${roleShortName(state.role)} ÖFFNEN`;
  if (cameraDialogTitle) cameraDialogTitle.textContent = roleShortName(state.role);
  if (cameraRoleLabel) cameraRoleLabel.textContent = roleName(state.role);
  if (cameraFrameRate) cameraFrameRate.value = String(state.selectedFrameRate);
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

  if (!box) return;

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

  const joinedTestId = byId("joinedTestId");
  const joinedSessionCard = byId("joinedSessionCard");
  const manualJoinField = byId("manualJoinField");
  const joinTitle = byId("joinTitle");
  const joinHint = byId("joinHint");

  if (joinedTestId) joinedTestId.textContent = testId;
  if (joinedSessionCard) joinedSessionCard.classList.remove("is-hidden");
  if (manualJoinField) manualJoinField.classList.add("is-hidden");
  if (joinTitle) joinTitle.textContent = "Diesem Test beitreten";
  if (joinHint) {
    joinHint.textContent =
      "Die Test-ID wurde aus dem QR-Code übernommen. Wähle jetzt die Rolle dieses Handys.";
  }

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
  const light = byId("cameraRecordLight");

  if (status) {
    status.textContent = message;
    status.classList.toggle("is-error", type === "error");
    status.classList.toggle("is-recording", type === "recording");
  }

  if (light) {
    if (type === "recording") {
      light.textContent = "REC ●";
    } else if (state.cameraStream) {
      light.textContent = "BEREIT";
    } else {
      light.textContent = "KAMERA AUS";
    }

    light.classList.toggle("is-recording", type === "recording");
  }
}

function setCameraActualSettings(message) {
  const el = byId("cameraActualSettings");
  if (el) el.textContent = message;
}

function setRecordStatus(message) {
  const el = byId("recordStatus");
  if (el) el.textContent = message;
}

function cameraSupported() {
  return Boolean(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    window.MediaRecorder
  );
}

function updateFrameRateSelection() {
  const select = byId("cameraFrameRate");
  state.selectedFrameRate = Number(select?.value) || 60;

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
  const discard = byId("btnCameraDiscard");

  if (playback) {
    playback.pause();
    playback.removeAttribute("src");
    playback.hidden = true;
    playback.load();
  }

  if (preview) preview.hidden = false;
  if (discard) discard.disabled = true;
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
  const btnRecord = byId("btnCameraRecord");
  const btnEnable = byId("btnCameraEnable");

  if (preview) preview.srcObject = null;
  if (btnRecord) {
    btnRecord.disabled = true;
    btnRecord.textContent = "AUFNAHME STARTEN";
  }
  if (btnEnable) btnEnable.textContent = "KAMERA AKTIVIEREN";

  setCameraStatus("Kamera geschlossen.");
}

function openCameraDialog() {
  const dialog = byId("cameraDialog");

  if (!dialog) {
    alert("Der Kamera-Dialog fehlt im HTML.");
    return;
  }

  if (typeof dialog.showModal !== "function") {
    setCameraStatus("Dieser Browser unterstützt den Kamera-Dialog nicht.", "error");
    return;
  }

  if (!dialog.open) {
    dialog.showModal();
  }

  resetPlayback();
  updateFrameRateSelection();

  const btnEnable = byId("btnCameraEnable");

  if (!cameraSupported()) {
    if (btnEnable) btnEnable.disabled = true;

    setCameraStatus(
      "Kameraaufnahme wird von diesem Browser nicht unterstützt.",
      "error"
    );
    return;
  }

  if (btnEnable) btnEnable.disabled = false;

  setCameraStatus(
    "Wähle die Bildrate und tippe dann auf „KAMERA AKTIVIEREN“."
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
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: state.selectedFrameRate }
      }
    });

    state.cameraStream = stream;

    const preview = byId("cameraPreview");
    if (!preview) {
      setCameraStatus("Video-Vorschau fehlt im HTML.", "error");
      return;
    }

    preview.srcObject = stream;
    preview.hidden = false;

    await preview.play().catch(() => undefined);

    const track = stream.getVideoTracks()[0];
    const settings = track && track.getSettings ? track.getSettings() : {};

    const realFps = settings.frameRate ? Math.round(settings.frameRate) : "unbekannt";
    const width = settings.width || "?";
    const height = settings.height || "?";

    setCameraActualSettings(
      `AKTIV: ${width} × ${height} · ${realFps} fps · angefordert: ${state.selectedFrameRate} fps`
    );

    const btnEnable = byId("btnCameraEnable");
    const btnRecord = byId("btnCameraRecord");

    if (btnEnable) btnEnable.textContent = "KAMERA AKTIV";
    if (btnRecord) btnRecord.disabled = false;

    setCameraStatus(
      "Kamera bereit. Prüfe den Bildausschnitt und starte dann die Aufnahme."
    );

    setRecordStatus(`Kamera aktiv: ${width} × ${height} bei ${realFps} fps.`);
  } catch (error) {
    const denied =
      error &&
      (error.name === "NotAllowedError" || error.name === "SecurityError");

    setCameraStatus(
      denied
        ? "Kamera nicht freigegeben. Erlaube die Kamera in Chrome für diese Website."
        : `Kamera konnte nicht gestartet werden: ${error?.name || "unbekannter Fehler"}. Wähle 60 oder 30 fps und versuche es erneut.`,
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
      const recorder = state.mediaRecorder;
      const videoType = recorder ? recorder.mimeType : "video/webm";

      const blob = new Blob(state.recordedChunks, { type: videoType });

      state.cameraRecording = false;

      const btnRecord = byId("btnCameraRecord");
      if (btnRecord) btnRecord.textContent = "AUFNAHME STARTEN";

      if (blob.size > 0) {
        state.recordedVideoUrl = URL.createObjectURL(blob);

        const playback = byId("cameraPlayback");
        const preview = byId("cameraPreview");
        const discard = byId("btnCameraDiscard");

        if (playback) {
          playback.src = state.recordedVideoUrl;
          playback.hidden = false;
        }

        if (preview) preview.hidden = true;
        if (discard) discard.disabled = false;

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

    const btnRecord = byId("btnCameraRecord");
    if (btnRecord) btnRecord.textContent = "AUFNAHME BEENDEN";

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
    const preview = byId("cameraPreview");
    if (preview) preview.hidden = false;
  }

  setCameraStatus(
    "Aufnahme verworfen. Kamera ist bereit für einen neuen Clip."
  );
}

async function copyJoinLink() {
  const joinUrl = getJoinUrl();
  const copyStatus = byId("copyStatus");

  try {
    await navigator.clipboard.writeText(joinUrl);
    if (copyStatus) {
      copyStatus.textContent =
        "Beitritts-Link kopiert. Sende ihn per WhatsApp an Handy B und C.";
    }
  } catch (error) {
    if (copyStatus) {
      copyStatus.textContent = `Link kopieren und weitergeben: ${joinUrl}`;
    }
  }
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

  saveSession();
  updateSessionUi();
  renderQrCode();

  showScreen("screenInvite");
}

function joinExistingTest() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = (params.get("test") || "").trim().toUpperCase();
  const manualInput = byId("manualTestId");
  const joinRole = byId("joinRole");
  const manual = manualInput?.value.trim().toUpperCase() || "";
  const testId = fromUrl || manual;

  if (!/^BF-[A-Z0-9]{6}$/.test(testId)) {
    window.alert("Bitte gib eine gültige Test-ID ein, zum Beispiel BF-7K2M9P.");
    manualInput?.focus();
    return;
  }

  state.testId = testId;
  state.role = joinRole?.value || "B";

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

  const dogName = byId("dogName");
  const harnessName = byId("harnessName");
  const manualTestId = byId("manualTestId");
  const cameraFrameRate = byId("cameraFrameRate");

  if (dogName) dogName.value = "";
  if (harnessName) harnessName.value = "";
  if (manualTestId) manualTestId.value = "";
  if (cameraFrameRate) cameraFrameRate.value = "60";

  updateSessionUi();
  showScreen("screenWelcome");

  const url = new URL(window.location.href);
  url.search = "";
  window.history.replaceState({}, "", url);
}

function restoreSession() {
  const saved = localStorage.getItem("bestFitSession");

  if (!saved) return;

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

function addClick(id, handler) {
  const el = byId(id);
  if (el) el.addEventListener("click", handler);
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

  addClick("openResultButton", () => {
    stopCamera();
    showScreen("screenResult");
  });

  addClick("finishTestButton", () => {
    stopCamera();
    showScreen("screenResult");
  });

  const frameRate = byId("cameraFrameRate");
  if (frameRate) frameRate.addEventListener("change", updateFrameRateSelection);

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

  window.addEventListener("pagehide", stopCamera);
}

function init() {
  updateClock();
  window.setInterval(updateClock, 1000);

  updateSessionUi();
  renderSetup();
  bindEvents();

  if (readJoinUrl()) return;

  restoreSession();
  updateFrameRateSelection();
}

document.addEventListener("DOMContentLoaded", init);
