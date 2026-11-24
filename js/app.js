import {
  STYLES, OCCASIONS, RELATIONS, LENGTHS, styleByKey, occasionByKey,
  generateLyrics, startSong, pollSong, STATUS_TEXT, testMusicKey, testClaudeKey, runAceStep, PROVIDERS,
  startAce, pollAce, aceStatus, aceBase,
} from "./engine.js";
import { synthSong } from "./synth.js";
import {
  getSettings, saveSettings, getDraft, saveDraft, uid, listSongs, getSong, putSong, deleteSong,
  putBlob, getBlob, exportAll, importAll,
} from "./store.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const view = $("#view");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const isDesktop = () => !!(window.pywebview && window.pywebview.api);

function toast(msg, err = false) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "show" + (err ? " err" : "");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.className = ""), err ? 5000 : 2600);
}
const fmtTime = (s) => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const fmtDate = (t) => new Date(t).toLocaleString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

// ───────────────── 路由 ─────────────────
let cleanup = null;
async function route() {
  if (cleanup) { cleanup(); cleanup = null; }
  stopAudio();
  const h = location.hash.replace(/^#/, "") || "/";
  const [, page, arg] = h.split("/");
  $$(".topbar nav a[data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === page));
  window.scrollTo(0, 0);
  if (!page) return renderHome();
  if (page === "create") return renderCreate(arg);
  if (page === "song" && arg) return renderSong(arg);
  if (page === "songs") return renderSongs();
  if (page === "settings") return renderSettings();
  location.hash = "#/";
}
window.addEventListener("hashchange", route);

// ───────────────── 首頁 ─────────────────
function renderHome() {
  document.title = "為你而唱 · 把你們的故事寫成一首歌";
  view.innerHTML = `
  <section class="hero">
    <div>
      <h1>把你們的故事<br><span class="grad-text">寫成一首專屬的歌</span></h1>
      <p class="lead">回答幾個簡單的問題，AI 作詞人把你們的回憶寫進歌詞，再由 AI 作曲、編曲、演唱，做出一首只屬於他／她的歌。</p>
      <div class="row" style="margin-top:22px">
        <a class="btn" href="#/create">🎵 立即製作我的歌</a>
        <a class="btn btn-ghost" href="#how">看看怎麼做</a>
      </div>
      <div class="badges"><span>🆓 有免費模式</span><span>⏱ 約 5 分鐘填寫</span><span>🎙 每次產生 2 個版本</span><span>🔁 不滿意可修改重做</span></div>
    </div>
    <div class="vinyl" aria-hidden="true">
      <div class="disc"></div>
      <div class="label">給最重要的人</div>
      <span class="note" style="left:-4%;top:12%">🎵</span>
      <span class="note" style="right:-2%;top:58%;animation-delay:1.2s">🎶</span>
      <span class="note" style="left:12%;bottom:-2%;animation-delay:2.1s">♪</span>
    </div>
  </section>

  <section class="block" id="how">
    <header><h2>簡單 4 步驟</h2><p class="muted">從你的故事到一首完整的歌</p></header>
    <div class="grid g4">
      ${[
        ["分享你的故事", "回答幾個問題：對方是誰、你們的關係，以及想紀念的回憶。不需要任何寫作技巧。"],
        ["AI 為你寫詞", "依照你的故事寫出原創歌詞，名字、回憶和想說的話都會放進歌裡，你也能自己修改。"],
        ["AI 作曲演唱", "依你選擇的曲風和人聲作曲、編曲、演唱，每次產生兩個版本讓你挑。"],
        ["送上這份感動", "下載 MP3 和精美歌詞卡，在生日、紀念日或晚餐時播放，給對方一個驚喜。"],
      ].map(([t, d], i) => `<div class="card"><div class="step-n">${i + 1}</div><h3>${t}</h3><p class="muted small">${d}</p></div>`).join("")}
    </div>
  </section>

  <section class="block">
    <header><h2>每個時刻，都值得一首歌</h2><p class="muted">選一個場合開始</p></header>
    <div class="chips">${OCCASIONS.map((o) => `<a class="chip" href="#/create/${o.key}">${o.emoji} ${o.name}</a>`).join("")}</div>
  </section>

  <section class="block">
    <header><h2>12 種曲風任你挑</h2><p class="muted">從深情抒情到輕快童謠</p></header>
    <div class="grid g4">${STYLES.map((s) => `<div class="card" style="padding:16px;text-align:center"><div style="font-size:30px">${s.emoji}</div><b>${s.name}</b></div>`).join("")}</div>
  </section>

  <section class="block" style="max-width:760px;margin:auto">
    <header><h2>常見問題</h2></header>
    ${[
      ["歌詞需要我自己寫嗎？", "不用。你只要回答問題，AI 會幫你寫好完整歌詞；寫好後你可以逐字修改，或告訴 AI 哪裡要改讓它重寫。"],
      ["需要付費嗎？", "不用。預設使用免費的開源 AI 模型（Hugging Face 上的 ACE-Step）產生有歌聲的歌，每天有免費額度；也可以選「本機合成」做不限次數的純音樂。想要更好的音質，可以在設定改用付費的 sunoapi.org。"],
      ["歌曲是怎麼做出來的？", "歌詞由 Claude 撰寫（未設定金鑰時使用內建範本），歌曲由你在「設定」選擇的方式產生，包含旋律、編曲與 AI 歌聲。"],
      ["需要多久？", "填寫約 5 分鐘；送出後 AI 音樂服務通常 1–5 分鐘內完成，期間可以離開頁面，完成後回到「我的歌曲」就能聽。"],
      ["不滿意可以修改嗎？", "可以。在歌曲頁按「修改重做」，調整歌詞或曲風就能產生新版本，舊版本也會保留。每次產生會使用 AI 音樂服務的點數。"],
      ["歌曲會存在哪裡？", "歌曲資料存在你自己的瀏覽器（電腦版存在本機）。AI 音樂服務的檔案連結大約保留 14 天，建議完成後下載 MP3 保存。"],
    ].map(([q, a]) => `<details class="faq"><summary>${q}</summary><p>${a}</p></details>`).join("")}
  </section>

  <section class="cta-band">
    <h2>一份讓人想反覆聆聽的禮物</h2>
    <p class="muted">花幾分鐘說出你們的故事，我們把它寫成一首歌。</p>
    <a class="btn" href="#/create">開始製作我的歌</a>
  </section>`;
}

// ───────────────── 製作問卷 ─────────────────
const STEPS = ["對象", "風格", "故事", "歌詞", "製作"];
const MOODS = ["溫暖感動", "甜蜜浪漫", "輕快歡樂", "深情催淚", "勵志熱血", "懷念溫柔"];

function newDraft(occasion) {
  return {
    step: 0, recipient: "", relation: occasion === "mother" ? "媽媽" : occasion === "father" ? "爸爸" : "", sender: "", occasion: occasion || "birthday",
    style: "ballad", vocal: "f", mood: "溫暖感動", length: 180,
    q_person: "", q_memory: "", q_detail: "", q_message: "", q_words: "",
    title: "", lyrics: "", styleTags: "", lyricsSource: "",
  };
}

function renderCreate(occArg) {
  document.title = "製作我的歌 · 為你而唱";
  let d = getDraft();
  if (!d || (occArg && d.step === 0 && !d.recipient)) d = newDraft(occArg);
  else if (occArg && OCCASIONS.some((o) => o.key === occArg) && d.step === 0) d.occasion = occArg;
  const save = () => saveDraft(d);

  const draw = () => {
    save();
    const st = d.step;
    view.innerHTML = `
    <div class="wizard">
      <div class="progress">${STEPS.map((s, i) => `<span class="${i <= st ? "on" : ""}" title="${s}"></span>`).join("")}</div>
      <p class="tiny">步驟 ${st + 1} / ${STEPS.length}：${STEPS[st]}</p>
      <div class="card" id="wcard">${[stepWho, stepStyle, stepStory, stepLyrics, stepMake][st](d)}</div>
      <div class="wiz-nav">
        ${st > 0 ? `<button class="btn btn-ghost" id="back">← 上一步</button>` : `<button class="btn btn-ghost" id="reset">清空重填</button>`}
        ${st < 3 ? `<button class="btn" id="next">下一步 →</button>` : ""}
        ${st === 3 ? `<button class="btn" id="next" ${d.lyrics ? "" : "disabled"}>確認歌詞，開始製作 →</button>` : ""}
      </div>
      <p class="err" id="werr"></p>
    </div>`;
    bindStep();
  };

  const bindStep = () => {
    const card = $("#wcard");
    // 文字欄位雙向綁定
    $$("[data-f]", card).forEach((el) => {
      el.addEventListener("input", () => { d[el.dataset.f] = el.value; save(); if (el.dataset.f === "lyrics") updNext(); });
    });
    $$("[data-pick]", card).forEach((grp) => {
      grp.addEventListener("click", (e) => {
        const b = e.target.closest("button[data-v]");
        if (!b) return;
        let v = b.dataset.v;
        if (grp.dataset.pick === "length") v = Number(v);
        d[grp.dataset.pick] = v; save();
        $$("button", grp).forEach((x) => x.classList.toggle("on", x === b));
        if (grp.dataset.pick === "occasion" && !d.relation && (v === "mother" || v === "father")) {
          d.relation = v === "mother" ? "媽媽" : "爸爸"; save();
          $$("[data-pick=relation] button").forEach((x) => x.classList.toggle("on", x.dataset.v === d.relation));
        }
        if (grp.dataset.pick === "relation") { const c = $("#relCustom"); if (c) c.value = ""; }
      });
    });
    const rc = $("#relCustom");
    if (rc) rc.addEventListener("input", () => { if (rc.value.trim()) { d.relation = rc.value.trim(); $$("[data-pick=relation] button").forEach((x) => x.classList.remove("on")); save(); } });
    const gen = $("#genLyrics");
    if (gen) gen.addEventListener("click", doGen);
    const regen = $("#regenLyrics");
    if (regen) regen.addEventListener("click", () => doGen(true));
    const back = $("#back");
    if (back) back.onclick = () => { d.step--; draw(); };
    const reset = $("#reset");
    if (reset) reset.onclick = () => { if (confirm("確定要清空目前填寫的內容？")) { d = newDraft(); draw(); } };
    const next = $("#next");
    if (next) next.onclick = onNext;
    if (d.step === 4) makeIt();
  };
  const updNext = () => { const n = $("#next"); if (n && d.step === 3) n.disabled = !d.lyrics.trim(); };
  const err = (m) => { $("#werr").textContent = m || ""; };

  const onNext = () => {
    err("");
    if (d.step === 0 && !d.recipient.trim()) return err("請填寫收禮對象的名字或稱呼。");
    if (d.step === 2 && !(d.q_person + d.q_memory + d.q_message).trim()) return err("至少填寫一題故事，歌詞才會有你們的味道。");
    if (d.step === 3) {
      if (!d.title.trim()) d.title = `給${d.recipient}的歌`;
      if (!d.lyrics.trim()) return err("請先產生或填寫歌詞。");
    }
    d.step++;
    draw();
    if (d.step === 3 && !d.lyrics) doGen();
  };

  async function doGen(isRegen) {
    const btns = $$("#genLyrics,#regenLyrics,#next");
    btns.forEach((b) => (b.disabled = true));
    const box = $("#lyricsBox");
    let extra = "";
    if (isRegen) {
      extra = ($("#revNote") && $("#revNote").value.trim()) || "";
    }
    if (box) box.innerHTML = `<div class="making"><div class="eq"><i></i><i></i><i></i><i></i><i></i></div><p>${getSettings().claudeKey ? "AI 作詞人正在為你寫歌詞…（約 20–60 秒）" : "正在用內建範本產生歌詞…"}</p></div>`;
    try {
      const order = { ...d, revision: isRegen ? extra || "換一種寫法，讓歌詞更動人" : "" };
      const r = await generateLyrics(order);
      d.title = r.title; d.lyrics = r.lyrics; d.styleTags = r.style; d.lyricsSource = r.source;
      save();
      if (d.step === 3) draw();
      if (r.source === "template") toast("已用內建範本產生歌詞，建議再自行潤飾（設定 Claude 金鑰可得到 AI 量身寫詞）");
    } catch (e) {
      console.error(e);
      if (d.step === 3) { draw(); err("歌詞產生失敗：" + (e.message || e)); }
    }
  }

  let making = false;
  async function makeIt() {
    if (making) return;
    making = true;
    const status = $("#makeStatus");
    try {
      const id = uid();
      const song = {
        id, createdAt: Date.now(),
        order: {
          recipient: d.recipient, relation: d.relation, sender: d.sender, occasion: d.occasion, style: d.style,
          vocal: d.vocal, mood: d.mood, length: d.length,
          q_person: d.q_person, q_memory: d.q_memory, q_detail: d.q_detail, q_message: d.q_message, q_words: d.q_words,
        },
        versions: [], current: 0,
      };
      const v = { n: 1, title: d.title, lyrics: d.lyrics, styleTags: d.styleTags, vocal: d.vocal, length: d.length, status: "SUBMITTING", tracks: [], createdAt: Date.now() };
      song.versions.push(v);
      status.textContent = "正在送出給 AI 音樂服務…";
      await submitVersion(v);
      await putSong(song);
      saveDraft(null);
      launchVersion(song, v);
      location.hash = "#/song/" + id;
    } catch (e) {
      console.error(e);
      status.innerHTML = `<span class="err">${esc(e.message || e)}</span>`;
      $("#retry").classList.remove("hidden");
      $("#retry").onclick = () => { making = false; $("#retry").classList.add("hidden"); makeIt(); };
    } finally {
      making = false;
    }
  }

  draw();
}

function stepWho(d) {
  const rels = RELATIONS.includes(d.relation) ? d.relation : "";
  return `
    <h2>這首歌要送給誰？</h2>
    <div class="q"><label for="f-rec">對方的名字或稱呼 *</label>
      <p class="hint">歌詞裡會這樣稱呼他／她，例如「立婷」「寶貝」「媽咪」</p>
      <input id="f-rec" type="text" maxlength="20" data-f="recipient" value="${esc(d.recipient)}" placeholder="例如：立婷"></div>
    <div class="q"><span class="lbl">你們的關係</span>
      <div class="pick" data-pick="relation" style="grid-template-columns:repeat(auto-fill,minmax(88px,1fr))">
        ${RELATIONS.map((r) => `<button type="button" data-v="${r}" class="${rels === r ? "on" : ""}">${r}</button>`).join("")}
      </div>
      <input id="relCustom" type="text" maxlength="12" style="margin-top:8px" placeholder="其他關係（自行輸入）" value="${rels ? "" : esc(d.relation)}"></div>
    <div class="q"><span class="lbl">場合</span>
      <div class="pick" data-pick="occasion">
        ${OCCASIONS.map((o) => `<button type="button" data-v="${o.key}" class="${d.occasion === o.key ? "on" : ""}"><span class="e">${o.emoji}</span>${o.name}</button>`).join("")}
      </div></div>
    <div class="q"><label for="f-sender">你的署名（選填）</label>
      <input id="f-sender" type="text" maxlength="20" data-f="sender" value="${esc(d.sender)}" placeholder="例如：永遠愛你的阿哲"></div>`;
}

function stepStyle(d) {
  return `
    <h2>想要什麼樣的音樂？</h2>
    <div class="q"><span class="lbl">曲風</span>
      <div class="pick" data-pick="style">
        ${STYLES.map((s) => `<button type="button" data-v="${s.key}" class="${d.style === s.key ? "on" : ""}"><span class="e">${s.emoji}</span>${s.name}</button>`).join("")}
      </div></div>
    <div class="q"><span class="lbl">演唱人聲</span>
      <div class="seg" data-pick="vocal">
        ${[["f", "👩 女聲"], ["m", "👨 男聲"], ["any", "🎲 讓 AI 決定"]].map(([k, n]) => `<button type="button" data-v="${k}" class="${d.vocal === k ? "on" : ""}">${n}</button>`).join("")}
      </div></div>
    <div class="q"><span class="lbl">整體情緒</span>
      <div class="seg" data-pick="mood">${MOODS.map((m) => `<button type="button" data-v="${m}" class="${d.mood === m ? "on" : ""}">${m}</button>`).join("")}</div></div>
    <div class="q"><span class="lbl">歌曲長度</span>
      <div class="seg" data-pick="length">${LENGTHS.map((l) => `<button type="button" data-v="${l.key}" class="${Number(d.length) === l.key ? "on" : ""}">${l.name}</button>`).join("")}</div></div>`;
}

function stepStory(d) {
  const n = esc(d.recipient || "他／她");
  const q = (f, label, hint, ph) => `<div class="q"><label for="f-${f}">${label}</label><p class="hint">${hint}</p><textarea id="f-${f}" data-f="${f}" maxlength="600" placeholder="${ph}">${esc(d[f])}</textarea></div>`;
  return `
    <h2>說說你們的故事</h2>
    <p class="muted small">寫得越具體，歌詞越動人。用聊天的口吻就好，不用修飾。</p>
    ${q("q_person", `${n}是個什麼樣的人？`, "個性、外表、讓你欣賞的地方", "例如：她笑起來眼睛會瞇成一條線，很愛照顧別人，但常常忘記照顧自己")}
    ${q("q_memory", "你們最難忘的回憶是什麼？", "第一次見面、一起旅行、度過的難關……", "例如：2019 年在淡水看夕陽，她說想一輩子都這樣；去年我生病時她每天熬粥給我")}
    ${q("q_detail", "有什麼只有你們懂的小事？", "口頭禪、綽號、小習慣、共同的喜好", "例如：她都叫我「大熊」，我們每週五一定吃火鍋")}
    ${q("q_message", `最想對${n}說的一句話？`, "平常說不出口的心裡話", "例如：謝謝你陪我走過最難的日子，未來換我照顧你")}
    ${q("q_words", "一定要放進歌裡的字詞（選填）", "例如紀念日、地名、寵物名字", "例如：淡水、大熊、火鍋、11 月 8 日")}`;
}

function stepLyrics(d) {
  const hasClaude = !!getSettings().claudeKey;
  if (!d.lyrics) {
    return `<h2>產生歌詞</h2><div id="lyricsBox">
      <p class="muted">${hasClaude ? "AI 作詞人會依照你的故事寫出原創歌詞。" : "目前沒有設定 Claude 金鑰，會用內建範本產生歌詞，之後可自行修改。"}</p>
      <button class="btn" id="genLyrics">✍️ 產生歌詞</button></div>`;
  }
  return `
    <h2>確認你的歌詞</h2>
    <p class="muted small">可以直接修改任何一句。方括號內的段落標籤（如 [Chorus]）請保留，AI 會依此安排主歌與副歌。</p>
    <div id="lyricsBox">
    <div class="q"><label for="f-title">歌名</label><input id="f-title" type="text" maxlength="80" data-f="title" value="${esc(d.title)}"></div>
    <div class="q"><label for="f-lyrics">歌詞</label><textarea id="f-lyrics" class="lyrics-edit" data-f="lyrics" maxlength="5000">${esc(d.lyrics)}</textarea></div>
    <details class="faq"><summary>進階：音樂風格描述（英文）</summary>
      <p>給 AI 音樂模型的風格指示，可加入樂器、速度等。不要寫真實歌手名字。</p>
      <textarea data-f="styleTags" maxlength="1000" style="min-height:70px;margin-bottom:14px">${esc(d.styleTags)}</textarea></details>
    <div class="q" style="margin-top:14px"><label for="revNote">想讓 AI 怎麼改？（選填）</label>
      <input id="revNote" type="text" maxlength="200" placeholder="例如：副歌更甜一點、多提到淡水的夕陽"></div>
    <button class="btn btn-ghost btn-sm" id="regenLyrics">🔄 ${hasClaude ? "請 AI 重寫歌詞" : "重新產生範本"}</button>
    </div>`;
}

function stepMake() {
  return `<div class="making"><h2>正在送出你的歌</h2><div class="eq"><i></i><i></i><i></i><i></i><i></i></div>
    <p id="makeStatus" class="muted">準備中…</p>
    <div class="row" style="justify-content:center"><button class="btn hidden" id="retry">重試</button><a class="btn btn-ghost btn-sm" href="#/settings">前往設定</a></div></div>`;
}

// ───────────────── 產生方式分派 ─────────────────
// 付費 (suno) 送出後拿 taskId 背景輪詢；免費 (hf / local) 在這個頁面裡直接執行
async function submitVersion(v) {
  const s = getSettings();
  v.provider = s.provider || "hf";
  v.vocalGender = v.vocal;
  if (v.provider === "suno") {
    if (!s.musicKey) throw new Error("你選的是付費的 sunoapi.org，但還沒填 API 金鑰。請到「設定」填寫，或改選免費的產生方式。");
    v.taskId = await startSong(v);
    v.status = "PENDING";
  } else if (v.provider === "ace") {
    v.taskId = await startAce(v);
    v.status = "PENDING";
    v.progress = "本機 AI 排程中…";
  } else {
    v.status = "PENDING";
    v.progress = "準備中…";
  }
}
function launchVersion(song, v) {
  if (v.provider === "suno" || v.provider === "ace") kickPoller();
  else runFreeJob(song.id, v.n);
}

const activeJobs = new Set();
async function runFreeJob(songId, n) {
  const key = songId + "#" + n;
  if (activeJobs.has(key)) return;
  activeJobs.add(key);
  let lastProg = "";
  const update = async (patch) => {
    const s = await getSong(songId);
    if (!s) return null;
    const vv = s.versions.find((x) => x.n === n);
    if (!vv) return null;
    Object.assign(vv, patch);
    await putSong(s);
    return { s, vv };
  };
  try {
    const s0 = await getSong(songId);
    const v = s0.versions.find((x) => x.n === n);
    let outs;
    if (v.provider === "hf") {
      outs = await runAceStep(v, (txt) => { if (txt !== lastProg) { lastProg = txt; update({ progress: txt }); } });
    } else {
      await update({ progress: "正在合成版本 A…（每個版本約 20–60 秒）", status: "TEXT_SUCCESS" });
      outs = [];
      for (const variant of [0, 1]) {
        const r = await synthSong({ style: s0.order.style, lyrics: v.lyrics, seconds: Number(v.length) || 120, variant, title: v.title });
        outs.push({ blob: r.blob, duration: r.duration });
        if (variant === 0) await update({ progress: "版本 A 完成，正在合成版本 B…", status: "FIRST_SUCCESS" });
      }
    }
    const tracks = [];
    for (let i = 0; i < outs.length; i++) {
      const o = outs[i];
      const tid = `${v.provider}-${n}-${i}`;
      const blobKey = `${songId}:${tid}`;
      await putBlob(blobKey, o.blob);
      let duration = o.duration || 0;
      if (!duration) duration = await blobDuration(o.blob);
      tracks.push({ id: tid, title: v.title, audioUrl: "", tempUrl: o.url || "", streamUrl: "", imageUrl: "", duration, blobKey,
        ext: /wav/.test(o.blob.type) ? "wav" : "mp3" });
    }
    const res = await update({ tracks, status: "SUCCESS", progress: "" });
    if (res) notifyDone(res.s);
  } catch (e) {
    console.error(e);
    await update({ status: "FAILED", error: e.message || String(e), progress: "" });
  } finally {
    activeJobs.delete(key);
  }
}
function blobDuration(blob) {
  return new Promise((res) => {
    const a = new Audio();
    const u = URL.createObjectURL(blob);
    a.preload = "metadata";
    a.onloadedmetadata = () => { res(isFinite(a.duration) ? a.duration : 0); URL.revokeObjectURL(u); };
    a.onerror = () => { res(0); URL.revokeObjectURL(u); };
    a.src = u;
  });
}
// 重新整理或關閉頁面會中斷免費模式的製作：開啟時把這些標成失敗，讓使用者重試
async function recoverInterrupted() {
  for (const song of await listSongs()) {
    let ch = false;
    for (const v of song.versions) {
      if (v.provider && v.provider !== "suno" && v.provider !== "ace" && RUNNING.has(v.status) && !activeJobs.has(song.id + "#" + v.n)) {
        v.status = "FAILED"; v.error = "製作中斷（頁面被關閉或重新整理），請按「用同樣歌詞重試」。"; v.progress = ""; ch = true;
      }
    }
    if (ch) await putSong(song);
  }
}

// ───────────────── 背景輪詢 ─────────────────
let pollTimer = null;
let polling = false;
const RUNNING = new Set(["SUBMITTING", "PENDING", "TEXT_SUCCESS", "FIRST_SUCCESS"]);

function kickPoller() {
  clearTimeout(pollTimer);
  pollTimer = setTimeout(pollAll, 1500);
}
async function pollAll() {
  if (polling) return;
  polling = true;
  let any = false;
  try {
    const songs = await listSongs();
    for (const song of songs) {
      for (const v of song.versions) {
        if (!RUNNING.has(v.status) || !v.taskId) continue;
        any = true;
        if (v.provider === "ace") { await pollAceVersion(song, v); continue; }
        try {
          const r = await pollSong(v.taskId);
          let changed = r.status !== v.status;
          if (r.tracks.length) {
            const old = JSON.stringify(v.tracks.map((t) => [t.id, t.audioUrl, t.streamUrl]));
            v.tracks = r.tracks.map((t) => ({ ...(v.tracks.find((o) => o.id === t.id) || {}), ...t }));
            if (old !== JSON.stringify(v.tracks.map((t) => [t.id, t.audioUrl, t.streamUrl]))) changed = true;
          }
          v.status = r.failed ? "FAILED" : r.status;
          if (r.failed) v.error = r.failed;
          v.pollErrors = 0;
          if (changed || r.failed) await putSong(song);
          if (r.done) { cacheAudio(song, v); notifyDone(song); }
        } catch (e) {
          v.pollErrors = (v.pollErrors || 0) + 1;
          if (e.code === 401 || v.pollErrors > 30) { v.status = "FAILED"; v.error = e.message; await putSong(song); }
        }
      }
    }
  } catch (e) { console.error(e); }
  polling = false;
  if (any) pollTimer = setTimeout(pollAll, 8000);
}

async function pollAceVersion(song, v) {
  try {
    const r = await pollAce(v.taskId);
    v.pollErrors = 0;
    if (r.failed) { v.status = "FAILED"; v.error = r.failed; v.progress = ""; await putSong(song); return; }
    if (!r.done) {
      const el = Math.round((Date.now() - v.createdAt) / 1000);
      if (el > 45 * 60) { v.status = "FAILED"; v.error = "本機 AI 超過 45 分鐘沒有完成（可能電腦版被關閉過），請按重試。"; v.progress = ""; await putSong(song); return; }
      const txt = r.progress || `本機 AI 作曲演唱中…（已經過 ${Math.floor(el / 60)} 分 ${el % 60} 秒）`;
      if (txt !== v.progress) { v.progress = txt; await putSong(song); }
      return;
    }
    // 完成：把音檔存進本機，播放和下載都不再依賴本機 AI 伺服器
    const tracks = [];
    for (const t of r.tracks) {
      const res = await fetch(t.audioUrl);
      if (!res.ok) throw new Error("下載音檔失敗（" + res.status + "）");
      const blob = await res.blob();
      const blobKey = `${song.id}:${t.id}`;
      await putBlob(blobKey, blob);
      tracks.push({ ...t, title: v.title, audioUrl: "", streamUrl: "", imageUrl: "", blobKey, ext: "mp3",
        duration: t.duration || (await blobDuration(blob)) });
    }
    v.tracks = tracks; v.status = "SUCCESS"; v.progress = "";
    await putSong(song);
    notifyDone(song);
  } catch (e) {
    v.pollErrors = (v.pollErrors || 0) + 1;
    v.progress = "暫時連不到本機 AI，持續重試中…（" + e.message + "）";
    if (v.pollErrors > 60) { v.status = "FAILED"; v.error = e.message; v.progress = ""; }
    await putSong(song);
  }
}

async function cacheAudio(song, v) {
  if (!getSettings().saveAudio) return;
  for (const t of v.tracks) {
    if (t.blobKey || !t.audioUrl) continue;
    try {
      const r = await fetch(t.audioUrl);
      if (!r.ok) continue;
      const blob = await r.blob();
      const key = `${song.id}:${t.id}`;
      await putBlob(key, blob);
      t.blobKey = key;
    } catch { /* 跨網域不允許時保留網址即可 */ }
  }
  const fresh = await getSong(song.id);
  if (fresh) {
    const fv = fresh.versions.find((x) => x.taskId === v.taskId);
    if (fv) fv.tracks.forEach((t) => { const m = v.tracks.find((x) => x.id === t.id); if (m && m.blobKey) t.blobKey = m.blobKey; });
    await putSong(fresh);
  }
}

function notifyDone(song) {
  const h = location.hash;
  if (h !== "#/song/" + song.id) toast(`🎉「${song.versions[song.current]?.title || "你的歌"}」完成了！到「我的歌曲」聆聽`);
}

// ───────────────── 音訊播放 ─────────────────
const audio = new Audio();
audio.preload = "metadata";
let playingKey = null;
const objUrls = new Map();
function stopAudio() { audio.pause(); playingKey = null; }
["timeupdate", "play", "pause", "ended", "loadedmetadata"].forEach((ev) =>
  audio.addEventListener(ev, () => $$(".track").forEach((el) => el._sync && el._sync())));
audio.addEventListener("error", () => { if (playingKey) toast("音檔載入失敗，連結可能已過期", true); });

async function trackSrc(t) {
  if (t.blobKey) {
    if (objUrls.has(t.blobKey)) return objUrls.get(t.blobKey);
    const b = await getBlob(t.blobKey);
    if (b) { const u = URL.createObjectURL(b); objUrls.set(t.blobKey, u); return u; }
  }
  return t.audioUrl || t.streamUrl;
}

// ───────────────── 歌曲頁 ─────────────────
async function renderSong(id) {
  let song = await getSong(id);
  if (!song) { view.innerHTML = `<div class="empty"><h2>找不到這首歌</h2><a class="btn" href="#/songs">回到我的歌曲</a></div>`; return; }
  const onUpd = async (e) => { if (e.detail === id) { song = await getSong(id); draw(); } };
  window.addEventListener("sfy:song", onUpd);
  cleanup = () => window.removeEventListener("sfy:song", onUpd);
  kickPoller();

  const draw = () => {
    const v = song.versions[song.current] || song.versions[0];
    const o = song.order;
    const st = styleByKey(o.style);
    const oc = occasionByKey(o.occasion);
    document.title = `${v.title} · 為你而唱`;
    const cover = v.tracks.find((t) => t.imageUrl)?.imageUrl;
    const verBar = song.versions.length > 1 ? `<div class="versions" style="margin-top:12px">${song.versions.map((x, i) => `<button data-ver="${i}" class="${i === song.current ? "on" : ""}">第 ${x.n} 版 ${badge(x)}</button>`).join("")}</div>` : "";
    let body = "";
    if (RUNNING.has(v.status) && v.provider && v.provider !== "suno") {
      body = `<div class="card making"><h2>${v.provider === "local" ? "正在合成你的音樂" : "AI 正在為你作曲與演唱"}</h2><div class="eq"><i></i><i></i><i></i><i></i><i></i></div>
        <p class="muted">${esc(v.progress || "處理中…")}</p>
        ${v.provider === "ace"
          ? `<p class="tiny" style="margin-top:14px">本機 AI 在你的電腦上製作，第一次使用要先載入模型，會比較久。可以先離開這個頁面，但電腦版要保持開著。</p>`
          : `<p class="note" style="margin-top:14px">⚠️ 免費模式在這個頁面裡製作，<b>請保持頁面開啟</b>，完成前不要關閉或重新整理。</p>`}</div>`;
    } else if (RUNNING.has(v.status) && !v.tracks.some((t) => t.audioUrl || t.streamUrl)) {
      const stages = ["PENDING", "TEXT_SUCCESS", "FIRST_SUCCESS", "SUCCESS"];
      const idx = stages.indexOf(v.status);
      body = `<div class="card making"><h2>AI 正在為你作曲與演唱</h2><div class="eq"><i></i><i></i><i></i><i></i><i></i></div>
        <p class="muted">${STATUS_TEXT[v.status] || "處理中…"}</p>
        <div class="stages">${["排隊", "編曲錄製", "第一版完成", "全部完成"].map((s, i) => `<span class="${i <= idx ? "on" : ""}">${s}</span>`).join("")}</div>
        <p class="tiny" style="margin-top:14px">通常需要 1–5 分鐘，你可以先離開這個頁面，完成後會出現在「我的歌曲」。</p></div>`;
    } else if (v.status === "FAILED") {
      body = `<div class="card"><h3>😢 這個版本沒有成功</h3><p class="err">${esc(v.error || "未知錯誤")}</p>
        <div class="row"><button class="btn btn-sm" id="retryVer">用同樣歌詞重試</button><button class="btn btn-ghost btn-sm" id="editVer">修改後重做</button></div></div>`;
    } else {
      body = `<div class="tracks">${v.tracks.map((t, i) => `
        <div class="track" data-ti="${i}"><button class="play" aria-label="播放">▶</button>
          <div class="meta"><b>版本 ${String.fromCharCode(65 + i)}</b> <span class="tiny">${t.duration ? fmtTime(t.duration) : ""}${t.blobKey ? " · 已存本機" : ""}${!t.audioUrl && t.streamUrl ? " · 串流預覽（收尾中）" : ""}</span>
            <div class="bar"><b></b></div><div class="t"><span class="cur">0:00</span> / <span class="dur">${t.duration ? fmtTime(t.duration) : "--:--"}</span></div></div>
          <button class="btn btn-ghost btn-sm dl" title="下載音檔" ${t.audioUrl || t.blobKey ? "" : "disabled"}>⬇ ${(t.ext || "mp3").toUpperCase()}</button>
        </div>`).join("")}</div>
        ${RUNNING.has(v.status) ? `<p class="tiny">⏳ ${STATUS_TEXT[v.status] || ""}</p>` : ""}
        <div class="row" style="margin:6px 0 10px">
          <button class="btn btn-sm" id="card">🖼 下載歌詞卡</button>
          ${navigator.share ? `<button class="btn btn-ghost btn-sm" id="share">📤 分享</button>` : ""}
          <button class="btn btn-ghost btn-sm" id="editVer">✏️ 修改重做</button>
        </div>`;
    }
    view.innerHTML = `
      <div class="song-head">
        <div class="cover">${cover ? `<img src="${esc(cover)}" alt="封面">` : st.emoji}</div>
        <div>
          <p class="tiny">${oc.emoji} ${oc.name} · ${st.name}${o.relation ? ` · 給${esc(o.relation)}` : ""}</p>
          <h1 style="font-size:clamp(28px,5vw,44px)">${esc(v.title)}</h1>
          <p class="muted">專為 <b>${esc(o.recipient)}</b> 打造${o.sender ? `，來自 ${esc(o.sender)}` : ""}</p>
          ${v.provider ? `<p class="tiny">產生方式：${esc(PROVIDERS[v.provider]?.short || v.provider)}${v.provider === "local" ? "（純音樂，無歌聲）" : ""}</p>` : ""}
          ${verBar}
        </div>
      </div>
      ${body}
      <div id="editPanel"></div>
      <section class="card" style="margin-top:18px"><h3 style="text-align:center">歌詞</h3><div class="lyrics-view">${lyricsHtml(v.lyrics)}</div></section>
      <div class="row" style="justify-content:space-between;margin-top:18px">
        <a class="btn btn-ghost btn-sm" href="#/songs">← 我的歌曲</a>
        <button class="btn btn-danger btn-sm" id="del">刪除這首歌</button>
      </div>`;
    bind(v);
  };

  const bind = (v) => {
    $$("[data-ver]").forEach((b) => b.onclick = async () => { song.current = Number(b.dataset.ver); stopAudio(); await putSong(song); });
    $$(".track").forEach((el) => {
      const t = v.tracks[Number(el.dataset.ti)];
      const key = v.taskId + ":" + t.id;
      const btn = $(".play", el), bar = $(".bar", el), fill = $(".bar b", el), cur = $(".cur", el), dur = $(".dur", el);
      const sync = () => {
        const on = playingKey === key;
        el.classList.toggle("on", on);
        btn.textContent = on && !audio.paused ? "❚❚" : "▶";
        if (on) {
          fill.style.width = (audio.duration ? (audio.currentTime / audio.duration) * 100 : 0) + "%";
          cur.textContent = fmtTime(audio.currentTime);
          if (audio.duration && isFinite(audio.duration)) dur.textContent = fmtTime(audio.duration);
        }
      };
      el._sync = sync;
      btn.onclick = async () => {
        if (playingKey === key) { audio.paused ? audio.play() : audio.pause(); return; }
        const src = await trackSrc(t);
        if (!src) return toast("音檔還沒準備好", true);
        audio.src = src; playingKey = key;
        audio.play().catch((e) => toast("無法播放：" + e.message, true));
      };
      bar.onclick = (e) => {
        if (playingKey !== key || !audio.duration) return;
        const r = bar.getBoundingClientRect();
        audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
      };
      $(".dl", el).onclick = () => downloadTrack(song, v, t, Number(el.dataset.ti));
    });

    const cardBtn = $("#card");
    if (cardBtn) cardBtn.onclick = () => lyricsCard(song, v);
    const shareBtn = $("#share");
    if (shareBtn) shareBtn.onclick = () => shareSong(song, v);
    const retry = $("#retryVer");
    if (retry) retry.onclick = () => newVersion(song, { title: v.title, lyrics: v.lyrics, styleTags: v.styleTags, vocal: v.vocal, length: v.length });
    const edit = $("#editVer");
    if (edit) edit.onclick = () => openEdit(song, v);
    $("#del").onclick = async () => {
      if (!confirm(`確定刪除「${v.title}」的所有版本？本機儲存的音檔也會一起刪除，無法復原。`)) return;
      stopAudio(); await deleteSong(song); toast("已刪除"); location.hash = "#/songs";
    };
  };

  draw();
}

function badge(v) {
  if (v.status === "SUCCESS") return "";
  if (v.status === "FAILED") return "⚠";
  return "⏳";
}

function lyricsHtml(text) {
  return esc(text || "").split("\n").map((l) => {
    const m = l.match(/^\s*\[(.+?)\]\s*$/);
    if (m) {
      const map = { intro: "前奏", verse: "主歌", "pre-chorus": "導歌", chorus: "副歌", bridge: "橋段", outro: "尾奏", "final chorus": "副歌", hook: "副歌" };
      const k = m[1].toLowerCase().replace(/\s*\d+$/, "");
      return `<span class="tag">${map[k] || m[1]}</span>`;
    }
    return l;
  }).join("\n");
}

async function newVersion(song, data) {
  const v = { n: Math.max(0, ...song.versions.map((x) => x.n)) + 1, ...data, status: "SUBMITTING", tracks: [], createdAt: Date.now() };
  try {
    await submitVersion(v);
    song.versions.push(v);
    song.current = song.versions.length - 1;
    await putSong(song);
    launchVersion(song, v);
    toast("已送出新版本，AI 製作中…");
  } catch (e) {
    toast(e.message || String(e), true);
  }
}

function openEdit(song, v) {
  const p = $("#editPanel");
  const hasClaude = !!getSettings().claudeKey;
  p.innerHTML = `<div class="card" style="margin-top:12px">
    <h3>修改重做（會產生新的版本，舊版本保留）</h3>
    <div class="q"><span class="lbl">曲風</span><select id="e-style">${STYLES.map((s) => `<option value="${s.key}" ${s.key === song.order.style ? "selected" : ""}>${s.emoji} ${s.name}</option>`).join("")}</select></div>
    <div class="q"><span class="lbl">人聲</span><select id="e-vocal">${[["f", "女聲"], ["m", "男聲"], ["any", "讓 AI 決定"]].map(([k, n]) => `<option value="${k}" ${k === v.vocal ? "selected" : ""}>${n}</option>`).join("")}</select></div>
    <div class="q"><label for="e-title">歌名</label><input id="e-title" type="text" maxlength="80" value="${esc(v.title)}"></div>
    <div class="q"><label for="e-lyrics">歌詞</label><textarea id="e-lyrics" class="lyrics-edit" maxlength="5000">${esc(v.lyrics)}</textarea></div>
    ${hasClaude ? `<div class="q"><label for="e-rev">或請 AI 依意見改寫歌詞</label><div class="row"><input id="e-rev" type="text" maxlength="200" placeholder="例如：第二段多寫我們養的狗" style="flex:1"><button class="btn btn-ghost btn-sm" id="e-ai">AI 改寫</button></div></div>` : ""}
    <div class="row"><button class="btn" id="e-go">🎵 產生新版本</button><button class="btn btn-ghost" id="e-cancel">取消</button></div>
    <p class="tiny">每次產生會使用 AI 音樂服務的點數。</p></div>`;
  p.scrollIntoView({ behavior: "smooth" });
  $("#e-cancel").onclick = () => (p.innerHTML = "");
  const ai = $("#e-ai");
  if (ai) ai.onclick = async () => {
    ai.disabled = true; ai.innerHTML = `<span class="spinner"></span>`;
    try {
      const r = await generateLyrics({ ...song.order, style: $("#e-style").value, revision: $("#e-rev").value.trim() || "換一種寫法", lyrics: $("#e-lyrics").value });
      $("#e-lyrics").value = r.lyrics; $("#e-title").value = r.title; p.dataset.style = r.style;
      toast("歌詞已改寫，確認後按「產生新版本」");
    } catch (e) { toast(e.message, true); }
    ai.disabled = false; ai.textContent = "AI 改寫";
  };
  $("#e-go").onclick = async () => {
    const styleKey = $("#e-style").value;
    const vocal = $("#e-vocal").value;
    let tags = p.dataset.style || (styleKey === song.order.style ? v.styleTags : styleByKey(styleKey).tags);
    tags = tags.replace(/,?\s*(fe)?male vocal/gi, "") + (vocal === "f" ? ", female vocal" : vocal === "m" ? ", male vocal" : "");
    const title = $("#e-title").value.trim() || v.title;
    const lyrics = $("#e-lyrics").value.trim();
    if (!lyrics) return toast("歌詞不能是空的", true);
    song.order.style = styleKey;
    p.innerHTML = "";
    await newVersion(song, { title, lyrics, styleTags: tags, vocal, length: v.length });
  };
}

const safeName = (s) => String(s || "song").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 60);

async function downloadTrack(song, v, t, i) {
  const name = `${safeName(v.title)}_${String.fromCharCode(65 + i)}.${t.ext || "mp3"}`;
  if (isDesktop()) {
    try {
      let r;
      if (t.blobKey) {
        const b = await getBlob(t.blobKey);
        r = await window.pywebview.api.save_base64(name, await blobToB64(b));
      } else r = await window.pywebview.api.save_url(name, t.audioUrl);
      if (r && r.ok) toast("已儲存到：" + r.path); else if (!(r && r.cancelled)) toast("儲存失敗：" + (r && r.error), true);
    } catch (e) { toast("儲存失敗：" + e.message, true); }
    return;
  }
  let blob = t.blobKey ? await getBlob(t.blobKey) : null;
  if (!blob && t.audioUrl) {
    try { const r = await fetch(t.audioUrl); if (r.ok) blob = await r.blob(); } catch { /* CORS */ }
  }
  if (blob) return saveBlob(blob, name);
  window.open(t.audioUrl, "_blank", "noopener");
  toast("已在新分頁開啟音檔，請用「另存」下載");
}
function saveBlob(blob, name) {
  if (isDesktop()) {
    return blobToB64(blob).then((b64) => window.pywebview.api.save_base64(name, b64)).then((r) => r && r.ok ? toast("已儲存到：" + r.path) : !(r && r.cancelled) && toast("儲存失敗：" + (r && r.error), true));
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast("已下載 " + name);
}
const blobToB64 = (b) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(b); });

