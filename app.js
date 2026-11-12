// ============================================================
// HYDRATION STATION - PHASE 1 CORE LOGIC
// ============================================================

const STORAGE_KEY = "hydration_station_v1";

// Default State
let state = {
  date: new Date().toDateString(),
  consumedMl: 0,
  targetMl: 2000,
  glassSizeMl: 250,
  historyStack: [] // Allows undoing accidental taps
};

// Load saved state from localStorage
function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    const today = new Date().toDateString();

    // Reset daily intake if a new day has started, but preserve settings
    if (parsed.date !== today) {
      state.date = today;
      state.consumedMl = 0;
      state.historyStack = [];
      state.targetMl = parsed.targetMl || 2000;
      state.glassSizeMl = parsed.glassSizeMl || 250;
      saveState();
    } else {
      state = { ...state, ...parsed };
    }
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Helper: Pick random line from an array
function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Update Greeting & Date
function updateHeaderAndGreeting() {
  const now = new Date();
  const options = { weekday: "short", month: "short", day: "numeric" };
  document.getElementById("current-date").textContent = now.toLocaleDateString("en-US", options);

  const hour = now.getHours();
  let greeting = KELLY_DIALOGUE.greetings.morning;
  if (hour >= 12 && hour < 17) greeting = KELLY_DIALOGUE.greetings.afternoon;
  else if (hour >= 17 && hour < 22) greeting = KELLY_DIALOGUE.greetings.evening;
  else if (hour >= 22 || hour < 5) greeting = KELLY_DIALOGUE.greetings.night;

  document.getElementById("greeting-text").textContent = greeting;
}

// Render Progress, Glass Equivalents, and UI
function renderUI(customSpeech = null) {
  const { consumedMl, targetMl, glassSizeMl } = state;
  const remainingMl = Math.max(0, targetMl - consumedMl);
  const rawPercent = Math.round((consumedMl / targetMl) * 100);
  const clampedPercent = Math.min(100, rawPercent);
  const glassCount = (consumedMl / glassSizeMl).toFixed(1);

  document.getElementById("consumed-ml").textContent = consumedMl.toLocaleString();
  document.getElementById("target-ml").textContent = targetMl.toLocaleString();
  document.getElementById("glass-estimate").textContent =
    `≈ ${glassCount} glasses (est. based on ${glassSizeMl} mL/glass)`;
  document.getElementById("percent-text").textContent = `${rawPercent}%`;

  // Update Progress Bar & Water Glass Fill
  document.getElementById("progress-bar-fill").style.width = `${clampedPercent}%`;
  document.getElementById("glass-water-fill").style.height = `${clampedPercent}%`;

  // Remaining or Completion Message (Avoids pressuring over-consumption)
  const remainingEl = document.getElementById("remaining-text");
  if (consumedMl >= targetMl) {
    remainingEl.textContent = "Daily hydration target reached! Great pace.";
  } else {
    remainingEl.textContent = `${remainingMl.toLocaleString()} mL remaining today`;
  }

  // Update Speech Bubble if triggered
  if (customSpeech) {
    const speechEl = document.getElementById("kelly-speech");
    speechEl.textContent = `“${customSpeech}”`;

    const mascotWrap = document.getElementById("mascot-container");
    mascotWrap.classList.remove("bounce");
    void mascotWrap.offsetWidth; // trigger reflow
    mascotWrap.classList.add("bounce");
  }

  // Sync Settings Inputs
  document.getElementById("setting-target").value = targetMl;
  document.getElementById("setting-glass").value = glassSizeMl;
}

// Log Water Function
function logWater(amountMl) {
  if (!amountMl || amountMl <= 0) return;

  const wasBelowGoal = state.consumedMl < state.targetMl;
  state.consumedMl += amountMl;
  state.historyStack.push(amountMl);
  saveState();

  const isNowAtOrAboveGoal = state.consumedMl >= state.targetMl;
  const reaction =
    wasBelowGoal && isNowAtOrAboveGoal
      ? pickRandom(KELLY_DIALOGUE.goalReached)
      : pickRandom(KELLY_DIALOGUE.sweetReactions);

  renderUI(reaction);
}

// Undo Last Drink
function undoLastDrink() {
  if (state.historyStack.length === 0) return;
  const lastAmount = state.historyStack.pop();
  state.consumedMl = Math.max(0, state.consumedMl - lastAmount);
  saveState();
  renderUI("Oops, let’s rewind that last sip! Fixed it for you.");
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  updateHeaderAndGreeting();
  renderUI(pickRandom(KELLY_DIALOGUE.initialPrompts));

  // Toggle Quick-Add Panel
  const openLogBtn = document.getElementById("open-log-btn");
  const quickAddPanel = document.getElementById("quick-add-panel");
  openLogBtn.addEventListener("click", () => {
    quickAddPanel.classList.toggle("open");
  });

  // Preset mL buttons
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ml = parseInt(btn.getAttribute("data-ml"), 10);
      logWater(ml);
    });
  });

  // Custom mL button
  document.getElementById("add-custom-btn").addEventListener("click", () => {
    const input = document.getElementById("custom-ml-input");
    const ml = parseInt(input.value, 10);
    if (ml && ml > 0) {
      logWater(ml);
      input.value = "";
    }
  });

  // Undo button
  document.getElementById("undo-btn").addEventListener("click", undoLastDrink);

  // Save Settings
  document.getElementById("save-settings-btn").addEventListener("click", () => {
    const newTarget = parseInt(document.getElementById("setting-target").value, 10);
    const newGlass = parseInt(document.getElementById("setting-glass").value, 10);

    if (newTarget >= 500 && newGlass >= 50) {
      state.targetMl = newTarget;
      state.glassSizeMl = newGlass;
      saveState();
      renderUI("Preferences updated! Mini Kelly has adjusted your chart.");
      const feedback = document.getElementById("settings-feedback");
      feedback.textContent = "Saved!";
      setTimeout(() => (feedback.textContent = ""), 2500);
    }
  });

  // Bottom Navigation Switching
  document.querySelectorAll(".nav-item").forEach((navBtn) => {
    navBtn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));

      navBtn.classList.add("active");
      const targetId = navBtn.getAttribute("data-target");
      document.getElementById(targetId).classList.add("active");
    });
  });
});
