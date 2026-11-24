// 為你而唱 — 歌詞與歌曲產生引擎
// 歌詞：Claude API（有金鑰時）或內建範本；歌曲：sunoapi.org 相容的 AI 音樂 API。

import { getSettings } from "./store.js";

const SDK_URL = "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.8.0/+esm";

export const STYLES = [
  { key: "ballad", name: "華語抒情", emoji: "🌙", tags: "Mandopop ballad, emotional, piano, strings, warm" },
  { key: "pop", name: "華語流行", emoji: "✨", tags: "Mandopop, upbeat pop, catchy chorus, modern production" },
  { key: "folk", name: "民謠吉他", emoji: "🎸", tags: "acoustic folk, fingerpicked guitar, intimate, warm" },
  { key: "rnb", name: "R&B", emoji: "💜", tags: "Chinese R&B, smooth, groovy, soulful" },
  { key: "rock", name: "搖滾", emoji: "🔥", tags: "Mandarin pop rock, electric guitar, drums, anthemic" },
  { key: "rap", name: "嘻哈饒舌", emoji: "🎤", tags: "Chinese hip hop, rap verses, melodic hook, boom bap" },
  { key: "jazz", name: "爵士", emoji: "🎷", tags: "smooth jazz, soft brushes, upright bass, romantic" },
  { key: "piano", name: "鋼琴抒情", emoji: "🎹", tags: "solo piano ballad, tender, cinematic, minimal" },
  { key: "taiwanese", name: "台語歌", emoji: "🌊", tags: "Taiwanese Hokkien ballad, nostalgic, heartfelt" },
  { key: "guofeng", name: "古風中國風", emoji: "🏮", tags: "Chinese traditional style, guzheng, erhu, poetic, cinematic" },
  { key: "kids", name: "童趣兒歌", emoji: "🧸", tags: "children's song, cheerful, playful, simple melody, ukulele" },
  { key: "edm", name: "電子舞曲", emoji: "🎧", tags: "EDM pop, dance, synth, energetic drop" },
];

export const OCCASIONS = [
  { key: "birthday", name: "生日", emoji: "🎂" },
  { key: "anniversary", name: "週年紀念", emoji: "💞" },
  { key: "love", name: "我愛你", emoji: "❤️" },
  { key: "wedding", name: "婚禮", emoji: "💍" },
  { key: "mother", name: "母親節", emoji: "🌷" },
  { key: "father", name: "父親節", emoji: "👔" },
  { key: "thanks", name: "感謝", emoji: "🙏" },
  { key: "missyou", name: "想念你", emoji: "🌌" },
  { key: "sorry", name: "道歉", emoji: "🕊️" },
  { key: "graduation", name: "畢業", emoji: "🎓" },
  { key: "memorial", name: "追思紀念", emoji: "🕯️" },
  { key: "milestone", name: "人生里程碑", emoji: "🏔️" },
];

export const RELATIONS = ["另一半", "老婆", "老公", "女朋友", "男朋友", "媽媽", "爸爸", "女兒", "兒子",
  "姊妹", "兄弟", "奶奶", "爺爺", "外婆", "外公", "好朋友", "同事", "老師", "自己"];

export const LENGTHS = [
  { key: 120, name: "精簡版（約 2 分鐘）" },
  { key: 180, name: "標準版（約 3 分鐘）" },
  { key: 240, name: "完整版（約 4 分鐘）" },
];

export const styleByKey = (k) => STYLES.find((s) => s.key === k) || STYLES[0];
export const occasionByKey = (k) => OCCASIONS.find((o) => o.key === k) || OCCASIONS[0];

// ───────────────────────── 歌詞 ─────────────────────────

