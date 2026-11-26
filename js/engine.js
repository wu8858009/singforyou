// 為你而唱 — 歌詞與歌曲產生引擎
// 歌詞：Claude API（有金鑰時）或內建範本；歌曲：sunoapi.org 相容的 AI 音樂 API。

import { getSettings } from "./store.js";

const SDK_URL = "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.8.0/+esm";

// 曲風：cat 分類顯示；synth = 本機合成（純音樂）用哪一種伴奏；粵語曲風會用粵語演唱
export const STYLE_CATS = ["華語熱門", "台灣在地・東方", "日韓・流行", "搖滾・嘻哈", "爵士・藍調・靈魂", "電子・舞曲", "世界音樂", "古典・影視・人聲", "節慶・特別"];
export const STYLES = [
  // 華語熱門
  { key: "ballad", cat: 0, name: "華語抒情", emoji: "🌙", tags: "Mandopop ballad, emotional, piano, strings, warm" },
  { key: "pop", cat: 0, name: "華語流行", emoji: "✨", tags: "Mandopop, upbeat pop, catchy chorus, modern production" },
  { key: "piano", cat: 0, name: "鋼琴抒情", emoji: "🎹", tags: "solo piano ballad, tender, cinematic, minimal" },
  { key: "folk", cat: 0, name: "民謠吉他", emoji: "🎸", tags: "acoustic folk, fingerpicked guitar, intimate, warm" },
  { key: "rnb", cat: 0, name: "R&B", emoji: "💜", tags: "Chinese R&B, smooth, groovy, soulful" },
  { key: "campus", cat: 0, name: "校園民歌", emoji: "🍃", tags: "1970s Taiwanese campus folk song, acoustic guitar, harmonica, innocent, nostalgic", synth: "folk" },
  { key: "oldies", cat: 0, name: "復古老歌", emoji: "📻", tags: "1980s Mandopop classic, retro, analog synth, saxophone, nostalgic", synth: "ballad" },
  { key: "indie", cat: 0, name: "獨立樂團", emoji: "🎒", tags: "Taiwanese indie band, jangly guitars, live drums, youthful, sincere", synth: "rock" },
  { key: "duet", cat: 0, name: "男女對唱", emoji: "👫", tags: "Mandopop duet, male and female vocals, romantic ballad, piano and strings", synth: "ballad" },
  // 台灣在地・東方
  { key: "taiwanese", cat: 1, name: "台語歌", emoji: "🌊", tags: "Taiwanese Hokkien ballad, nostalgic, heartfelt" },
  { key: "nakasi", cat: 1, name: "台語那卡西", emoji: "🪗", tags: "Taiwanese nakasi, enka style, accordion, electric organ, sentimental", synth: "ballad" },
  { key: "hakka", cat: 1, name: "客家山歌風", emoji: "⛰️", tags: "Hakka folk song style, bamboo flute, acoustic, pastoral, warm", synth: "folk" },
  { key: "indigenous", cat: 1, name: "原住民風", emoji: "🌄", tags: "Taiwanese indigenous folk style, group chant, hand percussion, open harmony, joyful", synth: "folk" },
  { key: "cantonese", cat: 1, name: "粵語流行", emoji: "🌃", tags: "Cantopop ballad, Cantonese vocals, Hong Kong 90s, piano, strings", synth: "ballad" },
  { key: "guofeng", cat: 1, name: "古風中國風", emoji: "🏮", tags: "Chinese traditional style, guzheng, erhu, poetic, cinematic" },
  { key: "guofeng_rock", cat: 1, name: "國風搖滾", emoji: "🐉", tags: "Chinese folk rock, erhu and electric guitar, pipa, powerful drums", synth: "rock" },
  // 日韓・流行
  { key: "jpop", cat: 2, name: "日系流行", emoji: "🌸", tags: "J-pop, bright, energetic, piano and guitar, emotional chorus", synth: "pop" },
  { key: "anime", cat: 2, name: "動漫主題曲", emoji: "🗾", tags: "anime opening theme, fast tempo, soaring vocals, electric guitar, epic", synth: "rock" },
  { key: "citypop", cat: 2, name: "City Pop", emoji: "🌆", tags: "80s Japanese city pop, funky bass, electric piano, groovy, nostalgic", synth: "pop" },
  { key: "kpop", cat: 2, name: "韓流 K-Pop", emoji: "💫", tags: "K-pop, polished production, dance beat, catchy hook, synth bass", synth: "edm" },
  { key: "kballad", cat: 2, name: "韓劇 OST", emoji: "🎞️", tags: "Korean drama OST ballad, emotional, piano, strings, building climax", synth: "ballad" },
  { key: "synthpop", cat: 2, name: "80 年代合成器", emoji: "🕹️", tags: "80s synthpop, retro synthesizers, gated drums, dreamy", synth: "edm" },
  { key: "lofi", cat: 2, name: "Lo-fi 慵懶", emoji: "☕", tags: "lo-fi pop, chill, mellow beat, warm vinyl texture, soft vocals", synth: "jazz" },
  { key: "dreampop", cat: 2, name: "夢幻流行", emoji: "🫧", tags: "dream pop, reverb guitars, airy vocals, ethereal, soft", synth: "piano" },
  // 搖滾・嘻哈
  { key: "rock", cat: 3, name: "搖滾", emoji: "🔥", tags: "Mandarin pop rock, electric guitar, drums, anthemic" },
  { key: "altrock", cat: 3, name: "另類搖滾", emoji: "🌀", tags: "alternative rock, distorted guitars, dynamic, emotional", synth: "rock" },
  { key: "punk", cat: 3, name: "龐克", emoji: "⚡", tags: "pop punk, fast, energetic, power chords, shout-along chorus", synth: "rock" },
  { key: "metal", cat: 3, name: "金屬", emoji: "🤘", tags: "melodic metal, heavy guitars, double kick drums, powerful", synth: "rock" },
  { key: "rap", cat: 3, name: "嘻哈饒舌", emoji: "🎤", tags: "Chinese hip hop, rap verses, melodic hook, boom bap" },
  { key: "trap", cat: 3, name: "Trap", emoji: "🔊", tags: "trap, 808 bass, hi-hat rolls, melodic rap, modern", synth: "edm" },
  { key: "reggae", cat: 3, name: "雷鬼", emoji: "🌴", tags: "reggae, offbeat guitar skank, laid-back groove, sunny", synth: "folk" },
  // 爵士・藍調・靈魂
  { key: "jazz", cat: 4, name: "爵士", emoji: "🎷", tags: "smooth jazz, soft brushes, upright bass, romantic" },
  { key: "swing", cat: 4, name: "搖擺爵士", emoji: "🎩", tags: "swing jazz, big band, brass section, upbeat, playful", synth: "jazz" },
  { key: "bossa", cat: 4, name: "巴薩諾瓦", emoji: "🍹", tags: "bossa nova, nylon guitar, soft percussion, gentle, breezy", synth: "jazz" },
  { key: "blues", cat: 4, name: "藍調", emoji: "🎺", tags: "blues, slide guitar, shuffle rhythm, soulful", synth: "jazz" },
  { key: "soul", cat: 4, name: "靈魂樂", emoji: "🕯️", tags: "classic soul, Motown, horns, warm vocals, groovy", synth: "rnb" },
  { key: "funk", cat: 4, name: "放克", emoji: "🕺", tags: "funk, slap bass, wah guitar, tight groove, horns", synth: "rnb" },
  { key: "gospel", cat: 4, name: "福音詩歌", emoji: "⛪", tags: "gospel, choir, organ, uplifting, hopeful", synth: "ballad" },
  // 電子・舞曲
  { key: "edm", cat: 5, name: "電子舞曲", emoji: "🎧", tags: "EDM pop, dance, synth, energetic drop" },
  { key: "house", cat: 5, name: "House", emoji: "🏠", tags: "deep house, four on the floor, warm bass, chill groove", synth: "edm" },
  { key: "futurebass", cat: 5, name: "Future Bass", emoji: "🌈", tags: "future bass, lush supersaw chords, bright, emotional drop", synth: "edm" },
  { key: "disco", cat: 5, name: "迪斯可", emoji: "🪩", tags: "disco, funky bass, strings, four on the floor, joyful", synth: "edm" },
  { key: "chiptune", cat: 5, name: "8-bit 電玩", emoji: "👾", tags: "chiptune, 8-bit video game music, playful, bright", synth: "edm" },
  // 世界音樂
  { key: "latin", cat: 6, name: "拉丁", emoji: "💃", tags: "Latin pop, reggaeton rhythm, Spanish guitar, festive", synth: "pop" },
  { key: "tango", cat: 6, name: "探戈", emoji: "🌹", tags: "tango, bandoneon, violin, dramatic, passionate", synth: "jazz" },
  { key: "flamenco", cat: 6, name: "佛朗明哥", emoji: "🔴", tags: "flamenco guitar, handclaps, passionate, Spanish", synth: "folk" },
  { key: "country", cat: 6, name: "鄉村", emoji: "🤠", tags: "country pop, acoustic guitar, banjo, warm storytelling", synth: "folk" },
  { key: "celtic", cat: 6, name: "愛爾蘭風", emoji: "☘️", tags: "Celtic folk, tin whistle, fiddle, uplifting", synth: "folk" },
  { key: "hawaiian", cat: 6, name: "夏威夷", emoji: "🌺", tags: "Hawaiian, ukulele, slack key guitar, relaxed, sunny", synth: "kids" },
  { key: "french", cat: 6, name: "法式香頌", emoji: "🥐", tags: "French chanson, accordion, waltz, romantic, Parisian", synth: "jazz" },
  // 古典・影視・人聲
  { key: "orchestral", cat: 7, name: "交響管弦", emoji: "🎻", tags: "orchestral pop, full orchestra, strings and brass, grand", synth: "piano" },
  { key: "cinematic", cat: 7, name: "電影配樂", emoji: "🎬", tags: "cinematic ballad, epic strings, piano, emotional build", synth: "piano" },
  { key: "musical", cat: 7, name: "音樂劇", emoji: "🎭", tags: "Broadway musical theatre, piano, orchestra, theatrical vocals", synth: "piano" },
  { key: "crossover", cat: 7, name: "美聲跨界", emoji: "🎼", tags: "classical crossover, operatic vocals, orchestra, majestic", synth: "piano" },
  { key: "acappella", cat: 7, name: "無伴奏人聲", emoji: "🗣️", tags: "a cappella, vocal harmonies, beatbox, choir, no instruments", synth: "piano" },
  { key: "chamber", cat: 7, name: "弦樂室內樂", emoji: "🪕", tags: "string quartet, chamber pop, cello and violin, elegant", synth: "piano" },
  // 節慶・特別
  { key: "kids", cat: 8, name: "童趣兒歌", emoji: "🧸", tags: "children's song, cheerful, playful, simple melody, ukulele" },
  { key: "lullaby", cat: 8, name: "搖籃曲", emoji: "🍼", tags: "lullaby, music box, soft, gentle, soothing", synth: "piano" },
  { key: "weddingsong", cat: 8, name: "婚禮浪漫", emoji: "💒", tags: "romantic wedding song, strings, piano, bells, heartfelt", synth: "ballad" },
  { key: "christmas", cat: 8, name: "聖誕歌", emoji: "🎄", tags: "Christmas pop, sleigh bells, warm, festive", synth: "pop" },
  { key: "newyear", cat: 8, name: "新年賀歲", emoji: "🧧", tags: "Chinese New Year song, festive, gongs, suona, cheerful", synth: "guofeng" },
  { key: "birthdayparty", cat: 8, name: "生日派對", emoji: "🎉", tags: "happy birthday party pop, upbeat, claps, celebratory", synth: "pop" },
  { key: "march", cat: 8, name: "勵志進行曲", emoji: "🏁", tags: "inspirational anthem, marching drums, brass, uplifting", synth: "rock" },
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
// 本機合成只有 12 種伴奏：新曲風對應到最接近的那一種
export const synthStyle = (k) => { const s = styleByKey(k); return s.synth || s.key; };
// AI 演唱語言：粵語曲風用 yue，其餘華語
export const vocalLang = (tags) => /Cantonese|Cantopop/i.test(tags || "") ? "yue" : "zh";
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
- 一律使用台灣繁體中文與台灣慣用語（台語歌則用台語漢字，必要時可混華語；粵語曲風用粵語口語寫詞，例如「係」「嘅」「唔」「佢」）。
- 結構：[Intro]（可省略）、[Verse 1]、[Pre-Chorus]、[Chorus]、[Verse 2]、[Pre-Chorus]、[Chorus]、[Bridge]、[Final Chorus]、[Outro]。段落標籤用英文方括號，獨立一行。
- 每句 6–10 字（AI 歌手每句 6–10 字最不會跳句），同一段各句字數接近，好唱、押韻自然（副歌務必押韻），副歌要有一句容易記住、重複出現的主題句。
- 這是一首「送給別人的禮物歌」：用送禮者第一人稱「我」對收禮人說話，從頭到尾視角一致；收禮人是女生時用「妳」，男生用「你」。
- 語氣要符合兩人的關係：只有情侶／夫妻才寫戀愛的句子，對家人、朋友、長輩要用親情或友情的語氣。
- 特別注意：收禮人不是送禮者的另一半時，「婚禮」要寫成送禮者祝福對方新婚（例如「新婚快樂、祝你們白頭偕老」），絕對不能寫成送禮者自己要和對方結婚、說「我願意」；「我愛你」「週年紀念」也要寫成友情或親情，不能有告白或戀愛的內容。
- 每一句都是完整、通順、能唱的句子，不要斷在半句；主歌各段內容不要重複。
- 有送禮者署名時，在 [Outro] 自然帶出「這首歌是（署名）送給你／妳的」或「（署名）把這首歌送給你／妳」；署名後面不能加逗號（「阿哲，把這首歌送給你」會變成在呼喚阿哲，意思顛倒）。
- 歌曲主題必須緊扣「場合」：例如生日要唱生日快樂與許願、母親節要感謝媽媽、道歉要誠心說對不起、畢業要祝福前程；歌名也要呼應場合。
- 把使用者提供的名字、回憶、細節、想說的話具體寫進歌裡，不要空泛套話；名字至少出現在副歌一次。
- 歌詞內不要加註解、括號說明、和弦或表情符號。
- style 欄位用英文，描述曲風、樂器、情緒、人聲（例如 female vocal / male vocal），不要包含任何真實歌手或樂團名字。`;

const ANGLES = [
  "從一個具體的日常小畫面開始寫起", "用季節或天氣的變化做比喻", "用時間流逝（從過去到現在到未來）的順序",
  "像寫一封信一樣娓娓道來", "從對方的笑容或聲音切入", "用旅行或路途做比喻",
  "用光、星星或燈火的意象", "從一件只有你們知道的小事說起", "輕快俏皮、帶一點幽默的口吻",
  "用一問一答的方式安排主歌",
];

function briefFromOrder(o) {
  const st = styleByKey(o.style);
  const oc = occasionByKey(o.occasion);
  const lines = [
    `收禮對象：${o.recipient}（${o.relation || "關係未指定"}；性別：${isFemale(o) ? "女生，用「妳」" : o.gender === "m" || /爸|老公|先生|男朋友|兒子|哥|弟|爺爺|外公|阿公/.test(o.relation || "") ? "男生，用「你」" : "未指定，用「你」"}）`,
    `送禮者署名：${o.sender || "（未填）"}`,
    ...(parseWeddingDate(o.weddingDate) && ["wedding", "anniversary"].includes(o.occasion) ? (() => {
      const w = parseWeddingDate(o.weddingDate);
      return [`結婚日期：${w.text}${w.zhYears ? `（到今天結婚滿 ${w.years} 年）` : ""}——一定要在歌詞裡唱出這個日期${w.zhYears && o.occasion === "anniversary" ? "和結婚的年數" : ""}，日期與數字一律寫成國字（例如「${w.zh}」${w.zhYears ? `、「${w.zhYears}年」` : ""}），不要用阿拉伯數字`];
    })() : []),
    `場合：${oc.name}（主題重點：${relGroupOf(o.relation, oc.key) !== "lover" && PLATONIC_THEME[oc.key] ? PLATONIC_THEME[oc.key] : (OCC_LYRICS[oc.key] || {}).theme || oc.name}）——整首歌一定要圍繞這個場合，副歌要直接唱出這個場合的祝福或心意`,
    `兩人關係：${relGroupOf(o.relation, oc.key) === "lover" ? "情侶／夫妻（可以寫愛情）" : "不是情侶（只能寫友情、親情或祝福，不能寫成愛情）"}`,
    `曲風：${st.name}（參考英文風格：${st.tags}）`,
    `人聲：${o.vocal === "m" ? "男聲" : o.vocal === "f" ? "女聲" : "不限"}`,
    `整體情緒：${o.mood || "溫暖感動"}`,
    `歌曲長度目標：約 ${Math.round((o.length || 180) / 60)} 分鐘——歌詞總共最多 ${maxLinesFor(o.length)} 句（不含段落標籤），寧可少寫段落也不要塞太多，否則 AI 唱不完會跳句`,
    "",
    `對方是什麼樣的人：${o.q_person || "（未填）"}`,
    `你們最難忘的回憶：${o.q_memory || "（未填）"}`,
    `對方的小習慣、口頭禪或只有你們懂的事：${o.q_detail || "（未填）"}`,
    `最想對他／她說的話：${o.q_message || "（未填）"}`,
    `一定要放進歌裡的字詞：${o.q_words || "（無）"}`,
  ];
  lines.push("", `這次的寫作切入角度（讓每次的歌詞都不一樣）：${pickOne(ANGLES)}；用全新的意象與句子，不要套用常見的固定句型。`);
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
    lyrics: fitLyrics(String(data.lyrics || "").trim(), order.length),
    style: String(data.style || styleByKey(order.style).tags).slice(0, 900),
    source: "claude",
  };
}

// 每個場合專屬的歌詞段落（{n} = 名字）。範本詞與 Claude 作詞都會依此緊扣場合主題。
export const OCC_LYRICS = {
  birthday: {
    title: "{n}，生日快樂", theme: "生日：祝福對方生日快樂、許願、吹蠟燭、又長大一歲、新的一年",
    verse2: ["蛋糕上的燭光輕輕搖晃", "閉上眼睛許下你的願望", "又長大了一歲的你", "笑起來還是那麼閃亮"],
    pre: ["今天全世界都為你歌唱", "把祝福放在你身旁"],
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
    verse2: ["小時候坐在你的肩膀", "以為能看見整個世界", "你總是話不多", "卻把愛藏在小事裡"],
    pre: ["你的背影變得有點彎", "我卻還沒好好說謝謝"],
    chorus: ["{n}，父親節快樂", "你的肩膀是我的依靠", "辛苦了那麼多年", "換我讓你驕傲"],
    bridge: ["你沒說出口的愛", "我現在都懂了"],
    outro: "{n}，謝謝你",
  },
  thanks: {
    title: "謝謝你", theme: "感謝：感恩對方的付出、陪伴、在困難時伸出手",
    verse2: ["在我最難過的時候", "是你陪我度過", "你給的每一份溫暖", "我都好好收著"],
    pre: ["有些話一直想說", "今天終於說出口"],
    chorus: ["{n}，真的謝謝你", "謝謝你走進我生命裡", "你給我的每一份好", "我會一輩子記得"],
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
    ["吵架後總是你先笑", "讓我知道什麼叫珍惜"],
    ["深夜一起吃的那碗麵", "是我記得最暖的味道"],
    ["你靠在我肩上睡著", "我連動都捨不得動"],
    ["一起去過的那片海", "浪聲裡都是你的笑"],
  ],
  parent: [
    ["小時候發燒的那個夜裡", "你整晚守在我的床邊"],
    ["每天早上桌上的早餐", "是我吃過最好的味道"],
    ["你騎車載我去上學", "我在後座慢慢長大"],
    ["電話裡你總說你很好", "叫我千萬別替你擔心"],
    ["出門前你總要問一句", "外套有沒有記得帶"],
    ["你教我寫的第一個字", "我到現在還記得"],
    ["每次回家你都在門口", "笑著等我進門"],
  ],
  child: [
    ["你第一次叫我的那天", "我開心得好久睡不著"],
    ["牽著你的小手去上學", "看你回頭對我揮手"],
    ["你睡著時安靜的臉", "是我看不膩的風景"],
    ["你總有問不完的為什麼", "讓每天都變得新鮮"],
    ["你跌倒了自己爬起來", "我在旁邊偷偷驕傲"],
    ["看著你一天天長大", "是我最幸福的事"],
  ],
  family: [
    ["小時候搶同一個玩具", "吵完了又一起笑"],
    ["長大後各自忙碌", "見面還是像從前一樣"],
    ["那些一起過的年", "熱鬧又溫暖"],
    ["你嘴上從來不說", "心裡卻最在乎家人"],
    ["小時候躲在被窩說秘密", "說到天亮都不累"],
    ["你總是讓著我", "把最好的留給我"],
  ],
  friend: [
    ["你是隨傳隨到的朋友", "從來不曾缺席"],
    ["你總能用一句話", "讓我笑得停不下來"],
    ["那些聊到天亮的晚上", "是我最珍貴的時光"],
    ["我最低潮的那段日子", "是你陪我走了過來"],
    ["一起翹過的那堂課", "現在想起來還會笑"],
    ["不管多久沒聯絡", "見面還是像昨天"],
    ["你分享的每一首歌", "都成了我們的回憶"],
  ],
};
// 和場合主歌二重複的素材要避開
const VERSE1_SKIP = { mother: /早餐|外套/, father: /騎車/, birthday: /^$/, missyou: /^$/ };
// 情侶以外的對象（朋友、家人、長輩、同事…）：這些場合改用「祝福／情誼」版本，
// 例如婚禮是祝福對方新婚，而不是唱成送禮人自己要和對方結婚。
const OCC_LYRICS_PLATONIC = {
  wedding: {
    title: "{n}，新婚快樂",
    verse2: ["紅毯的盡頭有人等你", "陽光灑在你幸福的臉上", "看你交換戒指的那一刻", "我的眼眶也跟著發燙"],
    pre: ["從今以後有人陪你", "走過每一個晴天雨天"],
    chorus: ["{n}，新婚快樂", "願你們牽手到白頭", "往後的日子甜甜蜜蜜", "幸福永遠在你身邊"],
    bridge: ["不管你走到哪裡", "我永遠是你的後盾"],
    outro: "{n}，祝你幸福",
  },
  love: {
    title: "{n}，有你真好",
    verse2: ["有些話平常說不出口", "都藏在每一次的關心", "你是我生命裡的寶藏", "比什麼都更重要"],
    pre: ["今天我想大聲說", "你對我有多重要"],
    chorus: ["{n}，謝謝你", "這份情誼比什麼都珍貴", "謝謝你一直在我身邊", "陪我笑也陪我哭"],
    bridge: ["謝謝你一直在我身邊", "你是我最重要的人"],
    outro: "{n}，有你真好",
  },
  anniversary: {
    title: "又一年的我們",
    verse2: ["認識你又過了一年", "我們一起笑過也哭過", "這些年的點點滴滴", "都是最珍貴的回憶"],
    pre: ["數著一起走過的日子", "每一天都值得紀念"],
    chorus: ["{n}，謝謝你", "陪我又走過了一年", "往後的每一個春夏秋冬", "我們都要一起過"],
    bridge: ["不管時間怎麼走", "我們的情誼不會變"],
    outro: "{n}，下一年也請多指教",
  },
};

const PLATONIC_THEME = {
  wedding: "婚禮祝福：送禮者祝福收禮人新婚快樂、祝新人白頭偕老；送禮者是賓客／親友，不是結婚的人",
  love: "表達珍惜與感謝：這份友情或親情有多重要，不是告白",
  anniversary: "認識或相伴的週年：一起走過的友情或親情時光",
};

// 情侶以外的對象，部分場合的橋段改成不帶戀愛語氣的版本
const BRIDGE_NON_LOVER = {
  birthday: ["願這個世界溫柔待你", "每天都有人把你放心上"],
  love: ["謝謝你一直在我身邊", "你是我最重要的人"],
  missyou: ["等到再見面的那一天", "我們再好好聊個痛快"],
};

// 每個場合的替換段落：每次產生時各段落從「原版＋這些版本」隨機挑，所以每次歌詞都不一樣
const OCC_ALT = {
  birthday: [
    { title: "給{n}的生日歌",
      verse2: ["今天的風特別溫柔", "陽光也替你打扮", "把煩惱先放一邊", "今天你最大"],
      pre: ["點亮蠟燭的這一刻", "所有星星都為你閃耀"],
      chorus: ["{n}，生日快樂", "願你笑容永遠不打烊", "想要的都會來到", "平安喜樂每一年"],
      bridge: ["一年又一年", "我都想陪你慶祝"],
      outro: "{n}，生日快樂，天天開心" },
    { title: "又長大一歲的{n}",
      verse2: ["派對的音樂響起來", "大家都為你舉杯", "這一天專屬於你", "就盡情地笑吧"],
      pre: ["把願望大聲說出口", "老天一定聽得到"],
      chorus: ["{n}，生日快樂", "新的一歲更加閃亮", "所有美好都向你靠近", "每一天都被溫柔對待"],
      bridge: ["不管你幾歲", "在我心裡都一樣好"],
      outro: "{n}，祝你生日快樂" },
  ],
  anniversary: [
    { title: "愛你的每一年",
      verse2: ["還記得第一次約會", "你穿著那件白色上衣", "一年一年過去了", "你還是讓我心動"],
      pre: ["時間走得好快", "愛卻一點都沒少"],
      chorus: ["{n}，週年快樂", "謝謝你一直在我身邊", "以後的每一年", "我都要和你一起數"],
      bridge: ["就算有一天白了頭", "我還是會牽著你"],
      outro: "{n}，謝謝你，週年快樂" },
    { title: "{n}，又一年",
      verse2: ["從陌生到熟悉", "從兩個人變成我們", "一起走過的路", "每一步都算數"],
      pre: ["把這一年的幸福", "寫成一首歌送給你"],
      chorus: ["{n}，週年快樂", "有你的日子都是晴天", "未來還有好多年", "我們慢慢走"],
      bridge: ["謝謝你選擇了我", "這是我最大的幸運"],
      outro: "{n}，還要一起走很久" },
  ],
  love: [
    { title: "只想對{n}說",
      verse2: ["在人群裡一眼就看見你", "從此再也移不開視線", "想著你入睡", "想著你醒來"],
      pre: ["這份心意好滿", "滿到快要說出口"],
      chorus: ["{n}，我愛你", "這句話只想對你說", "往後的每一天", "都讓我好好愛你"],
      bridge: ["如果你願意", "我會一直在你身旁"],
      outro: "{n}，我好愛你" },
    { title: "{n}，你是我的唯一",
      verse2: ["你一個小小的微笑", "就能照亮我一整天", "有你在的地方", "就是我想去的地方"],
      pre: ["我的心早就決定", "要把最好的給你"],
      chorus: ["{n}，我愛你", "你是我心裡的唯一", "不管晴天還是下雨", "我都想和你在一起"],
      bridge: ["給我一個機會", "讓我守護你"],
      outro: "{n}，你是我的唯一" },
  ],
  wedding: [
    { title: "牽你的手",
      verse2: ["教堂的鐘聲響起", "你一步步走向我", "這一刻的你", "是我見過最美的風景"],
      pre: ["在大家的見證下", "我把一生交給你"],
      chorus: ["{n}，從今天開始", "我們就是一家人", "不管未來有多遠", "我都會牽著你的手"],
      bridge: ["謝謝你願意走向我", "這是我一生的幸運"],
      outro: "{n}，我會愛你一輩子" },
    { title: "{n}，餘生請多指教",
      verse2: ["兜兜轉轉這麼多年", "原來你就是那個人", "今天穿上禮服", "我們終於走到這一天"],
      pre: ["戴上戒指的那一刻", "我的心好踏實"],
      chorus: ["{n}，餘生請多指教", "柴米油鹽我們一起嘗", "就算白髮蒼蒼", "還是要牽著你的手"],
      bridge: ["往後的每一個早晨", "我都想第一個看見你"],
      outro: "{n}，餘生請多指教" },
  ],
  mother: [
    { title: "媽媽的味道",
      verse2: ["廚房裡忙碌的背影", "是我最熟悉的畫面", "你總把最好的留給我", "自己卻吃得最少"],
      pre: ["那麼多年的付出", "我都看在眼裡"],
      chorus: ["{n}，母親節快樂", "你是我最溫暖的家", "願你健康又快樂", "換我把你捧在手心"],
      bridge: ["你的白髮又多了幾根", "我想陪你慢慢變老"],
      outro: "{n}，謝謝你，我愛你" },
    { title: "{n}，辛苦了",
      verse2: ["你總說自己不累", "卻在沙發上睡著", "你總說什麼都不缺", "只要我們過得好"],
      pre: ["今天換我來說", "你是我的驕傲"],
      chorus: ["{n}，母親節快樂", "謝謝你把我養大", "以後的日子", "換我做你的依靠"],
      bridge: ["世界上最好的人", "是我的媽媽"],
      outro: "{n}，母親節快樂" },
  ],
  father: [
    { title: "{n}，謝謝你",
      verse2: ["你很少說辛苦", "總是一個人扛下來", "下班回家的腳步", "是我最安心的聲音"],
      pre: ["那些你沒說的話", "我現在都聽懂了"],
      chorus: ["{n}，父親節快樂", "謝謝你為家撐起一片天", "換我陪你喝杯茶", "聽你說說從前"],
      bridge: ["你教會我勇敢", "也教會我溫柔"],
      outro: "{n}，父親節快樂" },
    { title: "我的超人爸爸",
      verse2: ["小時候你什麼都會修", "是我心中的超人", "現在換我長大了", "也想成為你的依靠"],
      pre: ["你的頭髮漸漸白了", "我卻還沒說愛你"],
      chorus: ["{n}，父親節快樂", "你永遠是我的超人", "願你平安又健康", "笑容常常掛臉上"],
      bridge: ["有你在的地方", "就是我的家"],
      outro: "{n}，我愛你" },
  ],
  thanks: [
    { title: "有你真好",
      verse2: ["那天我差點放棄", "是你拉了我一把", "你說沒什麼大不了", "我卻記在心裡好久"],
      pre: ["一句謝謝不夠", "就用一首歌來說"],
      chorus: ["{n}，謝謝你", "謝謝你一直都在", "你的好我都知道", "會一直放在心上"],
      bridge: ["換我在你需要的時候", "第一個出現"],
      outro: "{n}，有你真好" },
    { title: "{n}，謝謝你的溫暖",
      verse2: ["你從不要求回報", "總是默默付出", "像冬天裡的陽光", "照亮我的路"],
      pre: ["今天我想好好說", "這份感謝有多深"],
      chorus: ["{n}，謝謝你", "你是我生命裡的光", "這份溫暖我會傳下去", "像你對我一樣"],
      bridge: ["遇見你", "是我最幸運的事"],
      outro: "{n}，真心謝謝你" },
  ],
  missyou: [
    { title: "想你的時候",
      verse2: ["手機裡的合照", "我一張一張地看", "想起你說話的樣子", "忍不住笑了出來"],
      pre: ["時間好像走得好慢", "每一天都在想你"],
      chorus: ["{n}，好想你", "想見你一面就好", "不管你在哪裡", "我都在這裡等你"],
      bridge: ["倒數著見面的日子", "一天一天地過"],
      outro: "{n}，等你回來" },
    { title: "{n}，你好嗎",
      verse2: ["城市的燈都亮了", "我一個人走在路上", "經過那家常去的店", "又想起了你"],
      pre: ["想問問你好不好", "有沒有好好吃飯"],
      chorus: ["{n}，我好想你", "想念我們一起的時光", "就算隔著好遠", "也要把思念寄給你"],
      bridge: ["抬頭看同一個月亮", "就好像你在身旁"],
      outro: "{n}，我好想你" },
  ],
  sorry: [
    { title: "{n}，原諒我好嗎",
      verse2: ["那天的我太衝動", "說了不該說的話", "看你轉身離開", "我的心好痛"],
      pre: ["我知道說再多", "也比不上真心改變"],
      chorus: ["{n}，對不起", "我真的知道錯了", "給我一個機會", "讓我證明給你看"],
      bridge: ["我會改掉壞脾氣", "好好聽你說話"],
      outro: "{n}，原諒我好嗎" },
    { title: "說聲對不起",
      verse2: ["是我太自以為是", "忽略了你的感受", "你默默忍了好久", "我卻都沒發現"],
      pre: ["現在我終於明白", "你有多重要"],
      chorus: ["{n}，對不起", "讓你難過是我不好", "以後的每一天", "我會更珍惜你"],
      bridge: ["只要你還願意", "我們重新開始"],
      outro: "{n}，對不起" },
  ],
  graduation: [
    { title: "{n}，畢業快樂",
      verse2: ["教室裡的笑聲", "操場上的汗水", "這些青春的日子", "都會是最美的回憶"],
      pre: ["今天穿上學士服", "準備飛向遠方"],
      chorus: ["{n}，畢業快樂", "未來的路由你去闖", "跌倒了也不要怕", "我永遠是你的後盾"],
      bridge: ["願你保有初心", "一直勇敢下去"],
      outro: "{n}，畢業快樂，前程似錦" },
    { title: "下一站，夢想",
      verse2: ["那些熬夜的報告", "那些考前的緊張", "都已經過去了", "你做得很好"],
      pre: ["新的旅程要開始", "世界在等你"],
      chorus: ["{n}，恭喜你畢業", "帶著笑容向前走", "不管夢想有多遠", "你一定能到達"],
      bridge: ["想家的時候", "記得回來看看"],
      outro: "{n}，恭喜畢業" },
  ],
  memorial: [
    { title: "想念{n}",
      verse2: ["你常坐的那張椅子", "好像還留著溫度", "你說過的每一句話", "我都還記得清楚"],
      pre: ["風吹過的時候", "是不是你在說話"],
      chorus: ["{n}，我好想你", "謝謝你曾經來過", "你給的那些溫暖", "會一直陪著我"],
      bridge: ["在另一個地方", "願你平安快樂"],
      outro: "{n}，我們都想你" },
    { title: "{n}，謝謝你來過",
      verse2: ["翻開舊舊的相簿", "每一張都有你的笑", "那些平凡的日子", "現在想起來好珍貴"],
      pre: ["雖然看不見你了", "愛卻沒有離開"],
      chorus: ["{n}，謝謝你", "你一直都在我心裡", "我會帶著你的愛", "勇敢走下去"],
      bridge: ["等到很久很久以後", "我們會再相見"],
      outro: "{n}，謝謝你來過" },
  ],
  milestone: [
    { title: "{n}，你做到了",
      verse2: ["多少個夜晚獨自努力", "沒有人看見的辛苦", "終於等到這一天", "你做到了"],
      pre: ["這不是終點", "而是新的開始"],
      chorus: ["{n}，恭喜你", "你的努力都有了回報", "繼續往前走吧", "更好的還在後面"],
      bridge: ["我一直相信你", "你一定可以"],
      outro: "{n}，你做到了" },
    { title: "為{n}鼓掌",
      verse2: ["還記得剛開始的時候", "你也曾經懷疑自己", "一步一步走過來", "今天終於發光"],
      pre: ["掌聲為你響起", "這是你應得的"],
      chorus: ["{n}，恭喜你", "這一刻值得好好慶祝", "未來的每一步", "我都會陪你走"],
      bridge: ["累了就休息一下", "我會在這裡等你"],
      outro: "{n}，恭喜你，為你驕傲" },
  ],
};
// 情侶以外對象的祝福／情誼版本，也各多一套
const PLATONIC_ALT = {
  wedding: [
    { title: "祝{n}幸福",
      verse2: ["看你穿上禮服的樣子", "我真心替你開心", "那個對的人終於出現", "要好好幸福下去"],
      pre: ["今天我舉起酒杯", "把祝福送給你"],
      chorus: ["{n}，新婚快樂", "祝你們永浴愛河", "往後的每一天", "都被幸福包圍"],
      bridge: ["累了記得回來", "我們永遠都在"],
      outro: "{n}，新婚快樂，百年好合" },
  ],
  love: [
    { title: "{n}，你很重要",
      verse2: ["平常不太會說", "但你一直都知道", "不管發生什麼事", "我都站在你這邊"],
      pre: ["今天想認真地說", "謝謝你出現"],
      chorus: ["{n}，謝謝你", "你是我最重要的人", "這份情誼", "我會好好珍惜"],
      bridge: ["不管走到哪裡", "我們都不會走散"],
      outro: "{n}，你很重要" },
  ],
  anniversary: [
    { title: "一起走過的日子",
      verse2: ["從認識的那天起", "我們就沒分開過", "一起哭一起笑", "一起長大"],
      pre: ["又是一年過去", "謝謝你還在"],
      chorus: ["{n}，謝謝你", "這些年有你真好", "未來的日子", "我們也要一起走"],
      bridge: ["時間會改變很多", "我們卻一直沒變"],
      outro: "{n}，未來也請多指教" },
  ],
};
// 情侶以外的對象：橋段也多一套
const BRIDGE_NON_LOVER_ALT = {
  birthday: [["不管你幾歲", "我都會為你慶祝"], ["願你的每個明天", "都比今天更快樂"]],
  love: [["不管走到哪裡", "我們都不會走散"]],
  missyou: [["等你回來的那天", "我們再去老地方"]],
};
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── 結婚年月日：轉成國字讓 AI 唱得出來（數字容易被唸成英文或亂唸） ──
const ZH_D = "〇一二三四五六七八九";
function zhNum(n) { // 1–99
  if (n < 10) return ZH_D[n];
  const t = Math.floor(n / 10), u = n % 10;
  return (t === 1 ? "" : ZH_D[t]) + "十" + (u ? ZH_D[u] : "");
}
export function parseWeddingDate(s) {
  const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const now = new Date();
  let years = now.getFullYear() - y;
  if (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)) years--;
  return {
    y, mo, d, years,
    zh: [...String(y)].map((c) => ZH_D[+c]).join("") + "年" + zhNum(mo) + "月" + zhNum(d) + "日",
    zhYears: years >= 1 && years < 100 ? zhNum(years) : "",
    text: `${y}年${mo}月${d}日`,
  };
}
// 依場合與關係產生唱日期的兩到四句
function weddingDateLines(o, lover) {
  const w = parseWeddingDate(o.weddingDate);
  if (!w) return [];
  if (o.occasion === "wedding") {
    return lover ? [w.zh, "是我們許下一生的日子"] : [w.zh, "是你走向幸福的日子"];
  }
  if (o.occasion === "anniversary") {
    if (w.years < 0) return [w.zh, lover ? "是我們最重要的日子" : "是你最重要的日子"];
    const head = lover ? [w.zh, "是我們結婚的那一天"] : [w.zh, "是你結婚的那一天"];
    if (!w.zhYears) return head;
    return [...head, `一轉眼已經${w.zhYears}年`, lover ? "我對你的愛只多不少" : "祝你們永遠幸福"];
  }
  return [];
}

// ── 歌詞長度要配合歌曲秒數：太多 AI 唱不完就會跳句 ──
export const maxLinesFor = (sec) => ({ 120: 18, 180: 28, 240: 36 })[Number(sec) || 180] || Math.round(((Number(sec) || 180) - 26) / 5.2);
function parseSections(lyrics) {
  const out = []; let cur = { tag: "", lines: [] };
  for (const raw of String(lyrics || "").split("\n")) {
    const l = raw.trim();
    const m = l.match(/^\[(.+?)\]$/);
    if (m) { if (cur.tag || cur.lines.length) out.push(cur); cur = { tag: m[1], lines: [] }; }
    else if (l) cur.lines.push(l);
  }
  if (cur.tag || cur.lines.length) out.push(cur);
  return out;
}
const joinSections = (secs) => secs.map((s) => (s.tag ? `[${s.tag}]\n` : "") + s.lines.join("\n")).join("\n\n");
// 估計唱完需要幾秒：每個字約 0.42 秒、每句換氣 0.8 秒、每段間奏 3 秒、前奏＋尾奏 14 秒
export function singSeconds(lyrics) {
  let t = 14;
  for (const s of parseSections(lyrics)) {
    t += 3;
    for (const l of s.lines) t += 0.8 + l.replace(/[^\p{L}\p{N}]/gu, "").length * 0.42;
  }
  return Math.round(t);
}
// 超過歌曲長度時，依序拿掉最不重要的部分，直到唱得完
export function fitLyrics(lyrics, seconds) {
  const sec = Number(seconds) || 180;
  let secs = parseSections(lyrics);
  if (!secs.length || singSeconds(lyrics) <= sec) return lyrics;
  const is = (s, re) => re.test(s.tag);
  const CH = /chorus|副歌/i, PRE = /pre-?chorus|導歌/i, V2 = /verse\s*2|主歌二/i, V1 = /verse(\s*1)?$|主歌一/i, BR = /bridge|橋段/i, INTRO = /intro|前奏/i;
  const chorusIdx = () => secs.map((s, i) => (is(s, CH) && !is(s, PRE) ? i : -1)).filter((i) => i >= 0);
  const steps = [
    () => { secs = secs.filter((s) => !(is(s, INTRO) && s.lines.length)); },
    () => { const p = secs.map((s, i) => (is(s, PRE) ? i : -1)).filter((i) => i >= 0); if (p.length > 1) secs.splice(p[p.length - 1], 1); },
    () => { secs.forEach((s) => { if (is(s, BR) && s.lines.length > 4) s.lines = s.lines.slice(0, 4); }); },
    () => { const c = chorusIdx(); if (c.length >= 3) secs.splice(c[c.length - 2], 1); },
    () => { secs.forEach((s) => { if (is(s, V2) && s.lines.length > 2) s.lines = s.lines.slice(0, 2); }); },
    () => { secs.forEach((s) => { if (is(s, BR) && s.lines.length > 2) s.lines = s.lines.slice(0, 2); }); },
    () => { const p = secs.findIndex((s) => is(s, PRE)); if (p >= 0) secs.splice(p, 1); },
    () => { secs = secs.filter((s) => !is(s, V2)); },
    () => { secs.forEach((s) => { if (is(s, V1) && s.lines.length > 2) s.lines = s.lines.slice(0, 2); }); },
    () => { secs = secs.filter((s) => !is(s, BR)); },
    () => { const c = chorusIdx(); if (c.length >= 2) secs.splice(c[0], 1); },
  ];
  for (const step of steps) {
    step();
    if (singSeconds(joinSections(secs)) <= sec) return joinSections(secs);
  }
  // 使用者自己貼的超長歌詞：保留開頭與結尾，從倒數第二段往前拿掉
  while (secs.length > 3 && singSeconds(joinSections(secs)) > sec) secs.splice(secs.length - 2, 1);
  return joinSections(secs);
}

// 沒有 Claude 金鑰時的內建範本詞（可再手動修改）。每次隨機組合，並避免和上一版一模一樣
export function templateLyrics(o) {
  let r;
  for (let i = 0; i < 8; i++) {
    r = templateOnce(o);
    if (!o.lyrics || r.lyrics !== o.lyrics) break;
  }
  return r;
}

function templateOnce(o) {
  const n = o.recipient || "你";
  const oc = occasionByKey(o.occasion);
  const group = relGroupOf(o.relation, oc.key);
  const platonic = group !== "lover" && OCC_LYRICS_PLATONIC[oc.key];
  const pool = platonic
    ? [OCC_LYRICS_PLATONIC[oc.key], ...(PLATONIC_ALT[oc.key] || [])]
    : OCC_LYRICS[oc.key] ? [OCC_LYRICS[oc.key], ...(OCC_ALT[oc.key] || [])] : [OCC_LYRICS.birthday, ...OCC_ALT.birthday];
  // 各段落獨立隨機挑選；歌名跟著副歌那一套走，比較一致
  const chorusSet = pickOne(pool);
  const L = {
    title: chorusSet.title, chorus: chorusSet.chorus,
    verse2: pickOne(pool).verse2, pre: pickOne(pool).pre,
    bridge: pickOne(pool).bridge, outro: pickOne(pool).outro,
  };
  // 情侶以外（家人長輩除外）不唱「我愛你」
  if (group === "friend" || group === "family") L.outro = L.outro.replace(/，我愛你$/, "");
  const f = (x) => String(x).replaceAll("{n}", n);
  const skip = VERSE1_SKIP[oc.key];
  const bank = VERSE1_BANK[group].filter((c) => !skip || !skip.test(c.join("")));
  const [c1, c2] = [...bank].sort(() => Math.random() - 0.5);
  const bridge = group !== "lover" && BRIDGE_NON_LOVER[oc.key]
    ? pickOne([BRIDGE_NON_LOVER[oc.key], ...(BRIDGE_NON_LOVER_ALT[oc.key] || [])]) : L.bridge;
  const finalChorus = [...L.chorus.slice(0, 3), pickOne(["這首歌是我的心裡話", "這首歌，唱給最重要的你", "把這份心意，唱給你聽"])];
  // 署名句不能在名字後面加逗號（「阿哲，把這首歌送給你」會變成在叫阿哲）
  const sender = String(o.sender || "").trim().replace(/[，,、。！!？?\s]+$/, "");
  const outro = sender ? [f(L.outro), pickOne([`這首歌是${sender}送給你的`, `${sender}把這首歌送給你`, `${sender}唱這首歌給你聽`])] : [f(L.outro)];
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
    ...weddingDateLines(o, group === "lover"),
    ...(o.q_words ? [o.q_words, bridge[1]] : bridge).map(f),
    "",
    "[Final Chorus]",
    ...finalChorus.map(f),
    "",
    "[Outro]",
    ...outro,
  ].join("\n");
  lyrics = fitLyrics(lyrics, o.length);
  let title = f(L.title);
  if (isFemale(o)) {
    // 送給女生：你 → 妳（名字本身不動）
    const fix = (t) => t.split(n).map((p) => p.replace(/你(?!們)/g, "妳")).join(n); // 「你們」（新人兩位）維持不變
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
    param_9: vocalLang(v.styleTags),
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
    vocal_language: vocalLang(v.styleTags),
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
