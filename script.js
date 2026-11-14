const STORAGE_KEY = "hydration_station_pedro_v6";

let state = {
  date: new Date().toDateString(),
  consumedMl: 0,
  targetMl: 2000,
  glassSizeMl: 250,
  historyStack: [],
  days: {}
};

const expressions = {
  storm:   { x: "50%",  y: "100%", line: "Zero water?! Do I need to get strict with you, Pedro?" },
  annoyed: { x: "100%", y: "50%",  line: "Is that all? Keep going, Pedro." },
  kiss:    { x: "0%",   y: "0%",   line: "Mwah! Thanks for the sip, Luv. ♡" },
  wink:    { x: "50%",  y: "50%",  line: "Sehr gut gemacht, Pedro! What a good job! ✨" },
  yellow:  { x: "0%",   y: "50%",  line: "100% COMPLETE! Ausgezeichnet, Pedro! I approve! ♡" },
  huff:    { x: "50%",  y: "0%",   line: "Hmph. You undone a sip? I'm watching you, Pedro." },
  sad:     { x: "100%", y: "0%",   line: "You're making me sad... please don't undo your water progress!" }
};

// Everything below uses the device's own clock, so "today" always
// matches wherever he is, no timezone setting needed.
function dateKey(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function noonDaysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function rolloverIfNeeded() {
  const today = new Date().toDateString();
  if (state.date === today) return false;
  const prev = new Date(state.date);
  if (!isNaN(prev)) {
    state.days[dateKey(prev)] = { ml: state.consumedMl, target: state.targetMl };
  }
  state.date = today;
  state.consumedMl = 0;
  state.historyStack = [];
  saveState();
  return true;
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
      state.days = parsed.days || {};
    }
  } catch (e) {}
  rolloverIfNeeded();
}

function saveState() {
  state.days[dateKey(new Date())] = { ml: state.consumedMl, target: state.targetMl };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
}

function dayMet(key) {
  const e = state.days[key];
  return !!e && e.target > 0 && e.ml >= e.target;
}

function computeStreak() {
  let cur = noonDaysAgo(0);
  // If today isn't done yet, the streak is still alive from yesterday.
  if (!dayMet(dateKey(cur))) cur = noonDaysAgo(1);
  let n = 0;
  while (dayMet(dateKey(cur))) {
    n++;
    cur.setDate(cur.getDate() - 1);
  }
  return n;
}

function computeBest() {
  const keys = Object.keys(state.days).filter(dayMet).sort();
  let best = 0, run = 0, prev = null;
  keys.forEach(function (k) {
    const d = new Date(k + "T12:00:00");
    if (prev && Math.round((d - prev) / 86400000) === 1) run++;
    else run = 1;
    best = Math.max(best, run);
    prev = d;
  });
  return best;
}

function renderStreak() {
  const streak = computeStreak();
  const best = Math.max(computeBest(), streak);
  const todayMet = dayMet(dateKey(new Date()));
  const remaining = Math.max(0, state.targetMl - state.consumedMl);

  document.getElementById("streak-count").textContent = streak;
  document.getElementById("streak-best").textContent = `Best: ${best}`;
  document.getElementById("streak-flame").classList.toggle("cold", streak === 0);

  let msg;
  if (todayMet) {
    msg = "Today's goal is done. Streak secured! 🔥";
  } else if (streak > 0) {
    msg = new Date().getHours() >= 18
      ? `Your ${streak}-day streak ends tonight! ${remaining.toLocaleString()} mL to go.`
      : `Hit your goal today to make it ${streak + 1}!`;
  } else {
    msg = "Hit your goal today to start a streak!";
  }
  document.getElementById("streak-status").textContent = msg;

  let dots = "";
  for (let i = 6; i >= 0; i--) {
    const d = noonDaysAgo(i);
    const cls = "streak-dot" + (dayMet(dateKey(d)) ? " met" : "") + (i === 0 ? " today" : "");
    dots += `<div class="${cls}">${d.toLocaleDateString("en-US", { weekday: "narrow" })}</div>`;
  }
  document.getElementById("streak-dots").innerHTML = dots;
}

function updateGreeting() {
  const now = new Date();
  document.getElementById("current-date").textContent = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });

  const hr = now.getHours();
  let msg = "Mooorning, Love!";
  if (hr >= 12 && hr < 17) msg = "Sunny afternoon, Pedro!";
  else if (hr >= 17 && hr < 22) msg = "Evening, Pedro! Winding down?";
  else if (hr >= 22 || hr < 5) msg = "Still awake, Cheesecake?";
  document.getElementById("greeting-text").textContent = msg;
}