const LYRICS_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "歌名，繁體中文，20 字以內" },
    lyrics: { type: "string", description: "完整歌詞，含 [Verse 1] 等英文段落標籤" },
    style: { type: "string", description: "給 AI 音樂模型的英文風格描述，200 字元以內" },
  },
  required: ["title", "lyrics", "style"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `你是台灣的專業華語作詞人，專門為客製化禮物歌曲寫詞。
規則：
- 一律使用台灣繁體中文與台灣慣用語（台語歌則用台語漢字，必要時可混華語）。
- 結構：[Intro]（可省略）、[Verse 1]、[Pre-Chorus]、[Chorus]、[Verse 2]、[Pre-Chorus]、[Chorus]、[Bridge]、[Final Chorus]、[Outro]。段落標籤用英文方括號，獨立一行。
- 每句 7–14 字，好唱、押韻自然（副歌務必押韻），副歌要有一句容易記住、重複出現的主題句。
- 把使用者提供的名字、回憶、細節、想說的話具體寫進歌裡，不要空泛套話；名字至少出現在副歌一次。
- 歌詞內不要加註解、括號說明、和弦或表情符號。
- style 欄位用英文，描述曲風、樂器、情緒、人聲（例如 female vocal / male vocal），不要包含任何真實歌手或樂團名字。`;

function briefFromOrder(o) {
  const st = styleByKey(o.style);
  const oc = occasionByKey(o.occasion);
  const lines = [
    `收禮對象：${o.recipient}（${o.relation || "關係未指定"}）`,
    `送禮者署名：${o.sender || "（未填）"}`,
    `場合：${oc.name}`,
    `曲風：${st.name}（參考英文風格：${st.tags}）`,
    `人聲：${o.vocal === "m" ? "男聲" : o.vocal === "f" ? "女聲" : "不限"}`,
    `整體情緒：${o.mood || "溫暖感動"}`,
    `歌曲長度目標：約 ${Math.round((o.length || 180) / 60)} 分鐘`,
    "",
    `對方是什麼樣的人：${o.q_person || "（未填）"}`,
    `你們最難忘的回憶：${o.q_memory || "（未填）"}`,
    `對方的小習慣、口頭禪或只有你們懂的事：${o.q_detail || "（未填）"}`,
    `最想對他／她說的話：${o.q_message || "（未填）"}`,
    `一定要放進歌裡的字詞：${o.q_words || "（無）"}`,
  ];
  if (o.revision) lines.push("", `這是修改版，請依照以下修改意見重寫：${o.revision}`, `上一版歌詞：\n${o.lyrics || ""}`);
  return lines.join("\n");
}

export async function generateLyrics(order) {
  const s = getSettings();
  if (!s.claudeKey) return templateLyrics(order);

  const { default: Anthropic } = await import(/* @vite-ignore */ SDK_URL);
  const client = new Anthropic({
    apiKey: s.claudeKey,
    baseURL: s.claudeBase || undefined,
    dangerouslyAllowBrowser: true,
    maxRetries: 2,
  });
  const resp = await client.beta.messages.create({
    model: s.claudeModel || "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: LYRICS_SCHEMA } },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: "請依照以下資料寫一首客製歌曲：\n\n" + briefFromOrder(order) }],
  });
  if (resp.stop_reason === "refusal") throw new Error("Claude 無法為這段內容寫詞，請調整故事內容後再試。");
  if (resp.stop_reason === "max_tokens") throw new Error("歌詞太長被截斷，請再試一次。");
  const text = resp.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("歌詞格式解析失敗，請再試一次。"); }
  return {
    title: String(data.title || `給${order.recipient}的歌`).slice(0, 80),
    lyrics: String(data.lyrics || "").trim(),
    style: String(data.style || styleByKey(order.style).tags).slice(0, 900),
    source: "claude",
  };
}

