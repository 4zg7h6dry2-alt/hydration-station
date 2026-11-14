/* =====================================================
   Hydration Station add-on: History tab + Kelly's reminder
   Loaded from index.html with one line, just above </body>:
   <script src="history.js"></script>
   ===================================================== */
(function () {
  // ---------- styling (uses your theme colors) ----------
  var css = `
.hist-bars{display:flex;gap:6px;align-items:flex-end}
.hist-col{flex:1;display:flex;flex-direction:column;gap:4px}
.hist-wrap{height:110px;display:flex;align-items:flex-end;background:var(--track);border:1px solid var(--border-color)}
.hist-bar{width:100%;background:var(--primary-blue);min-height:2px}
.hist-bar.met{background:var(--accent-pink)}
.hist-day{font-size:.7rem;font-weight:700;color:var(--text-muted);text-align:center}
.hist-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.hist-stat{background:var(--surface);border:1px solid var(--border-color);padding:8px 4px;text-align:center}
.hist-stat b{display:block;font-family:'Fraunces',serif;font-size:1.05rem;color:var(--dark-blue)}
.hist-stat span{font-size:.7rem;color:var(--text-muted);font-weight:600}
.remind-box{background:var(--tint-1);border:1px solid var(--border-color);border-left:4px solid var(--accent-pink);padding:10px 14px;font-size:.88rem;color:var(--dark-blue);font-weight:600}
.remind-box[hidden]{display:none}
`;
  var styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---------- History page ----------
  var histBox = document.querySelector("#view-history .content-box");
  if (histBox) {
    histBox.innerHTML =
      "<h2>Hydration History</h2>" +
      '<p class="muted">Your last 7 days. Pink bars mean goal met.</p>' +
      '<div class="hist-bars" id="hist-bars"></div>' +
      '<div class="hist-stats" id="hist-stats"></div>' +
      '<p class="diary-note" id="hist-comment"></p>';
  }

  // ---------- Reminder box on Home (just above the daily note) ----------
  var noteBox = document.querySelector(".note-box");
  var remindEl = document.createElement("p");
  remindEl.className = "remind-box";
  remindEl.id = "remind-box";
  remindEl.hidden = true;
  if (noteBox && noteBox.parentNode) noteBox.parentNode.insertBefore(remindEl, noteBox);

  function renderHistory() {
    var barsEl = document.getElementById("hist-bars");
    if (!barsEl) return;
    var bars = "", total = 0, kisses = 0, best = 0, met = 0;
    for (var i = 6; i >= 0; i--) {
      var d = noonDaysAgo(i);
      var e = i === 0
        ? { ml: state.consumedMl, target: state.targetMl, kisses: state.kissesToday || 0 }
        : (state.days[dateKey(d)] || { ml: 0, target: state.targetMl, kisses: 0 });
      var t = e.target > 0 ? e.target : state.targetMl;
      var pct = Math.min(100, Math.round((e.ml / t) * 100));
      var isMet = e.ml >= t;
      total += e.ml;
      kisses += e.kisses || 0;
      best = Math.max(best, e.ml);
      if (isMet) met++;
      bars += '<div class="hist-col"><div class="hist-wrap"><div class="hist-bar' + (isMet ? " met" : "") +
        '" style="height:' + pct + '%"></div></div><div class="hist-day">' +
        d.toLocaleDateString("en-US", { weekday: "narrow" }) + "</div></div>";
    }
    barsEl.innerHTML = bars;
    document.getElementById("hist-stats").innerHTML =
      '<div class="hist-stat"><b>' + Math.round(total / 7).toLocaleString() + "</b><span>avg mL/day</span></div>" +
      '<div class="hist-stat"><b>' + best.toLocaleString() + "</b><span>best day (mL)</span></div>" +
      '<div class="hist-stat"><b>' + kisses + "</b><span>kisses earned</span></div>";

    var line;
    if (met === 7) line = "A perfect week?! Ausgezeichnet, Pedro! I’m so proud of you. ♡";
    else if (met >= 5) line = met + " out of 7 goals met. Sehr gut, Cheesecake!";
    else if (met >= 3) line = met + " out of 7. Not bad, Luv, but I know you can do better.";
    else if (met >= 1) line = "Only " + met + " day" + (met === 1 ? "" : "s") + " this week. I’m watching you, Pedro. 👀";
    else line = "Zero goals this week?! We need to talk, Pedro.";
    document.getElementById("hist-comment").textContent = "“" + line + "”";
  }

  function renderReminder() {
    var el = document.getElementById("remind-box");
    if (!el) return;
    var hr = new Date().getHours();
    var target = state.targetMl;
    var have = state.consumedMl;
    // Expected pace: 0% at 7am up to 100% at 9pm
    var expected = target * Math.min(1, Math.max(0, (hr - 7) / 14));
    if (have >= target || hr < 12 || have >= expected) {
      el.hidden = true;
      return;
    }
    var left = Math.max(0, target - have);
    el.textContent = "Pedro… it’s getting late and you still have " + left.toLocaleString() +
      " mL to go. Drink up, Cheesecake. 🩵";
    el.hidden = false;
  }

  // ---------- Hook into your existing app ----------
  var originalRenderUI = renderUI;
  renderUI = function (key) {
    originalRenderUI(key);
    renderHistory();
    renderReminder();
  };

  document.querySelectorAll(".nav-tab").forEach(function (tab) {
    tab.addEventListener("click", renderHistory);
  });
  setInterval(renderReminder, 60000);

  renderHistory();
  renderReminder();
})();
