(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const ACTIVITIES = window.ACTIVITIES;
  const FALLBACKS = window.FALLBACKS;
  const AFTER_HOME = window.AFTER_HOME;
  const COMMENTS = window.COMMENTS;

  const OFF_WORK = 18 * 60; // 정시 퇴근 18:00
  const ESCAPE = 18 * 60 + 10; // 회사 탈출 18:10
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const LABELS = {
    energy: { 1: "체력 10%", 2: "체력 40%", 3: "체력 70%", 4: "체력 100%" },
    budget: { 0: "0원", 1: "1만원", 2: "3만원", 3: "FLEX" },
    curfew: { 1200: "8시 귀가", 1320: "10시 귀가", 1440: "자정 귀가", free: "귀가 시간 자유" },
  };

  const state = { energy: null, budget: null, curfew: null, course: null, accepted: false };

  /* ───────── 유틸 ───────── */
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const step10 = (min, max) => min + 10 * rand(0, Math.floor((max - min) / 10));
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;

  function weightedPick(items, weightOf) {
    const total = items.reduce((s, it) => s + weightOf(it), 0);
    let r = Math.random() * total;
    for (const it of items) {
      r -= weightOf(it);
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ───────── 코스 생성 ───────── */
  function homeLimit({ energy, curfew }) {
    if (curfew !== "free") return Number(curfew);
    // 시간 상관없음이어도 체력에 따라 현실적인 선에서 끊는다
    return { 1: 21 * 60, 2: 22 * 60 + 30, 3: 24 * 60, 4: 26 * 60 }[energy];
  }

  function fill(text, minutes) {
    return text.replace("{m}", minutes).replace("{n}", rand(3, 6));
  }

  function buildCourse(s) {
    const energy = Number(s.energy);
    const budget = Number(s.budget);
    const limit = homeLimit(s);
    const travelHome = pick([20, 30, 30, 40]);
    const lastEnd = limit - travelHome; // 마지막 일정이 끝나야 하는 시각

    const pool = ACTIVITIES.filter(
      (a) => a.c <= budget && a.e <= energy && (a.p < 3 || lastEnd >= 23 * 60)
    );

    // 예산·체력에 딱 맞는 활동일수록 잘 뽑히게
    const weight = (a) => 1 + (a.c === budget ? 1.5 : 0) + (a.e === energy ? 1 : 0) + (a.p === 3 ? 0.5 : 0);

    const want = { 1: 1, 2: rand(1, 2), 3: rand(2, 3), 4: rand(3, 4) }[energy];
    const chosen = [];
    const used = new Set();

    // 체력이 조금이라도 있으면 저녁 한 끼는 넣어준다
    const meals = pool.filter((a) => a.g === "meal");
    if (energy >= 2 && want >= 2 && meals.length && Math.random() < 0.85) {
      const m = weightedPick(meals, weight);
      chosen.push(m);
      used.add(m.g);
    }

    let guard = 0;
    while (chosen.length < want && guard++ < 60) {
      const candidates = pool.filter((a) => !used.has(a.g));
      if (!candidates.length) break;
      const a = weightedPick(candidates, weight);
      chosen.push(a);
      used.add(a.g);
    }

    // 순서대로 정렬 (같은 단계 안에서는 랜덤)
    const ordered = shuffle(chosen).sort((a, b) => a.p - b.p);

    // 시간 배치
    const steps = [{ time: ESCAPE, text: "회사 탈출", kind: "start" }];
    let t = ESCAPE + pick([20, 20, 30]);

    for (const a of ordered) {
      let dur = step10(a.d[0], a.d[1]);
      if (t + dur > lastEnd) dur = a.d[0];
      if (t + dur > lastEnd) continue; // 시간이 안 되면 과감히 뺀다
      steps.push({ time: t, text: fill(a.t, dur), kind: "act" });
      t += dur + pick([10, 10, 20]);
    }

    // 하나도 못 넣었으면 짧은 비상용 일정
    if (steps.length === 1) {
      const fb = pick(FALLBACKS.filter((f) => f.c <= budget));
      const start = ESCAPE + 20;
      steps.push({ time: start, text: fb.t, kind: "act" });
      t = start + fb.d[0] + 10;
    }

    // 마지막 이동 시간 후 귀가 (이동 시간은 앞의 간격을 흡수)
    const home = Math.min(limit, t - 10 + travelHome);
    const afterPool = energy === 1 ? AFTER_HOME.low : AFTER_HOME.any.concat(budget === 0 ? AFTER_HOME.free : []);
    steps.push({ time: home, text: "집으로 귀환", kind: "home", note: pick(afterPool) });

    return { steps, comment: pickComment(s), signature: steps.map((x) => x.text).join("|") };
  }

  function pickComment({ energy, budget, curfew }) {
    const specific = [];
    if (energy == 1) specific.push(...COMMENTS.energy1);
    if (energy == 4) specific.push(...COMMENTS.energy4);
    if (budget == 0) specific.push(...COMMENTS.budget0);
    if (budget == 3) specific.push(...COMMENTS.budget3);
    if (curfew == "1200") specific.push(...COMMENTS.early);
    if (curfew == "free") specific.push(...COMMENTS.free);
    if (specific.length && Math.random() < 0.6) return pick(specific);
    return pick(COMMENTS.any);
  }

  /* ───────── 선택 화면 ───────── */
  const form = $("#form");
  const btnDecide = $("#btn-decide");
  const dock = $("#dock");
  const progress = $("#progress");

  function readForm() {
    const fd = new FormData(form);
    state.energy = fd.get("energy");
    state.budget = fd.get("budget");
    state.curfew = fd.get("curfew");
  }

  function updateSelectUI() {
    readForm();
    const done = ["energy", "budget", "curfew"].filter((k) => state[k] !== null).length;
    const ready = done === 3;
    progress.textContent = ready ? "준비됐습니다" : `세 가지를 골라주세요 · ${done} / 3`;
    btnDecide.disabled = !ready;
    dock.classList.toggle("is-ready", ready);
    $$(".group").forEach((g) => g.classList.toggle("is-done", state[g.dataset.group] !== null));
  }

  form.addEventListener("change", (e) => {
    updateSelectUI();
    // 선택하면 다음 질문으로 부드럽게 이동
    const group = e.target.closest(".group");
    const next = group && group.nextElementSibling;
    if (next && !$("input:checked", next)) {
      setTimeout(() => next.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "center" }), 180);
    }
  });

  btnDecide.addEventListener("click", () => {
    if (btnDecide.disabled) return;
    showResult(true);
  });

  /* ───────── 결과 화면 ───────── */
  const viewSelect = $("#view-select");
  const viewResult = $("#view-result");
  const timeline = $("#timeline");
  const commentEl = $("#comment");
  const rx = $("#rx");

  function switchView(to) {
    const from = to === viewResult ? viewSelect : viewResult;
    from.classList.remove("is-active");
    from.hidden = true;
    to.hidden = false;
    // 다음 프레임에 클래스를 붙여 전환 애니메이션을 준다
    requestAnimationFrame(() => requestAnimationFrame(() => to.classList.add("is-active")));
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function renderMeta() {
    const now = new Date();
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    $("#rx-date").textContent = `${now.getFullYear()}. ${pad(now.getMonth() + 1)}. ${pad(now.getDate())} (${days[now.getDay()]})`;
    $("#rx-no").textContent = `No. ${pad(now.getMonth() + 1)}${pad(now.getDate())}-${String(rand(0, 9999)).padStart(4, "0")}`;
    $("#rx-tags").innerHTML = ["energy", "budget", "curfew"]
      .map((k) => `<li>${LABELS[k][state[k]]}</li>`)
      .join("");
  }

  function renderCourse(course) {
    timeline.innerHTML = "";
    commentEl.classList.remove("is-in");
    $("#actions").classList.remove("is-in");

    course.steps.forEach((s, i) => {
      const li = document.createElement("li");
      li.className = `tl-item tl-item--${s.kind}`;
      li.style.setProperty("--i", i);
      li.innerHTML = `
        <time class="tl-time">${fmt(s.time)}</time>
        <span class="tl-dot" aria-hidden="true"></span>
        <div class="tl-body">
          <p class="tl-text"></p>
          ${s.note ? `<p class="tl-note"><span>귀환 후</span></p>` : ""}
        </div>`;
      $(".tl-text", li).textContent = s.text;
      if (s.note) $(".tl-note", li).append(document.createTextNode(s.note));
      timeline.append(li);
    });

    commentEl.textContent = `“${course.comment}”`;

    const n = course.steps.length;
    const stagger = REDUCED ? 0 : 260;
    const base = REDUCED ? 0 : 220;
    $$(".tl-item", timeline).forEach((li, i) => {
      setTimeout(() => li.classList.add("is-in"), base + i * stagger);
    });
    setTimeout(() => commentEl.classList.add("is-in"), base + n * stagger + 120);
    setTimeout(() => $("#actions").classList.add("is-in"), base + n * stagger + 320);
  }

  function roll() {
    let course;
    let tries = 0;
    do {
      course = buildCourse(state);
    } while (state.course && course.signature === state.course.signature && ++tries < 8);
    state.course = course;
    return course;
  }

  function showResult(fresh) {
    state.accepted = false;
    rx.classList.remove("is-accepted");
    $("#actions").hidden = false;
    $("#actions-accepted").hidden = true;
    renderMeta();
    const course = roll();
    if (fresh) switchView(viewResult);
    renderCourse(course);
  }

  $("#btn-reroll").addEventListener("click", () => {
    rx.classList.remove("is-shuffle");
    void rx.offsetWidth;
    rx.classList.add("is-shuffle");
    showResult(false);
  });

  $("#btn-accept").addEventListener("click", () => {
    state.accepted = true;
    const now = new Date();
    $("#stamp-time").textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    rx.classList.add("is-accepted");
    $("#actions").hidden = true;
    const box = $("#actions-accepted");
    box.hidden = false;
    $("#accepted-note").textContent = `좋습니다. ${fmt(ESCAPE)}, 탈출을 시작하세요.`;
    requestAnimationFrame(() => box.classList.add("is-in"));
    box.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "end" });
  });

  $("#btn-copy").addEventListener("click", async () => {
    const c = state.course;
    const lines = [
      "오늘의 퇴근 처방전",
      ["energy", "budget", "curfew"].map((k) => LABELS[k][state[k]]).join(" · "),
      "",
      ...c.steps.map((s) => `${fmt(s.time)}  ${s.text}${s.note ? ` (귀환 후: ${s.note})` : ""}`),
      "",
      `“${c.comment}”`,
      "— 퇴근하고 뭐하지?",
    ];
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast("처방전을 복사했습니다");
    } catch {
      // 클립보드 권한이 없을 때 대비
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.append(ta);
      ta.select();
      const ok = document.execCommand && document.execCommand("copy");
      ta.remove();
      toast(ok ? "처방전을 복사했습니다" : "복사하지 못했습니다");
    }
  });

  $$("[data-action='home']").forEach((el) =>
    el.addEventListener("click", () => {
      if (viewResult.hidden) return window.scrollTo({ top: 0, behavior: "smooth" });
      $("#actions-accepted").classList.remove("is-in");
      switchView(viewSelect);
    })
  );

  /* ───────── 토스트 ───────── */
  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("is-in");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-in"), 1800);
  }

  /* ───────── 시계 ───────── */
  function tick() {
    const now = new Date();
    const m = now.getHours() * 60 + now.getMinutes();
    $("#clock").textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const cd = $("#countdown");
    const diff = OFF_WORK - m;
    if (diff > 0 && diff <= 180) cd.textContent = `퇴근까지 ${[diff >= 60 ? `${Math.floor(diff / 60)}시간` : "", diff % 60 ? `${diff % 60}분` : ""].join(" ").trim()}`;
    else if (diff <= 0 && diff > -120) cd.textContent = "퇴근 시간이 지났습니다. 얼른 나가세요";
    else cd.textContent = "오늘도 수고하셨습니다";
  }
  tick();
  setInterval(tick, 15000);

  updateSelectUI();

  // 테스트·디버깅용
  window.__afterWork = { buildCourse, fmt };
})();