function setExpression(key) {
  const expr = expressions[key] || expressions.storm;
  document.getElementById("kelly-sprite-face").style.backgroundPosition = `${expr.x} ${expr.y}`;
  document.getElementById("kelly-speech").textContent = `“${expr.line}”`;
}

function renderUI(forcedKey) {
  const { consumedMl, targetMl, glassSizeMl } = state;
  const remaining = Math.max(0, targetMl - consumedMl);
  const rawPct = Math.round((consumedMl / targetMl) * 100);
  const barPct = Math.min(100, rawPct);
  const glasses = (consumedMl / glassSizeMl).toFixed(1);

  document.getElementById("consumed-ml").textContent = consumedMl.toLocaleString();
  document.getElementById("target-ml").textContent = targetMl.toLocaleString();
  document.getElementById("glass-estimate").textContent =
    `≈ ${glasses} glasses (est. based on ${glassSizeMl} mL/glass)`;
  document.getElementById("percent-text").textContent = `${rawPct}%`;

  document.getElementById("progress-bar-fill").style.width = `${barPct}%`;
  document.getElementById("glass-water-fill").style.height = `${barPct}%`;

  document.getElementById("remaining-text").textContent =
    consumedMl >= targetMl
      ? "Daily hydration target reached! Ausgezeichnet!"
      : `${remaining.toLocaleString()} mL remaining today`;

  if (forcedKey) {
    setExpression(forcedKey);
  } else {
    if (consumedMl <= 0) {
      setExpression("storm");
    } else if (rawPct >= 100) {
      setExpression("yellow");
    } else {
      const stageChoices = ["annoyed", "kiss", "wink"];
      const choiceIndex = Math.floor(consumedMl / 300) % stageChoices.length;
      setExpression(stageChoices[choiceIndex]);
    }
  }

  document.getElementById("setting-target").value = targetMl;
  document.getElementById("setting-glass").value = glassSizeMl;
  renderStreak();
}

function logWater(ml) {
  if (!ml || ml <= 0) return;
  state.consumedMl += ml;
  state.historyStack.push(ml);
  saveState();

  if (state.consumedMl >= state.targetMl) {
    renderUI("yellow");
  } else {
    const stageChoices = ["annoyed", "kiss", "wink"];
    const choiceIndex = (state.historyStack.length - 1) % stageChoices.length;
    renderUI(stageChoices[choiceIndex]);
  }
}

loadState();
updateGreeting();

if (state.consumedMl <= 0) {
  renderUI("storm");
} else {
  renderUI();
}

function checkNewDay() {
  if (rolloverIfNeeded()) {
    updateGreeting();
    renderUI("storm");
  }
}
setInterval(checkNewDay, 30000);
document.addEventListener("visibilitychange", function () {
  if (!document.hidden) checkNewDay();
});

document.getElementById("open-log-btn").addEventListener("click", function () {
  document.getElementById("quick-add-panel").classList.toggle("open");
});

document.querySelectorAll(".preset-btn").forEach(function (btn) {
  btn.addEventListener("click", function () {
    logWater(parseInt(this.getAttribute("data-ml"), 10));
  });
});

document.getElementById("add-custom-btn").addEventListener("click", function () {
  const input = document.getElementById("custom-ml-input");
  const val = parseInt(input.value, 10);
  if (val && val > 0) {
    logWater(val);
    input.value = "";
  }
});

document.getElementById("undo-btn").addEventListener("click", function () {
  if (state.historyStack.length === 0) return;
  const last = state.historyStack.pop();
  state.consumedMl = Math.max(0, state.consumedMl - last);
  saveState();

  if (state.consumedMl === 0) {
    renderUI("storm");
  } else {
    const undoChoice = (state.historyStack.length % 2 === 0) ? "huff" : "sad";
    renderUI(undoChoice);
  }
});

document.getElementById("save-settings-btn").addEventListener("click", function () {
  const newTarget = parseInt(document.getElementById("setting-target").value, 10);
  const newGlass = parseInt(document.getElementById("setting-glass").value, 10);
  if (newTarget >= 500 && newGlass >= 50) {
    state.targetMl = newTarget;
    state.glassSizeMl = newGlass;
    saveState();
    renderUI();
    const fb = document.getElementById("settings-feedback");
    fb.textContent = "Saved!";
    setTimeout(() => (fb.textContent = ""), 2000);
  }
});

document.querySelectorAll(".nav-tab").forEach(function (tab) {
  tab.addEventListener("click", function () {
    document.querySelectorAll(".nav-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    this.classList.add("active");
    document.getElementById(this.getAttribute("data-target")).classList.add("active");
  });
});