// 沒有 Claude 金鑰時的內建範本詞（可再手動修改）
export function templateLyrics(o) {
  const n = o.recipient || "你";
  const oc = occasionByKey(o.occasion);
  const pick = (t, d) => (t && t.trim() ? t.trim().split(/[。！!？?\n，,；;]/).filter(Boolean) : [d]);
  const person = pick(o.q_person, "你總是溫柔又堅強");
  const memory = pick(o.q_memory, "那些一起走過的日子");
  const detail = pick(o.q_detail, "你的笑聲最好認");
  const message = pick(o.q_message, "謝謝你一直在我身邊");
  const occLine = {
    birthday: `${n}，祝你生日快樂`,
    anniversary: "又走過了一年的時光",
    love: `${n}，我想說我愛你`,
    wedding: "從今以後牽手一起走",
    mother: "媽媽，你辛苦了",
    father: "爸爸，你的肩膀最可靠",
    thanks: `${n}，真的謝謝你`,
    missyou: `${n}，我好想你`,
    sorry: "對不起，讓你難過了",
    graduation: "帶著夢想勇敢出發",
    memorial: "你一直活在我心上",
    milestone: "這一刻值得被記得",
  }[o.occasion] || `${n}，這首歌給你`;
  const mood = o.relation ? `我的${o.relation}` : "最重要的人";
  const lyrics = [
    "[Verse 1]",
    `${person[0]}`,
    `${person[1] || "像陽光灑在窗台上"}`,
    `${memory[0]}`,
    `${memory[1] || "我一直都收藏在心上"}`,
    "",
    "[Pre-Chorus]",
    `${detail[0]}`,
    "每個小細節都是我的寶藏",
    "",
    "[Chorus]",
    `${occLine}`,
    `${n}，你是${mood}`,
    `${message[0]}`,
    "這首歌唱給你，唱到地久天長",
    "",
    "[Verse 2]",
    `${memory[2] || "時間走得再快也不慌"}`,
    `${detail[1] || "因為有你在身旁"}`,
    "回頭看看那些腳印",
    "每一步都寫著我們的模樣",
    "",
    "[Chorus]",
    `${occLine}`,
    `${n}，你是${mood}`,
    `${message[1] || message[0]}`,
    "這首歌唱給你，唱到地久天長",
    "",
    "[Bridge]",
    o.q_words ? `${o.q_words}` : "就算世界再大再忙",
    "我也會記得你的模樣",
    "",
    "[Final Chorus]",
    `${occLine}`,
    `${n}，你是${mood}`,
    "所有說不出口的話",
    "都在這首歌裡為你輕輕地唱",
    "",
    "[Outro]",
    `${n}，這首歌給你`,
  ].join("\n");
  const st = styleByKey(o.style);
  const vocal = o.vocal === "m" ? ", male vocal" : o.vocal === "f" ? ", female vocal" : "";
  return { title: `給${n}的歌`, lyrics, style: st.tags + vocal, source: "template", occasion: oc.key };
}

// ───────────────────────── 免費：Hugging Face ACE-Step ─────────────────────────

const GRADIO_URL = "https://cdn.jsdelivr.net/npm/@gradio/client@2.7.2/+esm";
export const PROVIDERS = {
  hf: { name: "免費 · Hugging Face ACE-Step", short: "ACE-Step（免費）" },
  local: { name: "免費 · 本機合成純音樂", short: "本機合成（免費）" },
  suno: { name: "付費 · sunoapi.org", short: "sunoapi（付費）" },
};

function hfError(msg) {
  const m = String(msg || "");
  if (/quota/i.test(m)) {
    const wait = m.match(/Try again in ([\d:]+)/);
    return "Hugging Face 免費 GPU 額度用完了" + (wait ? `（約 ${wait[1]} 後恢復）` : "") +
      "。到「設定」填入免費的 Hugging Face token 可取得更多額度，或改用「本機合成」。";
  }
  if (/sleep|paused|building|not running/i.test(m)) return "免費服務目前在休眠或維護中，請稍後再試。";
  if (/token|unauthor|401/i.test(m)) return "Hugging Face token 無效，請到設定檢查。";
  return "免費 AI 服務錯誤：" + (m || "未知錯誤（可能是服務忙碌，請稍後再試）");
}

