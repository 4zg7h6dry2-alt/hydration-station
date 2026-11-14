const STORAGE_KEY = "hydration_station_pedro_v6";

let state = {
  date: new Date().toDateString(),
  consumedMl: 0,
  targetMl: 2000,
  glassSizeMl: 250,
  historyStack: [],
  days: {},
  theme: "ocean",
  effects: true,
  kisses: 0,
  kissesToday: 0,
  milestonesSeen: []
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
    state.days[dateKey(prev)] = { ml: state.consumedMl, target: state.targetMl, kisses: state.kissesToday || 0 };
  }
  state.date = today;
  state.consumedMl = 0;
  state.historyStack = [];
  state.kissesToday = 0;
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
  state.days[dateKey(new Date())] = { ml: state.consumedMl, target: state.targetMl, kisses: state.kissesToday || 0 };
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
    msg = "Today's goal is done. Streak secured!";
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

function setExpression(key, customLine) {
  const expr = expressions[key] || expressions.storm;
  document.getElementById("kelly-sprite-face").style.backgroundPosition = `${expr.x} ${expr.y}`;
  document.getElementById("kelly-speech").textContent = `“${customLine || expr.line}”`;
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
  updateKissState();
  if (appReady) renderDiary();
}

function logWater(ml) {
  if (!ml || ml <= 0) return;
  const before = state.consumedMl;
  state.consumedMl += ml;
  state.historyStack.push(ml);
  saveState();
  if (before < state.targetMl && state.consumedMl >= state.targetMl) {
    burstConfetti();
    checkMilestone();
  }

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
    renderNote();
    updateKissCount();
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

/* =====================================================
   PIXEL ART (drawn in code, no image files needed)
   ===================================================== */
const PIXEL = {
  hat: {
    rows: [
      "....XXXXXXXX....",
      "..XXBWBWBWBWXX..",
      ".XBWBWBWBWBWBWX.",
      "XBWBWBWBWBWBWBWX",
      "XBWBWBWBWBWBWBWX",
      "XNNNNNNGGNNNNNNX",
      "XNNNNNNNNNNNNNNX",
      "XXXXXXXXXXXXXXXX",
      ".XPPPPPPPPPPPPX.",
      "..XXXXXXXXXXXX.."
    ],
    pal: { X: "#1B2F4A", B: "#3A6EA5", W: "#EAF2FB", N: "#24456E", G: "#FFD34D", P: "#2C4F7C" }
  },
  bheart: {
    rows: [
      ".XXX.XXX.",
      "XLLBXBBBX",
      "XLBBBBBBX",
      "XBBBBBBBX",
      ".XBBBBBX.",
      "..XBBBX..",
      "...XBX...",
      "....X...."
    ],
    pal: { X: "#2F6FA3", B: "#A9D6F5", L: "#E6F4FD" }
  },
  lips: {
    rows: [
      ".OOOO...OOOO.",
      "OPPWPPOPPWPPO",
      "XXDDDDDDDDDXX",
      ".ORRPPPPPRRO.",
      ".ORPPPPWPPRO.",
      "..ORRPPPRRO..",
      "...OOOOOOO..."
    ],
    pal: { O: "#C97088", P: "#EE5F8C", R: "#D93A6A", D: "#A81F4B", X: "#7A1535", H: "#F9A8C0", W: "#FFFFFF" }
  },
  flame: {
    rows: [
      "....O.....",
      "...OO.....",
      "...OOO..O.",
      "..OOOO.OO.",
      ".OOOOOOOOO",
      ".OOOYOOOOO",
      "OOOYYYOOOO",
      "OOYYYYYOOO",
      "OOYYLYYOOO",
      "OOYLLLYOOO",
      ".OYLLLYOO.",
      "..OOOOOO.."
    ],
    pal: { O: "#E8481C", Y: "#FFA11F", L: "#FFE066" }
  },
  heart: {
    rows: [".HH.HH.", "HWHHHHH", "HHHHHHH", ".HHHHH.", "..HHH..", "...H..."],
    pal: { H: "#F26D8F", W: "#FFC2D1" }
  }
};

// Kelly's hand-made lips. If the image is missing, the pixel-code lips show instead.
const LIPS_IMG = '<img class="lips-img" src="kiss-lips.png" alt="" draggable="false" onerror="this.outerHTML=pixelSVG(PIXEL.lips)">';

function pixelSVG(art) {
  const h = art.rows.length, w = art.rows[0].length;
  let rects = "";
  art.rows.forEach(function (row, y) {
    [...row].forEach(function (c, x) {
      if (art.pal[c]) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${art.pal[c]}"/>`;
    });
  });
  return `<svg class="pixel" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

/* =====================================================
   EDIT ME: Kelly's words
   ===================================================== */
const DAILY_NOTES = [
  "Good morning, Cheesecake. You deserve a soft day and a big glass of water. 🩵",
  "Sit up straight, hydrate, and be adored. That's your whole job today, Cheesecake.",
  "Mini Kelly would bring you water in bed if she could. For now, this note will have to do. ♡",
  "You're doing so well, Luv. Treat yourself to a sip. Then another.",
  "Hydrated Pedro is happy Pedro. Drink up, Cheesecake!",
  "You work so hard. Today, let yourself be taken care of. Start with water. 🩵",
  "I'm proud of you. Not for the water, just for being you.",
  "Whatever today throws at you, you can handle it. I believe in you.",
  "Reminder: you are loved, you are capable, and you are thirsty.",
  "You deserve all the comfy things today: a soft blanket, snacks, and a very full water glass.",
  "Small sips, big love. You're doing great, Luv.",
  "Cheesecake, you are the best part of my day. Now go drink some water. ♡",
  "Be kind to yourself today. You deserve the same care you give everyone else.",
  "Mini Kelly is smiling because of you today.",
  "Every glass is a little act of self-love. Keep going.",
  "You don't have to be perfect, just keep showing up. I'm right here.",
  "Take a breath, roll your shoulders, drink some water. Better already, right?",
  "Pampering schedule for today: 1) water, 2) cuddles, 3) more water. You're welcome.",
  "Sehr gut, Pedro! You're doing everything right. Ausgezeichnet!",
  "I think you're wonderful. Just wanted you to know before your next sip.",
  "A hydrated Cheesecake is a glowing Cheesecake. ✨",
  "You're allowed to rest today. Water first, though. I'm watching. ",
  "Hard day? Come here. Have some water. Everything's going to be okay. 🩵",
  "Your mood, your focus, even your cuteness: all improved by water. Science.",
  "No one drinks water quite as adorably as you do, Pedro.",
  "You're my favorite person to take care of, Love.",
  "Little reminder that someone is thinking about you right now. It's me. ♡",
  "You've got this, Cheesecake. And if you don't, I've got you.",
  "Today's forecast: 100% chance of being loved, with scattered sips.",
  "You're my whole heart, Pedro. Hydrate it. 🩵"
];

const KISS_LINES = [
  "Mwah! Right on the cheek. ♡",
  "Kiss delivered! Now drink some water, Cheesecake.",
  "Aww, you want another? Okay... mwah!",
  "One kiss, extra hydration. That's the deal.",
  "Smooch! Sehr gut, Pedro.",
  "Kisses are good for your heart. Water too. 🩵",
  "Come here, you. Mwah! ♡",
  "Pampered and kissed. You're doing great, Luv.",
  "A kiss for my favorite Cheesecake.",
  "Mwah mwah! Now sip."
];

const FLUSTERED_LINES = [
  "Okay okay!! You're making me blush...",
  "So many kisses?! Someone's needy today. ♡",
  "Pedro!! "
];

const MILESTONES = {
  3: "3 days in a row! Okay, Pedro, I see you. Keep it going. ♡",
  7: "A WHOLE WEEK! Ausgezeichnet! I'm so proud of you, Luv.",
  14: "Two weeks!! Is there anything you can't do? 🩵",
  30: "30 days. A full month of taking care of yourself. I'm so proud of you.",
  60: "60 days!! Two months of you being amazing.",
  100: "100 DAYS. Pedro, you legend. I love you. 🩵"
};

/* =====================================================
   Daily note
   ===================================================== */
function renderNote() {
  const d = new Date();
  const dayNum = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  document.getElementById("daily-note").textContent = DAILY_NOTES[dayNum % DAILY_NOTES.length];
}

/* =====================================================
   Effects: hearts + confetti
   ===================================================== */
function floatHearts() {
  if (state.effects === false) return;
  const box = document.querySelector(".mascot-box");
  for (let i = 0; i < 6; i++) {
    const h = document.createElement("span");
    h.className = "float-heart";
    h.innerHTML = pixelSVG(PIXEL.heart);
    h.style.left = 25 + Math.random() * 50 + "%";
    h.style.animationDelay = Math.random() * 0.3 + "s";
    box.appendChild(h);
    setTimeout(function () { h.remove(); }, 1800);
  }
}

function burstConfetti() {
  if (state.effects === false) return;
  const colors = ["#73AEDB", "#F4A8B8", "#FFE066", "#9ED8C0", "#A18CDB", "#F26D8F"];
  for (let i = 0; i < 36; i++) {
    const p = document.createElement("div");
    const size = 6 + Math.floor(Math.random() * 3) * 2;
    p.className = "confetti-piece";
    p.style.width = p.style.height = size + "px";
    p.style.left = Math.random() * 100 + "vw";
    p.style.background = colors[i % colors.length];
    p.style.animationDuration = 2 + Math.random() * 1.5 + "s";
    p.style.animationDelay = Math.random() * 0.4 + "s";
    document.body.appendChild(p);
    setTimeout(function () { p.remove(); }, 4200);
  }
}

/* =====================================================
   Kiss button
   ===================================================== */
let kissTimes = [];
let lastKiss = -1;

function updateKissCount() {
  const t = state.kissesToday || 0;
  document.getElementById("kiss-count").textContent =
    t ? `${t} kiss${t === 1 ? "" : "es"} delivered today` : "";
}

let hintTimer;
let smoochTimer;

function updateKissState() {
  const ready = state.consumedMl >= state.targetMl;
  const btn = document.getElementById("kiss-btn");
  btn.classList.toggle("ready", ready);
  btn.classList.toggle("locked", !ready);
  document.getElementById("kiss-label").textContent = ready ? "Claim your kiss!" : "Tap for a kiss";
  if (ready) document.getElementById("kiss-hint").textContent = "";
}

function bigSmooch() {
  if (state.effects === false) return;
  const el = document.getElementById("smooch");
  const cells = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) cells.push([c, r]);
  cells.sort(function () { return Math.random() - 0.5; });
  let html = "";
  cells.slice(0, 8).forEach(function (cell, i) {
    const size = 72 + Math.random() * 40;
    const left = ((cell[0] + 0.1 + Math.random() * 0.5) / 3) * 100;
    const top = ((cell[1] + 0.1 + Math.random() * 0.5) / 4) * 100;
    const rot = Math.round(Math.random() * 40 - 20);
    html += `<span class="kiss-stamp" style="left:${left}%;top:${top}%;width:${size}px;--rot:${rot}deg;animation-delay:${(i * 0.12).toFixed(2)}s">${LIPS_IMG}</span>`;
  });
  el.innerHTML = html;
  el.hidden = false;
  clearTimeout(smoochTimer);
  smoochTimer = setTimeout(function () { el.hidden = true; el.innerHTML = ""; }, 3000);
}

document.getElementById("kiss-btn").addEventListener("click", function () {
  if (state.consumedMl < state.targetMl) {
    const hint = document.getElementById("kiss-hint");
    hint.textContent = "Nice try. You still have some water to drink ;)";
    setExpression("wink", "Hehe... not yet, Cheesecake. ;)");
    this.classList.remove("shake");
    void this.offsetWidth;
    this.classList.add("shake");
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function () { hint.textContent = ""; }, 5000);
    return;
  }
  const now = Date.now();
  kissTimes = kissTimes.filter(function (t) { return now - t < 8000; });
  kissTimes.push(now);
  state.kisses = (state.kisses || 0) + 1;
  state.kissesToday = (state.kissesToday || 0) + 1;
  saveState();
  updateKissCount();
  renderDiary();

  if (kissTimes.length > 6) {
    setExpression("wink", FLUSTERED_LINES[Math.floor(Math.random() * FLUSTERED_LINES.length)]);
  } else {
    let i;
    do { i = Math.floor(Math.random() * KISS_LINES.length); } while (i === lastKiss && KISS_LINES.length > 1);
    lastKiss = i;
    setExpression("kiss", KISS_LINES[i]);
  }
  floatHearts();
  bigSmooch();
  this.classList.remove("pop");
  void this.offsetWidth;
  this.classList.add("pop");
});

/* =====================================================
   Streak milestones
   ===================================================== */
function checkMilestone() {
  const n = computeStreak();
  if (!MILESTONES[n]) return;
  const key = `${n}:${dateKey(new Date())}`;
  if (state.milestonesSeen.includes(key)) return;
  state.milestonesSeen.push(key);
  saveState();
  document.getElementById("milestone-title").textContent = `${n}-DAY STREAK!`;
  document.getElementById("milestone-text").textContent = MILESTONES[n];
  document.getElementById("milestone-overlay").hidden = false;
}

function closeMilestone() {
  document.getElementById("milestone-overlay").hidden = true;
}
document.getElementById("milestone-close").addEventListener("click", closeMilestone);
document.getElementById("milestone-overlay").addEventListener("click", function (e) {
  if (e.target === this) closeMilestone();
});

/* =====================================================
   Themes + settings
   ===================================================== */
const THEME_COLORS = { ocean: "#E6F2FD", midnight: "#0E1A2A", mint: "#E4F6EE", honey: "#F7F1D8", lavender: "#EEE9FB" };

function applyTheme() {
  const t = THEME_COLORS[state.theme] ? state.theme : "ocean";
  document.documentElement.setAttribute("data-theme", t);
  document.querySelector('meta[name="theme-color"]').setAttribute("content", THEME_COLORS[t]);
  document.querySelectorAll(".theme-btn").forEach(function (b) {
    b.classList.toggle("active", b.getAttribute("data-theme") === t);
  });
  document.getElementById("setting-effects").checked = state.effects !== false;
}

document.querySelectorAll(".theme-btn").forEach(function (b) {
  b.addEventListener("click", function () {
    state.theme = this.getAttribute("data-theme");
    saveState();
    applyTheme();
  });
});

document.getElementById("setting-effects").addEventListener("change", function () {
  state.effects = this.checked;
  saveState();
});

/* =====================================================
   Start up
   ===================================================== */
document.getElementById("brand-icons").innerHTML = pixelSVG(PIXEL.hat) + pixelSVG(PIXEL.bheart);
document.getElementById("streak-flame").innerHTML = pixelSVG(PIXEL.flame);
document.getElementById("kiss-lips").innerHTML = LIPS_IMG;
document.getElementById("milestone-flame").innerHTML = pixelSVG(PIXEL.flame);
applyTheme();
renderNote();
updateKissCount();
appReady = true;
renderDiary();

/* =====================================================
   Kelly's Diary: one entry per day with water + kisses
   ===================================================== */
var appReady;

function diaryNote(e, isToday) {
  const met = e.target > 0 && e.ml >= e.target;
  const k = e.kisses || 0;
  const pct = e.target > 0 ? Math.round((e.ml / e.target) * 100) : 0;
  if (met && k > 0) return `Goal done and ${k} kiss${k === 1 ? "" : "es"} earned. Ausgezeichnet, Pedro! ♡`;
  if (met) return "Goal reached, but no kiss claimed? I'm a little offended. ;)";
  if (isToday) return e.ml > 0 ? `${pct}% so far. Keep going, Cheesecake. I'm watching.` : "Nothing yet today. I'm waiting, Pedro...";
  if (e.ml > 0) return `Only ${pct}% that day. I'm not mad, just watching. 👀`;
  return "Not a single sip? Pedro... we need to talk.";
}

function diaryEntry(label, e, isToday) {
  const met = e.target > 0 && e.ml >= e.target;
  const k = e.kisses || 0;
  const kissHTML = typeof e.kisses === "number"
    ? `<span class="diary-kisses"><span class="diary-lips">${LIPS_IMG}</span>${k} kiss${k === 1 ? "" : "es"}</span>`
    : "";
  return `<div class="diary-entry${met ? " met" : ""}">
    <div class="diary-head"><span class="diary-date">${label}</span>${kissHTML}</div>
    <div class="diary-water">${e.ml.toLocaleString()} / ${e.target.toLocaleString()} mL${met ? " · Goal met" : ""}</div>
    <p class="diary-note">“${diaryNote(e, isToday)}”</p>
  </div>`;
}

function renderDiary() {
  const todayKey = dateKey(new Date());
  let html = diaryEntry("Today", { ml: state.consumedMl, target: state.targetMl, kisses: state.kissesToday || 0 }, true);
  Object.keys(state.days).filter(function (k) { return k !== todayKey; }).sort().reverse().slice(0, 30).forEach(function (k) {
    const label = new Date(k + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    html += diaryEntry(label, state.days[k], false);
  });
  document.getElementById("diary-list").innerHTML = html;
}