async function shareSong(song, v) {
  const t = v.tracks[0];
  try {
    const blob = t && t.blobKey ? await getBlob(t.blobKey) : null;
    const file = blob ? new File([blob], safeName(v.title) + "." + (t.ext || "mp3"), { type: blob.type || "audio/mpeg" }) : null;
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: v.title, text: `一首專為${song.order.recipient}寫的歌 🎵` });
    } else {
      await navigator.share({ title: v.title, text: `一首專為${song.order.recipient}寫的歌 🎵`, url: t?.audioUrl || location.href });
    }
  } catch (e) { if (e.name !== "AbortError") toast("分享失敗：" + e.message, true); }
}

// 歌詞卡（PNG）：漸層背景、歌名、副歌歌詞、QR Code
async function lyricsCard(song, v) {
  const W = 1080, H = 1350;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  await document.fonts.ready;
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#2a1640"); bg.addColorStop(0.6, "#4a1f52"); bg.addColorStop(1, "#7a2e55");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // 裝飾圓
  g.globalAlpha = 0.12; g.fillStyle = "#ffc46b";
  g.beginPath(); g.arc(W - 120, 140, 260, 0, 7); g.fill();
  g.beginPath(); g.arc(80, H - 120, 200, 0, 7); g.fill();
  g.globalAlpha = 1;
  g.textAlign = "center";
  g.fillStyle = "#ffc46b"; g.font = "500 34px 'Noto Sans TC', sans-serif";
  g.fillText(`${occasionByKey(song.order.occasion).name} · 給${song.order.recipient}`, W / 2, 130);
  g.fillStyle = "#fff"; g.font = "900 76px 'Noto Serif TC', serif";
  wrapText(g, v.title, W / 2, 230, W - 160, 90, 2);
  // 取副歌
  const lines = (v.lyrics || "").split("\n");
  let start = lines.findIndex((l) => /^\s*\[(final )?chorus/i.test(l));
  let chorus = [];
  if (start >= 0) { for (let i = start + 1; i < lines.length && !/^\s*\[/.test(lines[i]); i++) if (lines[i].trim()) chorus.push(lines[i].trim()); }
  if (!chorus.length) chorus = lines.filter((l) => l.trim() && !/^\s*\[/.test(l)).slice(0, 6);
  chorus = chorus.slice(0, 7);
  g.fillStyle = "rgba(255,255,255,.92)"; g.font = "500 44px 'Noto Sans TC', sans-serif";
  let y = 420;
  for (const l of chorus) { y = wrapText(g, l, W / 2, y, W - 180, 66, 2) + 4; }
  // QR
  const url = v.tracks.find((t) => t.audioUrl)?.audioUrl;
  if (url && window.qrcode) {
    const qr = window.qrcode(0, "M"); qr.addData(url); qr.make();
    const n = qr.getModuleCount(), size = 260, cell = size / n, x0 = W / 2 - size / 2, y0 = H - 400;
    g.fillStyle = "#fff"; roundRect(g, x0 - 24, y0 - 24, size + 48, size + 48, 24); g.fill();
    g.fillStyle = "#2a1030";
    for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (qr.isDark(r, col)) g.fillRect(x0 + col * cell, y0 + r * cell, Math.ceil(cell), Math.ceil(cell));
    g.fillStyle = "rgba(255,255,255,.75)"; g.font = "400 28px 'Noto Sans TC', sans-serif";
    g.fillText("掃描 QR Code 聆聽這首歌", W / 2, H - 82);
  }
  g.fillStyle = "rgba(255,255,255,.55)"; g.font = "400 26px 'Noto Sans TC', sans-serif";
  g.fillText(song.order.sender ? `— ${song.order.sender}` : "為你而唱", W / 2, H - 36);
  c.toBlob((b) => saveBlob(b, `${safeName(v.title)}_歌詞卡.png`), "image/png");
}
function wrapText(g, text, x, y, maxW, lh, maxLines) {
  let line = "", n = 0;
  for (const ch of String(text)) {
    if (g.measureText(line + ch).width > maxW && line) { g.fillText(line, x, y); y += lh; line = ch; if (++n >= maxLines) return y; }
    else line += ch;
  }
  if (line) { g.fillText(line, x, y); y += lh; }
  return y;
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// ───────────────── 我的歌曲 ─────────────────
async function renderSongs() {
  document.title = "我的歌曲 · 為你而唱";
  const songs = await listSongs();
  const d = getDraft();
  view.innerHTML = `<div style="max-width:760px;margin:28px auto">
    <div class="row" style="justify-content:space-between"><h2 style="margin:0">我的歌曲</h2><a class="btn btn-sm" href="#/create">＋ 新的歌</a></div>
    ${d && (d.recipient || d.step > 0) ? `<a class="song-item" href="#/create" style="margin-top:16px"><div class="thumb">📝</div><div><b>未完成的草稿：給${esc(d.recipient || "…")}</b><div class="tiny">停在「${STEPS[d.step]}」步驟，點此繼續</div></div></a>` : ""}
    ${songs.length ? `<div class="song-list">${songs.map((s) => {
      const v = s.versions[s.current] || s.versions[0];
      const img = v.tracks.find((t) => t.imageUrl)?.imageUrl;
      const b = v.status === "SUCCESS" ? `<span class="badge ok">完成</span>` : v.status === "FAILED" ? `<span class="badge err">失敗</span>` : `<span class="badge run">製作中</span>`;
      return `<a class="song-item" href="#/song/${s.id}"><div class="thumb">${img ? `<img src="${esc(img)}" alt="">` : styleByKey(s.order.style).emoji}</div>
        <div style="flex:1;min-width:0"><b>${esc(v.title)}</b> ${b}<div class="tiny">給 ${esc(s.order.recipient)} · ${styleByKey(s.order.style).name} · ${s.versions.length} 個版本 · ${fmtDate(s.createdAt)}</div></div><span>›</span></a>`;
    }).join("")}</div>` : `<div class="empty"><div style="font-size:54px">🎼</div><p>還沒有歌曲，來做第一首吧！</p><a class="btn" href="#/create">開始製作</a></div>`}
  </div>`;
  const onUpd = () => renderSongs();
  window.addEventListener("sfy:song", onUpd);
  cleanup = () => window.removeEventListener("sfy:song", onUpd);
}

// ───────────────── 設定 ─────────────────
function renderSettings() {
  document.title = "設定 · 為你而唱";
  const s = getSettings();
  view.innerHTML = `<div class="settings">
    <h2>設定</h2>
    <div class="card">
      <h3>🎼 歌曲產生方式</h3>
      <div class="provs" id="provs">
        ${[
          ["ace", "♾️ 免費無限 · 本機 AI 歌聲", "在你自己的電腦（需 NVIDIA 顯示卡）上跑開源 ACE-Step 模型，有中文歌聲、不限次數、不用帳號。要在電腦版裡使用（手機可透過電腦版的區網網址使用）。"],
          ["hf", "🆓 免費 · AI 歌聲（Hugging Face）", "用開源 ACE-Step 模型產生有中文歌聲的歌。免費，但每天有 GPU 額度限制，填入免費的 Hugging Face token 額度更多。"],
          ["local", "🆓 免費 · 本機合成純音樂", "在你的裝置上直接合成伴奏音樂，沒有歌聲。不用帳號、不限次數、離線也能用。"],
          ["suno", "💎 付費 · sunoapi.org", "品質最好、最像真人演唱，需要儲值點數。"],
        ].map(([k, t, d]) => `<label class="prov ${s.provider === k ? "on" : ""}"><input type="radio" name="prov" value="${k}" ${s.provider === k ? "checked" : ""}><b>${t}</b><span class="small muted">${d}</span></label>`).join("")}
      </div>
    </div>
    <div class="card" style="margin-top:16px" data-for="ace">
      <h3>♾️ 本機 AI 歌聲</h3>
      <p class="muted small">由電腦版「為你而唱」自動在背景啟動本機 AI。第一次產生要載入模型（約 1–2 分鐘），之後每首歌依長度約 1–5 分鐘。</p>
      <div class="row"><button class="btn btn-ghost btn-sm" id="t-ace">檢查本機 AI 狀態</button><span id="t-ace-r" class="small muted"></span></div>
      <div id="lanBox" style="margin-top:12px"></div>
      <details class="faq"><summary>進階</summary>
        <div class="kv"><label for="s-acebase">本機 AI 位址（留空自動）</label><input id="s-acebase" type="url" value="${esc(s.aceBase || "")}" placeholder="${esc(aceBase())}"></div>
      </details>
    </div>
    <div class="card" style="margin-top:16px" data-for="hf">
      <h3>🤗 Hugging Face（免費 AI 歌聲）</h3>
      <p class="muted small">不填也能試，但未登入的免費額度通常不夠做一首歌。到 <a href="https://huggingface.co/join" target="_blank" rel="noopener">huggingface.co</a> 免費註冊，再到 <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener">Settings › Access Tokens</a> 建立一個「Read」權限的 token 貼在這裡。</p>
      <div class="kv"><label for="s-hf">Hugging Face token（免費）</label><input id="s-hf" type="password" autocomplete="off" value="${esc(s.hfToken)}" placeholder="hf_…"></div>
      <details class="faq"><summary>進階</summary>
        <div class="kv"><label for="s-hfs">Space 名稱</label><input id="s-hfs" type="text" value="${esc(s.hfSpace)}"></div>
      </details>
      <p class="tiny">免費額度用完時會顯示多久後恢復，期間可以改用「本機合成」。製作時請保持頁面開啟。</p>
    </div>
    <div class="card" style="margin-top:16px" data-for="suno">
      <h3>🎵 sunoapi.org（付費）</h3>
      <p class="muted small">使用 sunoapi.org 相容的 API 產生有歌聲的歌曲。到 <a href="https://sunoapi.org" target="_blank" rel="noopener">sunoapi.org</a> 註冊並取得 API Key，每首歌會扣該服務的點數。</p>
      <div class="kv"><label for="s-mk">API 金鑰</label><input id="s-mk" type="password" autocomplete="off" value="${esc(s.musicKey)}" placeholder="貼上 API Key"></div>
      <div class="kv"><label for="s-mm">模型</label><select id="s-mm">${["V6", "V6_MINI", "V6_WILD", "V5_5", "V5", "V4_5PLUS", "V4_5"].map((m) => `<option ${m === s.musicModel ? "selected" : ""}>${m}</option>`).join("")}</select></div>
      <details class="faq"><summary>進階</summary>
        <div class="kv"><label for="s-mb">API 位址</label><input id="s-mb" type="url" value="${esc(s.musicBase)}"></div>
        <div class="kv"><label for="s-cb">回呼網址（選填，服務要求時才填）</label><input id="s-cb" type="url" value="${esc(s.callbackUrl)}" placeholder="https://…"></div>
        <div class="kv"><label for="s-neg">排除風格（選填，英文）</label><input id="s-neg" type="text" value="${esc(s.negativeTags)}" placeholder="例如：heavy metal, screaming"></div>
      </details>
      <div class="row"><button class="btn btn-ghost btn-sm" id="t-music">測試連線</button><span id="t-music-r" class="small muted"></span></div>
    </div>
    <div class="card" style="margin-top:16px">
      <h3>✍️ Claude 作詞（選填，建議）</h3>
      <p class="muted small">填入 Anthropic 的 API 金鑰，AI 會依你的故事量身寫詞；不填則使用內建範本。到 <a href="https://console.anthropic.com" target="_blank" rel="noopener">console.anthropic.com</a> 取得。</p>
      <div class="kv"><label for="s-ck">Claude API 金鑰</label><input id="s-ck" type="password" autocomplete="off" value="${esc(s.claudeKey)}" placeholder="sk-ant-…"></div>
      <details class="faq"><summary>進階</summary>
        <div class="kv"><label for="s-cm">模型</label><input id="s-cm" type="text" value="${esc(s.claudeModel)}"></div>
        <div class="kv"><label for="s-cbase">API 位址（留空為官方）</label><input id="s-cbase" type="url" value="${esc(s.claudeBase)}"></div>
      </details>
      <div class="row"><button class="btn btn-ghost btn-sm" id="t-claude">測試連線</button><span id="t-claude-r" class="small muted"></span></div>
    </div>
    <div class="card" style="margin-top:16px">
      <h3>💾 資料</h3>
      <label class="row small"><input type="checkbox" id="s-save" ${s.saveAudio ? "checked" : ""}> 完成後自動把音檔存在本機（服務的連結約 14 天後失效）</label>
      <div class="row" style="margin-top:12px"><button class="btn btn-ghost btn-sm" id="exp">匯出歌曲清單</button><label class="btn btn-ghost btn-sm">匯入<input type="file" id="imp" accept=".json" hidden></label></div>
      <p class="tiny">金鑰只存在這台裝置的瀏覽器（電腦版存在本機），不會上傳到其他地方，只會直接送給對應的 AI 服務。</p>
    </div>
    <div class="row" style="margin-top:18px"><button class="btn" id="saveS">儲存設定</button></div>
  </div>`;
  const showProv = () => {
    const p = $("input[name=prov]:checked").value;
    $$(".prov").forEach((l) => l.classList.toggle("on", l.querySelector("input").checked));
    $$("[data-for]").forEach((c) => c.classList.toggle("hidden", c.dataset.for !== p));
  };
  $$("input[name=prov]").forEach((r) => r.addEventListener("change", () => { showProv(); saveSettings({ provider: r.value }); toast("已切換為：" + PROVIDERS[r.value].name); }));
  showProv();
  const collect = () => ({
    provider: $("input[name=prov]:checked").value,
    aceBase: $("#s-acebase").value.trim(),
    hfToken: $("#s-hf").value.trim(), hfSpace: $("#s-hfs").value.trim() || "ACE-Step/Ace-Step-v1.5",
    musicKey: $("#s-mk").value.trim(), musicModel: $("#s-mm").value, musicBase: $("#s-mb").value.trim() || "https://api.sunoapi.org",
    callbackUrl: $("#s-cb").value.trim(), negativeTags: $("#s-neg").value.trim(),
    claudeKey: $("#s-ck").value.trim(), claudeModel: $("#s-cm").value.trim() || "claude-opus-5-5", claudeBase: $("#s-cbase").value.trim(),
    saveAudio: $("#s-save").checked,
  });
  $("#saveS").onclick = () => { saveSettings(collect()); toast("設定已儲存"); };
  const tester = (btn, out, fn) => { $(btn).onclick = async () => { saveSettings(collect()); $(out).textContent = "測試中…"; try { $(out).textContent = "✅ " + (await fn()); } catch (e) { $(out).textContent = "❌ " + (e.message || e); } }; };
  tester("#t-music", "#t-music-r", testMusicKey);
  tester("#t-ace", "#t-ace-r", async () => {
    const st = await aceStatus();
    if (!st.reachable) throw new Error("連不到電腦版。請在電腦上開啟「為你而唱」電腦版。");
    if (!st.installed) throw new Error("電腦版找不到本機 AI（ace-step 資料夾）。");
    if (st.ready) return "本機 AI 已就緒（" + (st.gpu || "GPU") + "）";
    if (st.running) return "本機 AI 啟動中，第一次約需 1–2 分鐘…";
    throw new Error("本機 AI 沒有在執行：" + (st.error || "請重新開啟電腦版"));
  });
  // 電腦版：區網分享（手機用）
  if (window.pywebview && window.pywebview.api && window.pywebview.api.lan_info) {
    window.pywebview.api.lan_info().then((li) => {
      const box = $("#lanBox");
      if (!box) return;
      box.innerHTML = `<label class="row small"><input type="checkbox" id="lanOn" ${li.enabled ? "checked" : ""}> 讓同一個 Wi-Fi 的手機也能使用（需重新開啟電腦版）</label>
        ${li.enabled ? `<p class="small">手機瀏覽器打開：${li.urls.map((u) => `<b>${esc(u)}</b>`).join(" 或 ")}</p>` : ""}`;
      $("#lanOn").onchange = async (e) => { await window.pywebview.api.set_lan(e.target.checked); toast("已儲存，請關閉並重新開啟電腦版"); };
    }).catch(() => {});
  }
  tester("#t-claude", "#t-claude-r", testClaudeKey);
  $("#exp").onclick = async () => { const data = await exportAll(); saveBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `為你而唱_歌曲備份_${new Date().toISOString().slice(0, 10)}.json`); };
  $("#imp").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { const n = await importAll(JSON.parse(await f.text())); toast(`已匯入 ${n} 首歌`); } catch (er) { toast("匯入失敗：" + er.message, true); }
  };
}

// ───────────────── 啟動 ─────────────────
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
recoverInterrupted().catch(() => {}).finally(() => { route(); kickPoller(); });
window.addEventListener("beforeunload", (e) => { if (activeJobs.size) { e.preventDefault(); e.returnValue = ""; } });
window.SFY = { listSongs, getSong, getSettings, saveSettings, pollAll };