// 呼叫 ACE-Step v1.5 Space。onStatus(text) 回報進度；回傳 [{blob, url, duration}]
export async function runAceStep(v, onStatus) {
  const s = getSettings();
  const { Client } = await import(/* @vite-ignore */ GRADIO_URL);
  onStatus && onStatus("正在連線免費 AI 作曲服務…");
  let app;
  try {
    app = await Client.connect(s.hfSpace || "ACE-Step/Ace-Step-v1.5", {
      events: ["data", "status"],
      ...(s.hfToken ? { hf_token: s.hfToken } : {}),
    });
  } catch (e) {
    throw new Error(hfError(e && (e.message || e)));
  }
  const lyrics = String(v.lyrics || "").replace(/^[ \t]*\[(.+?)\][ \t]*$/gm, (_, t) => "[" + t.toLowerCase().replace(/\s*\d+$/, "") + "]");
  const params = {
    simple_query_input: "",
    param_4: (v.styleTags || "").slice(0, 500),
    param_5: lyrics.slice(0, 4000),
    param_9: "zh",
    param_14: null,
    param_15: Math.min(Number(v.length) || 120, 240),
    param_16: 2,
    param_17: null,
    param_18: "",
    param_30: "mp3",
    param_47: null,
  };
  const job = app.submit("/generation_wrapper", params);
  let result = null;
  for await (const m of job) {
    if (m.type === "status") {
      if (m.stage === "error") throw new Error(hfError(m.message || m.title));
      if (m.stage === "pending") {
        if (m.position > 0) onStatus && onStatus(`排隊中：前面還有 ${m.position} 人${m.eta ? `，約 ${Math.ceil(m.eta)} 秒` : ""}`);
        else onStatus && onStatus("AI 正在作曲、編曲與演唱…（約 1–3 分鐘）");
      }
      if (m.progress_data && m.progress_data.length) {
        const p = m.progress_data[0];
        if (p && p.length) onStatus && onStatus(`AI 製作中… ${Math.round((p.index / p.length) * 100)}%`);
      }
      if (m.stage === "complete" && result) break;
    }
    if (m.type === "data") { result = m.data; break; }
  }
  if (!result) throw new Error(hfError("沒有收到結果"));
  const files = result.slice(0, 2).filter((f) => f && (f.url || f.path));
  if (!files.length) throw new Error(hfError(typeof result[10] === "string" ? result[10] : "沒有產生音檔"));
  onStatus && onStatus("下載音檔中…");
  const out = [];
  for (const f of files) {
    const url = f.url || "";
    const r = await fetch(url, s.hfToken ? { headers: { Authorization: "Bearer " + s.hfToken } } : undefined);
    if (!r.ok) throw new Error(hfError(`下載音檔失敗（${r.status}）`));
    out.push({ blob: await r.blob(), url });
  }
  return out;
}

// ───────────────────────── 付費：sunoapi.org ─────────────────────────

function musicBase() {
  const s = getSettings();
  return (s.musicBase || "https://api.sunoapi.org").replace(/\/+$/, "");
}

async function musicFetch(path, opts = {}) {
  const s = getSettings();
  if (!s.musicKey) throw new Error("尚未設定 AI 音樂 API 金鑰，請到「設定」填寫。");
  let r;
  try {
    r = await fetch(musicBase() + path, {
      ...opts,
      headers: { Authorization: "Bearer " + s.musicKey, "Content-Type": "application/json", ...(opts.headers || {}) },
    });
  } catch (e) {
    throw new Error("連不上 AI 音樂服務，請檢查網路或 API 位址。");
  }
  let j = null;
  try { j = await r.json(); } catch { /* ignore */ }
  const code = j && typeof j.code === "number" ? j.code : r.status;
  if (code !== 200) {
    const msgMap = {
      400: "參數錯誤", 401: "API 金鑰無效或未授權", 404: "API 路徑錯誤（請檢查 API 位址）",
      405: "請求太頻繁，請稍後再試", 413: "歌詞或風格描述太長", 429: "帳戶點數不足，請儲值",
      430: "呼叫太頻繁，請稍後再試", 455: "服務維護中，請稍後再試", 500: "服務端錯誤，請稍後再試",
    };
    let msg = (msgMap[code] || "AI 音樂服務錯誤") + `（${code}）`;
    if (j && j.msg) msg += "：" + j.msg;
    if (j && j.msg && /callback/i.test(j.msg)) msg += "。請到「設定 › 進階」填寫回呼網址。";
    const err = new Error(msg);
    err.code = code;
    throw err;
  }
  return j.data;
}

