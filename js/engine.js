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
- 這是一首「送給別人的禮物歌」：用送禮者第一人稱「我」對收禮人說話，從頭到尾視角一致；收禮人是女生時用「妳」，男生用「你」。
- 語氣要符合兩人的關係：只有情侶／夫妻才寫戀愛的句子，對家人、朋友、長輩要用親情或友情的語氣。
- 每一句都是完整、通順、能唱的句子，不要斷在半句；主歌各段內容不要重複。
- 有送禮者署名時，在 [Outro] 自然帶出「（署名）把這首歌送給你／妳」。
- 歌曲主題必須緊扣「場合」：例如生日要唱生日快樂與許願、母親節要感謝媽媽、道歉要誠心說對不起、畢業要祝福前程；歌名也要呼應場合。
- 把使用者提供的名字、回憶、細節、想說的話具體寫進歌裡，不要空泛套話；名字至少出現在副歌一次。
- 歌詞內不要加註解、括號說明、和弦或表情符號。
- style 欄位用英文，描述曲風、樂器、情緒、人聲（例如 female vocal / male vocal），不要包含任何真實歌手或樂團名字。`;

function briefFromOrder(o) {
  const st = styleByKey(o.style);
  const oc = occasionByKey(o.occasion);
  const lines = [
    `收禮對象：${o.recipient}（${o.relation || "關係未指定"}；性別：${isFemale(o) ? "女生，用「妳」" : o.gender === "m" || /爸|老公|先生|男朋友|兒子|哥|弟|爺爺|外公|阿公/.test(o.relation || "") ? "男生，用「你」" : "未指定，用「你」"}）`,
    `送禮者署名：${o.sender || "（未填）"}`,
    `場合：${oc.name}（主題重點：${(OCC_LYRICS[oc.key] || {}).theme || oc.name}）——整首歌一定要圍繞這個場合，副歌要直接唱出這個場合的祝福或心意`,
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

// 每個場合專屬的歌詞段落（{n} = 名字）。範本詞與 Claude 作詞都會依此緊扣場合主題。
export const OCC_LYRICS = {
  birthday: {
    title: "{n}，生日快樂", theme: "生日：祝福對方生日快樂、許願、吹蠟燭、又長大一歲、新的一年",
    verse2: ["蛋糕上的燭光輕輕搖晃", "閉上眼睛許下你的願望", "又長大了一歲的你", "笑起來還是那麼閃亮"],
    pre: ["今天全世界都為你歌唱", "把最好的祝福放在你身旁"],
    chorus: ["{n}，祝你生日快樂", "願你每個願望都能實現", "新的一歲平安又健康", "快樂永遠住在你心上"],
    bridge: ["吹熄蠟燭的那一刻", "我偷偷許的願也是你"],
    outro: "{n}，生日快樂",
  },
  anniversary: {
    title: "我們的又一年", theme: "週年紀念：一起走過的時間、日曆、承諾、未來的每一年",
    verse2: ["日曆又翻過了一整年", "我們的故事還在寫", "吵過笑過也哭過", "最後還是牽著手不放開"],
    pre: ["數著一起走過的季節", "每一天都值得紀念"],
    chorus: ["{n}，週年快樂", "謝謝你陪我又走了一年", "往後的每一個春夏秋冬", "我都想和你一起過"],
    bridge: ["就算時間再怎麼走", "我愛你的心從來沒變"],
    outro: "{n}，下一年也請多指教",
  },
  love: {
    title: "{n}，我愛你", theme: "告白／我愛你：勇敢說出愛、心動、想守護對方",
    verse2: ["每次看見你的笑容", "我的心就跳得好快", "想了好久的那句話", "今天終於要說出來"],
    pre: ["不想再藏在心裡", "我要讓你知道"],
    chorus: ["{n}，我愛你", "比昨天更愛你", "想牽著你的手", "走過每一個晴天和雨季"],
    bridge: ["全世界那麼大", "我只想住進你心裡"],
    outro: "{n}，我愛你",
  },
  wedding: {
    title: "從今以後", theme: "婚禮：誓言、禮堂、戒指、從今以後、白頭偕老",
    verse2: ["紅毯的盡頭是你", "陽光灑在你的白紗上", "交換戒指的那一刻", "我聽見幸福的聲響"],
    pre: ["在所有人的祝福裡", "我許下一生的誓言"],
    chorus: ["{n}，從今以後", "你的手我會牢牢牽著", "不論晴天或是風雨", "我們一起白頭到老"],
    bridge: ["這一生最好的決定", "就是在這裡說我願意"],
    outro: "{n}，我願意",
  },
  mother: {
    title: "{n}，謝謝你", theme: "母親節：感謝媽媽、媽媽的手、早餐、嘮叨、辛苦了",
    verse2: ["你的手變得有點粗", "那是為我們操勞的痕跡", "你的嘮叨我曾經嫌煩", "現在才懂那是愛的語氣"],
    pre: ["今天是屬於你的節日", "換我來說聲謝謝你"],
    chorus: ["{n}，母親節快樂", "謝謝你給我所有的愛", "你辛苦了這麼多年", "換我來照顧你"],
    bridge: ["不管我長到多大", "在你面前永遠是孩子"],
    outro: "{n}，我愛你",
  },
  father: {
    title: "爸爸的肩膀", theme: "父親節：感謝爸爸、寬厚的肩膀、沉默的愛、背影",
    verse2: ["小時候坐在你的肩膀", "以為能看見整個世界", "你總是話不多", "卻把愛藏在每一件小事裡"],
    pre: ["你的背影變得有點彎", "我卻還沒好好說謝謝"],
    chorus: ["{n}，父親節快樂", "你的肩膀是我最大的依靠", "辛苦了那麼多年", "換我讓你驕傲"],
    bridge: ["你沒說出口的愛", "我現在都懂了"],
    outro: "{n}，謝謝你",
  },
  thanks: {
    title: "謝謝你", theme: "感謝：感恩對方的付出、陪伴、在困難時伸出手",
    verse2: ["在我最難過的時候", "是你陪我度過", "你給的每一份溫暖", "我都好好收著"],
    pre: ["有些話一直想說", "今天終於說出口"],
    chorus: ["{n}，真的謝謝你", "謝謝你出現在我的生命裡", "你給我的每一份好", "我會一輩子記得"],
    bridge: ["如果沒有你", "我不會是今天的我"],
    outro: "{n}，謝謝你",
  },
  missyou: {
    title: "好想你", theme: "想念：距離、思念、夜晚、星空、期待重逢",
    verse2: ["夜深了還睡不著", "看著窗外的星星", "我們之間隔著好遠", "思念卻一直沒停"],
    pre: ["如果風能帶話", "請告訴你我在想你"],
    chorus: ["{n}，我好想你", "想你的笑想你的聲音", "不管相隔多遠", "我的心一直在你那裡"],
    bridge: ["等到再見面的那天", "我要好好抱緊你"],
    outro: "{n}，我好想你",
  },
  sorry: {
    title: "對不起", theme: "道歉：誠心道歉、反省、請求原諒、會改變、珍惜",
    verse2: ["那天說了傷人的話", "看見你難過的眼睛", "我才知道自己錯了", "心裡好後悔好心疼"],
    pre: ["想把時間倒轉回去", "把那些話收回來"],
    chorus: ["{n}，對不起", "是我不夠好讓你受委屈", "請再給我一次機會", "我會好好珍惜你"],
    bridge: ["我會學著更溫柔", "不再讓你掉眼淚"],
    outro: "{n}，對不起，我愛你",
  },
  graduation: {
    title: "出發吧", theme: "畢業：畢業典禮、學士帽、青春、夢想、勇敢出發、祝福未來",
    verse2: ["拋起學士帽的那一刻", "青春在陽光下閃耀", "那些熬夜苦讀的日子", "都化成今天的驕傲"],
    pre: ["下一站在前方等著", "帶著勇氣大步走"],
    chorus: ["{n}，恭喜你畢業", "勇敢去追你的夢", "不管未來有多少挑戰", "我都會為你加油"],
    bridge: ["累了就回頭看看", "我一直都在這裡"],
    outro: "{n}，畢業快樂",
  },
  memorial: {
    title: "你一直都在", theme: "追思紀念：懷念逝去的人、溫柔的回憶、你一直在心裡、天上的星星",
    verse2: ["想起你溫暖的笑容", "好像你還在我身旁", "那些一起走過的路", "我都好好記在心上"],
    pre: ["天上那顆最亮的星", "是不是你在看著我"],
    chorus: ["{n}，我好想你", "你從來沒有離開", "你的愛還在這裡", "陪我走過每一天"],
    bridge: ["我會帶著你的愛", "好好地生活下去"],
    outro: "{n}，你一直都在",
  },
  milestone: {
    title: "這一刻", theme: "人生里程碑：成就、新的開始、一路的努力、值得驕傲",
    verse2: ["一路走來不容易", "汗水和眼淚都值得", "跌倒了再站起來", "才走到今天這一刻"],
    pre: ["回頭看看那些腳印", "每一步都算數"],
    chorus: ["{n}，這一刻屬於你", "所有努力都閃閃發光", "新的旅程已經開始", "我為你感到驕傲"],
    bridge: ["不管下一站在哪裡", "我都會為你鼓掌"],
    outro: "{n}，恭喜你",
  },
};

// 依關係分組（決定主歌一的內容與語氣）
export function relGroupOf(rel, occasion) {
  if (occasion === "mother" || occasion === "father") return "parent";
  if (/老婆|老公|另一半|女朋友|男朋友|太太|先生|愛人/.test(rel || "")) return "lover";
  if (/媽|爸|奶奶|爺爺|外婆|外公|阿嬤|阿公/.test(rel || "")) return "parent";
  if (/女兒|兒子|孩子|寶貝/.test(rel || "")) return "child";
  if (/姊|姐|妹|哥|弟|兄|家人/.test(rel || "")) return "family";
  if (!rel && ["love", "wedding", "anniversary"].includes(occasion)) return "lover";
  return "friend";
}
// 收禮人性別：gender 欄位優先，否則從關係判斷。女生用「妳」
export function isFemale(o) {
  if (o.gender === "f") return true;
  if (o.gender === "m") return false;
  return /老婆|女朋友|太太|媽|女兒|姊|姐|妹|奶奶|外婆|阿嬤|阿姨|嬸|姑/.test(o.relation || "") ||
    (o.occasion === "mother" && !/爸|老公|先生|男朋友|兒子|哥|弟/.test(o.relation || ""));
}

// 主歌一：每組是完整的兩句（避免句子被截斷），從送禮人的角度對收禮人說
const VERSE1_BANK = {
  lover: [
    ["你笑起來像彎彎的月亮", "整個房間都跟著發亮"],
    ["第一次見面我好緊張", "話都說得結結巴巴"],
    ["下雨天擠在同一把傘下", "誰也捨不得先回家"],
    ["你總記得我的半糖少冰", "把我放在心上每一天"],
    ["吵架後先笑出來的總是你", "讓我知道什麼叫珍惜"],
  ],
  parent: [
    ["小時候發燒的那個夜裡", "你整晚守在我的床邊"],
    ["每天早上桌上的早餐", "是我吃過最好的味道"],
    ["你騎車載我去上學", "我在後座慢慢長大"],
    ["電話裡你總說你很好", "叫我千萬別替你擔心"],
    ["出門前你總要問一句", "外套有沒有記得帶"],
  ],
  child: [
    ["你第一次叫我的那天", "我開心得好久睡不著"],
    ["牽著你的小手去上學", "看你回頭對我揮手"],
    ["你睡著時安靜的臉", "是我看不膩的風景"],
    ["你總有問不完的為什麼", "讓每天都變得新鮮"],
  ],
  family: [
    ["小時候搶同一個玩具", "吵完了又一起笑"],
    ["長大後各自忙碌", "見面還是像從前一樣"],
    ["那些一起過的年", "熱鬧又溫暖"],
    ["你嘴上從來不說", "心裡卻最在乎家人"],
  ],
  friend: [
    ["你是隨傳隨到的朋友", "從來不曾缺席"],
    ["你總能用一句話", "讓我笑得停不下來"],
    ["那些聊到天亮的晚上", "是我最珍貴的時光"],
    ["我最低潮的那段日子", "是你陪我走了過來"],
  ],
};
// 和場合主歌二重複的素材要避開
const VERSE1_SKIP = { mother: /早餐|外套/, father: /騎車/, birthday: /^$/, missyou: /^$/ };
// 情侶以外的對象，部分場合的橋段改成不帶戀愛語氣的版本
const BRIDGE_NON_LOVER = {
  birthday: ["願這個世界溫柔待你", "每一天都有人把你放心上"],
  love: ["謝謝你一直在我身邊", "你是我最重要的人"],
  missyou: ["等到再見面的那一天", "我們再好好聊個痛快"],
};

// 沒有 Claude 金鑰時的內建範本詞（可再手動修改）
export function templateLyrics(o) {
  const n = o.recipient || "你";
  const oc = occasionByKey(o.occasion);
  const L = OCC_LYRICS[oc.key] || OCC_LYRICS.birthday;
  const group = relGroupOf(o.relation, oc.key);
  const f = (x) => String(x).replaceAll("{n}", n);
  const skip = VERSE1_SKIP[oc.key];
  const bank = VERSE1_BANK[group].filter((c) => !skip || !skip.test(c.join("")));
  const [c1, c2] = [...bank].sort(() => Math.random() - 0.5);
  const bridge = group !== "lover" && BRIDGE_NON_LOVER[oc.key] ? BRIDGE_NON_LOVER[oc.key] : L.bridge;
  const finalChorus = [...L.chorus.slice(0, 3), "這首歌，是我想對你說的話"];
  const outro = o.sender ? [f(L.outro), `${o.sender}，把這首歌送給你`] : [f(L.outro)];
  let lyrics = [
    "[Verse 1]",
    ...c1, ...(c2 || ["那些一起走過的日子", "我都好好收藏在心上"]),
    "",
    "[Pre-Chorus]",
    ...L.pre.map(f),
    "",
    "[Chorus]",
    ...L.chorus.map(f),
    "",
    "[Verse 2]",
    ...L.verse2.map(f),
    "",
    "[Pre-Chorus]",
    ...L.pre.map(f),
    "",
    "[Chorus]",
    ...L.chorus.map(f),
    "",
    "[Bridge]",
    ...(o.q_words ? [o.q_words, bridge[1]] : bridge).map(f),
    "",
    "[Final Chorus]",
    ...finalChorus.map(f),
    "",
    "[Outro]",
    ...outro,
  ].join("\n");
  let title = f(L.title);
  if (isFemale(o)) {
    // 送給女生：你 → 妳（名字本身不動）
    const fix = (t) => t.split(n).map((p) => p.replaceAll("你", "妳")).join(n);
    lyrics = fix(lyrics); title = fix(title);
  }
  const st = styleByKey(o.style);
  const vocal = o.vocal === "m" ? ", male vocal" : o.vocal === "f" ? ", female vocal" : "";
  return { title, lyrics, style: st.tags + vocal, source: "template", occasion: oc.key };
}

// ───────────────────────── 免費：Hugging Face ACE-Step ─────────────────────────

const GRADIO_URL = "https://cdn.jsdelivr.net/npm/@gradio/client@2.7.2/+esm";
export const PROVIDERS = {
  ace: { name: "免費無限 · 本機 AI 歌聲", short: "本機 AI（免費無限）" },
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

// ───────────────────────── 免費無限：本機 ACE-Step（透過電腦版的 /ace 轉接） ─────────────────────────

export function aceBase() {
  const s = getSettings();
  if (s.aceBase) return s.aceBase.replace(/\/+$/, "");
  const local = location.port === "47831" || !!(window.pywebview && window.pywebview.api);
  return local ? location.origin + "/ace" : "http://127.0.0.1:47831/ace";
}

async function aceFetch(path, body) {
  let r;
  try {
    r = await fetch(aceBase() + path, body === undefined ? {} : {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
  } catch {
    throw new Error(location.port === "47831"
      ? "連不到本機 AI，請確認「為你而唱」電腦版還開著。"
      : "公開網頁版無法連到你電腦上的本機 AI。請直接在電腦上用「為你而唱」電腦版製作；手機請連同一個 Wi-Fi，打開電腦版設定頁顯示的區網網址。");
  }
  let j = null;
  try { j = await r.json(); } catch { /* ignore */ }
  if (r.status === 503 && j && j.sfy) throw new Error(j.message);
  if (!r.ok) throw new Error("本機 AI 錯誤（" + r.status + "）：" + ((j && (j.detail || j.error || j.message)) || ""));
  return j;
}

export async function aceStatus() {
  const r = await fetch(aceBase().replace(/\/ace$/, "") + "/ace-status").catch(() => null);
  if (!r || !r.ok) return { reachable: false };
  return { reachable: true, ...(await r.json()) };
}

export async function startAce(v) {
  const lyrics = String(v.lyrics || "");
  const vocal = v.vocal === "m" ? ", male vocal" : v.vocal === "f" ? ", female vocal" : "";
  const style = String(v.styleTags || "");
  const j = await aceFetch("/release_task", {
    prompt: (/(fe)?male vocal/i.test(style) ? style : style + vocal).slice(0, 500),
    lyrics: lyrics.slice(0, 4000),
    vocal_language: "zh",
    audio_duration: Math.min(Number(v.length) || 120, 240),
    batch_size: 1,
    audio_format: "mp3",
    thinking: false,
    inference_steps: 8,
  });
  const id = j && j.data && j.data.task_id;
  if (!id) throw new Error("本機 AI 沒有回傳任務編號：" + JSON.stringify(j).slice(0, 200));
  return id;
}

export async function pollAce(taskId) {
  const j = await aceFetch("/query_result", { task_id_list: [taskId] });
  const item = (j && j.data && j.data[0]) || {};
  if (item.status === 0 || item.status === undefined) {
    const pct = String(item.progress_text || "").match(/(\d{1,3})%/);
    return { done: false, failed: null, status: "PENDING", progress: pct ? `本機 AI 作曲演唱中… ${pct[1]}%` : "" };
  }
  if (item.status === 2) {
    let msg = "";
    try { const r = JSON.parse(item.result || "{}"); msg = (Array.isArray(r) ? r[0] : r)?.error || ""; } catch { msg = item.result || ""; }
    return { done: false, failed: "本機 AI 產生失敗：" + (msg || item.error || "未知錯誤") };
  }
  let res = [];
  try { res = JSON.parse(item.result || "[]"); } catch { /* ignore */ }
  if (!Array.isArray(res)) res = [res];
  const tracks = res.filter((x) => x && x.file).map((x, i) => ({
    id: `ace-${taskId}-${i}`,
    audioUrl: aceBase() + x.file,
    duration: Number(x.metas && x.metas.duration) || 0,
  }));
  if (!tracks.length) return { done: false, failed: "本機 AI 沒有產生音檔" };
  return { done: true, failed: null, status: "SUCCESS", tracks };
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
