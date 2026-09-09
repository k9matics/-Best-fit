"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const state = {
    step: 1,
    mode: "solo",
    currentPosition: "A",
    validClips: {
      A: false,
      B: false,
      C: false
    },
    dogName: "",
    harnessName: "",
    stream: null
  };

  const steps = Array.from(document.querySelectorAll(".step-card"));
  const indicators = Array.from(document.querySelectorAll("[data-step-indicator]"));
  const progressLabel = document.getElementById("progressLabel");
  const progressFill = document.getElementById("progressFill");

  const modeCards = Array.from(document.querySelectorAll(".mode-card"));
  const positionButtons = Array.from(document.querySelectorAll(".position-chip"));
  const clipCards = {
    A: document.querySelector('[data-clip-card="A"]'),
    B: document.querySelector('[data-clip-card="B"]'),
    C: document.querySelector('[data-clip-card="C"]')
  };

  const positionTitle = document.getElementById("positionTitle");
  const positionHelp = document.getElementById("positionHelp");
  const previewOverlayLabel = document.getElementById("previewOverlayLabel");

  const openCameraButton = document.getElementById("openCameraButton");
  const markClipValidButton = document.getElementById("markClipValidButton");
  const nextPositionButton = document.getElementById("nextPositionButton");
  const finishCaptureButton = document.getElementById("finishCaptureButton");
  const restartButton = document.getElementById("restartButton");

  const dialog = document.getElementById("cameraDialog");
  const btnCameraEnable = document.getElementById("btnCameraEnable");
  const btnCameraStop = document.getElementById("btnCameraStop");
  const cameraPreview = document.getElementById("cameraPreview");
  const cameraState = document.getElementById("cameraState");
  const cameraFrameRate = document.getElementById("cameraFrameRate");

  const dogNameInput = document.getElementById("dogName");
  const harnessNameInput = document.getElementById("harnessName");

  const reportDogName = document.getElementById("reportDogName");
  const reportMode = document.getElementById("reportMode");
  const reportClips = document.getElementById("reportClips");
  const reportScore = document.getElementById("reportScore");
  const reportQuality = document.getElementById("reportQuality");

  const positionMeta = {
    A: {
      title: "POSITION A · SEITENANSICHT",
      help: "Stelle das Smartphone seitlich zur Laufstrecke auf Schulterhöhe des Hundes. Der Hund sollte den Messbereich ruhig und gerade durchlaufen."
    },
    B: {
      title: "POSITION B · VORDERANSICHT",
      help: "Stelle das Smartphone vorne schräg zur Laufstrecke. Zeige Brustbereich, Geradeauslauf und möglichst den gesamten Hund im Messbereich."
    },
    C: {
      title: "POSITION C · HECKANSICHT",
      help: "Stelle das Smartphone hinten schräg zur Laufstrecke. Zeige Rückensteg, Stabilität und Hinterhand möglichst vollständig."
    }
  };

  function setStep(step) {
    state.step = step;

    steps.forEach((panel) => {
      panel.classList.toggle("is-active", Number(panel.dataset.step) === step);
    });

    indicators.forEach((indicator) => {
      const value = Number(indicator.dataset.stepIndicator);
      indicator.classList.toggle("is-active", value === step);
      indicator.classList.toggle("is-done", value < step);
    });

    if (progressLabel) {
      progressLabel.textContent = `SCHRITT ${step} VON 4`;
    }

    if (progressFill) {
      progressFill.style.width = `${step * 25}%`;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setMode(mode) {
    state.mode = mode;
    modeCards.forEach((card) => {
      card.classList.toggle("is-selected", card.dataset.mode === mode);
    });
  }

  function setPosition(position) {
    state.currentPosition = position;
    const meta = positionMeta[position];

    if (positionTitle) {
      positionTitle.textContent = meta.title;
    }

    if (positionHelp) {
      positionHelp.textContent = meta.help;
    }

    if (previewOverlayLabel) {
      previewOverlayLabel.textContent = meta.title;
    }

    positionButtons.forEach((button) => {
      const isCurrent = button.dataset.position === position;
      button.classList.toggle("is-current", isCurrent);
      button.classList.toggle("is-valid", state.validClips[button.dataset.position]);
    });
  }

  function markClipValid() {
    const position = state.currentPosition;
    state.validClips[position] = true;

    const card = clipCards[position];
    if (card) {
      card.classList.remove("is-pending");
      card.classList.add("is-valid");
      const status = card.querySelector(".clip-head span");
      if (status) {
        status.textContent = "GÜLTIG";
      }
    }

    const button = document.querySelector(`.position-chip[data-position="${position}"]`);
    if (button) {
      button.classList.add("is-valid");
    }
  }

  function nextPosition() {
    const order = ["A", "B", "C"];
    const currentIndex = order.indexOf(state.currentPosition);
    const next = order[Math.min(currentIndex + 1, order.length - 1)];
    setPosition(next);
  }

  function validClipList() {
    return ["A", "B", "C"].filter((key) => state.validClips[key]);
  }

  function buildReport() {
    state.dogName = (dogNameInput?.value || "").trim();
    state.harnessName = (harnessNameInput?.value || "").trim();

    const clips = validClipList();
    const hasAll = clips.length === 3;
    const score = hasAll ? 78 : clips.length === 2 ? 68 : 52;
    const quality = hasAll ? "GUT · 86 %" : clips.length === 2 ? "EINGESCHRÄNKT · 71 %" : "NIEDRIG · 54 %";

    if (reportDogName) {
      reportDogName.textContent = state.dogName || "DEIN HUND";
    }

    if (reportMode) {
      reportMode.textContent =
        state.mode === "solo"
          ? "1 GERÄT · 3 POSITIONEN"
          : "3 GERÄTE GLEICHZEITIG";
    }

    if (reportClips) {
      reportClips.textContent = clips.length ? clips.join(" · ") : "KEINE";
    }

    if (reportScore) {
      reportScore.textContent = String(score);
    }

    if (reportQuality) {
      reportQuality.textContent = quality;
    }
  }

  function resetMeasurement() {
    state.step = 1;
    state.mode = "solo";
    state.currentPosition = "A";
    state.validClips = { A: false, B: false, C: false };
    state.dogName = "";
    state.harnessName = "";

    if (dogNameInput) dogNameInput.value = "";
    if (harnessNameInput) harnessNameInput.value = "";

    Object.entries(clipCards).forEach(([key, card]) => {
      if (!card) return;
      card.classList.remove("is-valid");
      card.classList.add("is-pending");
      const status = card.querySelector(".clip-head span");
      if (status) {
        status.textContent = "PENDING";
      }
    });

    positionButtons.forEach((button) => {
      button.classList.remove("is-valid");
    });

    setMode("solo");
    setPosition("A");
    setStep(1);
    stopCamera();
  }

  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (cameraState) {
        cameraState.textContent = "KAMERA IM BROWSER NICHT VERFÜGBAR";
      }
      return;
    }

    try {
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60, max: 120 }
        },
        audio: false
      });

      state.stream = stream;

      if (cameraPreview) {
        cameraPreview.srcObject = stream;
      }

      const track = stream.getVideoTracks()[0];
      const settings = track ? track.getSettings() : null;
      const fps = settings && settings.frameRate ? Math.round(settings.frameRate) : "—";

      if (cameraState) {
        cameraState.textContent = "KAMERA AKTIV";
      }

      if (cameraFrameRate) {
        cameraFrameRate.textContent = `FPS: ${fps}`;
      }
    } catch (error) {
      if (cameraState) {
        cameraState.textContent = "KAMERA KONNTE NICHT GESTARTET WERDEN";
      }

      if (cameraFrameRate) {
        cameraFrameRate.textContent = "FPS: —";
      }
    }
  }

  function stopCamera() {
    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
      state.stream = null;
    }

    if (cameraPreview) {
      cameraPreview.srcObject = null;
    }

    if (cameraState) {
      cameraState.textContent = "KAMERA GESTOPPT";
    }

    if (cameraFrameRate) {
      cameraFrameRate.textContent = "FPS: —";
    }
  }

  document.querySelectorAll("[data-next-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = Number(button.dataset.nextStep);
      setStep(next);
    });
  });

  document.querySelectorAll("[data-prev-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const prev = Number(button.dataset.prevStep);
      setStep(prev);
    });
  });

  modeCards.forEach((card) => {
    card.addEventListener("click", () => {
      setMode(card.dataset.mode || "solo");
    });
  });

  positionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setPosition(button.dataset.position || "A");
    });
  });

  if (openCameraButton) {
    openCameraButton.addEventListener("click", () => {
      if (dialog && typeof dialog.showModal === "function") {
        dialog.showModal();
      }
    });
  }

  if (btnCameraEnable) {
    btnCameraEnable.addEventListener("click", startCamera);
  }

  if (btnCameraStop) {
    btnCameraStop.addEventListener("click", stopCamera);
  }

  if (markClipValidButton) {
    markClipValidButton.addEventListener("click", markClipValid);
  }

  if (nextPositionButton) {
    nextPositionButton.addEventListener("click", nextPosition);
  }

  if (finishCaptureButton) {
    finishCaptureButton.addEventListener("click", () => {
      buildReport();
      setStep(4);
      stopCamera();
      if (dialog?.open) {
        dialog.close();
      }
    });
  }

  if (restartButton) {
    restartButton.addEventListener("click", resetMeasurement);
  }

  if (dialog) {
    dialog.addEventListener("close", stopCamera);
  }

  setMode("solo");
  setPosition("A");
  setStep(1);
});