export async function startSong(song) {
  const s = getSettings();
  const vocal = song.vocal === "m" || song.vocal === "f" ? song.vocal : undefined;
  const body = {
    customMode: true,
    instrumental: false,
    model: s.musicModel || "V6",
    title: (song.title || "").slice(0, 80),
    style: (song.styleTags || "").slice(0, 1000),
    lyrics: (song.lyrics || "").slice(0, 5000),
    duration: Number(song.length) || 180,
  };
  if (vocal) body.vocalGender = vocal;
  if (s.negativeTags) body.negativeTags = s.negativeTags.slice(0, 1000);
  if (s.callbackUrl) body.callBackUrl = s.callbackUrl;
  if (!/^V(5_5|6)/.test(body.model)) delete body.duration;
  const data = await musicFetch("/api/v1/generate", { method: "POST", body: JSON.stringify(body) });
  if (!data || !data.taskId) throw new Error("AI 音樂服務沒有回傳任務編號。");
  return data.taskId;
}

const FAIL = {
  CREATE_TASK_FAILED: "建立任務失敗",
  GENERATE_AUDIO_FAILED: "產生音訊失敗",
  CALLBACK_EXCEPTION: "回呼發生錯誤",
  SENSITIVE_WORD_ERROR: "歌詞含有服務不允許的字詞，請修改歌詞後重做",
};

export const STATUS_TEXT = {
  PENDING: "排隊中，作曲家準備中…",
  TEXT_SUCCESS: "歌詞已就緒，正在編曲與錄製…",
  FIRST_SUCCESS: "第一個版本完成，第二個版本收尾中…",
  SUCCESS: "完成！",
};

export async function pollSong(taskId) {
  const d = await musicFetch("/api/v1/generate/record-info?taskId=" + encodeURIComponent(taskId), { method: "GET" });
  const status = d.status || "PENDING";
  const list = (d.response && d.response.sunoData) || [];
  const tracks = list.map((t) => ({
    id: t.id,
    title: t.title,
    audioUrl: t.audio_url || t.source_audio_url || "",
    streamUrl: t.stream_audio_url || t.source_stream_audio_url || "",
    imageUrl: t.image_url || t.source_image_url || "",
    duration: Number(t.duration) || 0,
    tags: t.tags || "",
  }));
  const failed = FAIL[status] ? FAIL[status] + (d.errorMessage ? "：" + d.errorMessage : "") : null;
  return { status, tracks, failed, done: status === "SUCCESS" };
}

export async function testMusicKey() {
  // 查詢一個不存在的任務：金鑰錯會回 401，金鑰正確通常回其他代碼
  try {
    await pollSong("connection-test");
    return "連線成功";
  } catch (e) {
    if (e.code === 401) throw e;
    if (e.code && e.code !== 401) return "金鑰有效（伺服器回應：" + e.message + "）";
    throw e;
  }
}

export async function testClaudeKey() {
  const s = getSettings();
  if (!s.claudeKey) throw new Error("尚未填寫 Claude API 金鑰");
  const { default: Anthropic } = await import(/* @vite-ignore */ SDK_URL);
  const client = new Anthropic({ apiKey: s.claudeKey, baseURL: s.claudeBase || undefined, dangerouslyAllowBrowser: true });
  const r = await client.messages.create({
    model: s.claudeModel || "claude-opus-5-5",
    max_tokens: 256,
    output_config: { effort: "low" },
    messages: [{ role: "user", content: "回覆「OK」兩個字母即可。" }],
  });
  return "Claude 連線成功（" + r.model + "）";
}
