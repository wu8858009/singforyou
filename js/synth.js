// 免費本機合成：依曲風與歌詞段落，在瀏覽器裡合成一首純音樂伴奏（無歌聲），輸出 WAV。

const SR = 32000;

const STYLE_CFG = {
  ballad:    { bpm: 72,  prog: [[0, 7, 9, 5], [9, 5, 0, 7]], drums: "soft", lead: "sine", pad: "triangle", swing: 0 },
  pop:       { bpm: 108, prog: [[0, 7, 9, 5], [5, 7, 0, 9]], drums: "pop", lead: "square", pad: "sawtooth", swing: 0 },
  folk:      { bpm: 90,  prog: [[0, 5, 0, 7], [9, 5, 0, 7]], drums: "light", lead: "triangle", pad: "pluck", swing: 0 },
  rnb:       { bpm: 84,  prog: [[2, 7, 0, 9], [5, 4, 9, 2]], drums: "rnb", lead: "sine", pad: "triangle", swing: 0.12 },
  rock:      { bpm: 128, prog: [[0, 10, 5, 0], [9, 5, 0, 7]], drums: "rock", lead: "sawtooth", pad: "sawtooth", swing: 0 },
  rap:       { bpm: 92,  prog: [[9, 9, 5, 7], [9, 5, 2, 7]], drums: "boom", lead: "square", pad: "triangle", swing: 0.15 },
  jazz:      { bpm: 96,  prog: [[2, 7, 0, 9], [2, 7, 0, 0]], drums: "brush", lead: "sine", pad: "triangle", swing: 0.18, seventh: true },
  piano:     { bpm: 66,  prog: [[0, 9, 5, 7], [0, 4, 9, 5]], drums: "none", lead: "sine", pad: "pluck", swing: 0 },
  taiwanese: { bpm: 76,  prog: [[9, 5, 7, 0], [9, 2, 7, 0]], drums: "soft", lead: "triangle", pad: "triangle", swing: 0 },
  guofeng:   { bpm: 80,  prog: [[9, 7, 5, 9], [0, 7, 9, 9]], drums: "light", lead: "pluck", pad: "triangle", swing: 0, penta: true },
  kids:      { bpm: 116, prog: [[0, 5, 7, 0], [0, 5, 7, 0]], drums: "light", lead: "square", pad: "pluck", swing: 0 },
  edm:       { bpm: 124, prog: [[9, 5, 0, 7], [9, 5, 0, 7]], drums: "edm", lead: "sawtooth", pad: "sawtooth", swing: 0 },
};

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function hash(str) {
  let h = 2166136261;
  for (const c of String(str)) h = Math.imul(h ^ c.codePointAt(0), 16777619);
  return h >>> 0;
}
const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// 依歌詞的段落標籤排出歌曲結構
function sections(lyrics) {
  const out = [];
  for (const line of String(lyrics || "").split("\n")) {
    const m = line.match(/^\s*\[(.+?)\]/);
    if (!m) continue;
    const k = m[1].toLowerCase();
    if (k.includes("pre")) out.push({ type: "pre", bars: 4 });
    else if (k.includes("chorus") || k.includes("hook")) out.push({ type: "chorus", bars: 8 });
    else if (k.includes("bridge")) out.push({ type: "bridge", bars: 8 });
    else if (k.includes("intro")) out.push({ type: "intro", bars: 4 });
    else if (k.includes("outro")) out.push({ type: "outro", bars: 4 });
    else out.push({ type: "verse", bars: 8 });
  }
  if (!out.length) out.push({ type: "verse", bars: 8 }, { type: "chorus", bars: 8 }, { type: "verse", bars: 8 }, { type: "chorus", bars: 8 });
  if (out[0].type !== "intro") out.unshift({ type: "intro", bars: 4 });
  if (out[out.length - 1].type !== "outro") out.push({ type: "outro", bars: 4 });
  return out;
}

function noiseBuffer(ctx) {
  const b = ctx.createBuffer(1, SR, SR);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

export async function synthSong({ style = "ballad", lyrics = "", seconds = 120, variant = 0, title = "" }) {
  const cfg = STYLE_CFG[style] || STYLE_CFG.ballad;
  const r = rng(hash(title + lyrics) + variant * 7919);
  const bpm = cfg.bpm + (variant ? (r() < 0.5 ? -4 : 4) : 0);
  const beat = 60 / bpm, bar = beat * 4;
  const keyRoot = 55 + Math.floor(r() * 7) + (variant ? 2 : 0); // G3 附近
  const prog = cfg.prog[variant % cfg.prog.length];

  // 結構：依歌詞段落，太短就重複副歌，太長就截斷
  let plan = sections(lyrics);
  let total = plan.reduce((a, s) => a + s.bars, 0) * bar;
  while (total < seconds - bar * 6) { plan.splice(plan.length - 1, 0, { type: "chorus", bars: 8 }); total += 8 * bar; }
  const dur = Math.min(Math.max(total, 30), seconds + bar * 4);

  const ctx = new OfflineAudioContext(1, Math.ceil((dur + 2) * SR), SR);
  const master = ctx.createGain(); master.gain.value = 0.8;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
  // 簡易殘響
  const verb = ctx.createConvolver();
  const ir = ctx.createBuffer(1, Math.floor(SR * 1.2), SR);
  const ird = ir.getChannelData(0);
  for (let i = 0; i < ird.length; i++) ird[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ird.length, 3);
  verb.buffer = ir;
  const wet = ctx.createGain(); wet.gain.value = style === "edm" || style === "rock" ? 0.15 : 0.32;
  master.connect(comp); master.connect(verb); verb.connect(wet); wet.connect(comp); comp.connect(ctx.destination);
  const noise = noiseBuffer(ctx);

  const tone = (t, len, freq, type, vol, opts = {}) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const isPluck = type === "pluck";
    o.type = isPluck ? "triangle" : type;
    o.frequency.value = freq;
    if (opts.detune) o.detune.value = opts.detune;
    const a = opts.attack ?? (isPluck ? 0.005 : 0.02);
    const rel = opts.release ?? 0.15;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    if (isPluck || opts.decay) g.gain.exponentialRampToValueAtTime(Math.max(vol * 0.05, 0.0001), t + Math.max(len, 0.2));
    else g.gain.setValueAtTime(vol, t + Math.max(len - rel, a));
    g.gain.linearRampToValueAtTime(0, t + len + rel);
    let node = o;
    if (type === "sawtooth" || type === "square") {
      const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = opts.cutoff || 1800; o.connect(f); node = f;
    }
    node.connect(g); g.connect(opts.out || master);
    o.start(t); o.stop(t + len + rel + 0.05);
  };
  const drum = (t, kind, vol) => {
    if (kind === "kick") {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.4);
      return;
    }
    const s = ctx.createBufferSource(); s.buffer = noise;
    const f = ctx.createBiquadFilter(); const g = ctx.createGain();
    if (kind === "snare") { f.type = "bandpass"; f.frequency.value = 1800; f.Q.value = 0.7; }
    else if (kind === "brush") { f.type = "bandpass"; f.frequency.value = 3000; f.Q.value = 0.5; }
    else { f.type = "highpass"; f.frequency.value = 7000; }
    const len = kind === "snare" ? 0.18 : kind === "brush" ? 0.25 : 0.05;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + len + 0.02);
  };

  const scale = cfg.penta ? [0, 2, 4, 7, 9] : [0, 2, 4, 5, 7, 9, 11];
  const chordNotes = (deg) => {
    const minor = [2, 4, 9].includes(deg);
    const n = [0, minor ? 3 : 4, 7];
    if (cfg.seventh) n.push(minor ? 10 : deg === 7 ? 10 : 11);
    return n.map((x) => keyRoot + deg + x);
  };

  let t = 0.3;
  let mel = keyRoot + 12 + 4;
  for (const sec of plan) {
    const energy = { intro: 0.4, verse: 0.65, pre: 0.75, chorus: 1, bridge: 0.7, outro: 0.45 }[sec.type];
    for (let b = 0; b < sec.bars; b++) {
      if (t > dur - 0.5) break;
      const deg = prog[b % 4];
      const notes = chordNotes(deg);
      // 和弦鋪底
      if (cfg.pad === "pluck") {
        for (let i = 0; i < 8; i++) {
          const n = notes[[0, 1, 2, 1, 0, 2, 1, 2][i] % notes.length] + (i % 4 === 0 ? 0 : 12);
          tone(t + i * beat / 2, beat * 0.9, midiHz(n), "pluck", 0.09 * energy + 0.03);
        }
      } else {
        for (const n of notes) tone(t, bar * 0.98, midiHz(n), cfg.pad, 0.045 * energy + 0.015, { attack: 0.25, release: 0.4, detune: variant ? 6 : -6, cutoff: 1200 });
      }
      // 貝斯
      if (sec.type !== "intro" || b >= 2) {
        const bassPat = cfg.drums === "edm" || cfg.drums === "rock" ? [0, 1, 2, 3] : [0, 2.5];
        for (const p of bassPat) tone(t + p * beat, beat * 0.9, midiHz(keyRoot + deg - 24 + 12), "triangle", 0.22 * energy + 0.05, { release: 0.08 });
      }
      // 旋律（模擬人聲位置）
      if (sec.type !== "intro" && sec.type !== "outro") {
        const steps = sec.type === "chorus" ? 8 : 6;
        let pos = 0;
        while (pos < 4 - 0.01) {
          const len = [0.5, 0.5, 1, 1, 0.5, 1.5, 2][Math.floor(r() * (steps === 8 ? 7 : 6))];
          if (r() < 0.12 && pos > 0) { pos += 0.5; continue; }
          const target = r() < 0.55 ? notes[Math.floor(r() * notes.length)] + 12 : mel + (r() < 0.5 ? -1 : 1) * (1 + Math.floor(r() * 2));
          let deg12 = ((target - keyRoot) % 12 + 12) % 12;
          let best = scale.reduce((a, s) => (Math.abs(s - deg12) < Math.abs(a - deg12) ? s : a), scale[0]);
          mel = target - deg12 + best;
          const lo = keyRoot + 9 + (sec.type === "chorus" ? 5 : 0), hi = keyRoot + 24 + (sec.type === "chorus" ? 3 : 0);
          while (mel < lo) mel += 12;
          while (mel > hi) mel -= 12;
          const sw = cfg.swing && (pos * 2) % 2 === 1 ? cfg.swing * beat : 0;
          const L = Math.min(len, 4 - pos);
          tone(t + pos * beat + sw, L * beat * 0.92, midiHz(mel), cfg.lead, cfg.lead === "sine" || cfg.lead === "triangle" ? 0.13 : 0.06, { attack: 0.03, release: 0.12, cutoff: 2600 });
          pos += len;
        }
      }
      // 鼓
      const dv = 0.5 * energy + 0.1;
      const k = cfg.drums;
      if (k !== "none" && !(sec.type === "intro" && b < 2)) {
        for (let i = 0; i < 8; i++) {
          const tt = t + i * beat / 2 + (cfg.swing && i % 2 ? cfg.swing * beat : 0);
          const onBeat = i % 2 === 0, beatN = i / 2;
          if (k === "edm" && onBeat) drum(tt, "kick", dv);
          else if ((k === "pop" || k === "rock") && (i === 0 || i === 4 || (k === "rock" && i === 5))) drum(tt, "kick", dv);
          else if ((k === "boom" || k === "rnb") && (i === 0 || i === 3 || i === 5)) drum(tt, "kick", dv);
          else if ((k === "soft" || k === "light") && i === 0) drum(tt, "kick", dv * 0.7);
          if (onBeat && (beatN === 1 || beatN === 3)) {
            if (k === "brush") drum(tt, "brush", dv * 0.35);
            else if (k === "soft" || k === "light") { if (sec.type === "chorus") drum(tt, "snare", dv * 0.35); }
            else drum(tt, "snare", dv * 0.55);
          }
          if (k !== "soft" && (k !== "light" || onBeat)) drum(tt, "hat", (k === "brush" ? 0.12 : 0.16) * energy);
        }
      }
      t += bar;
    }
  }
  // 結尾長音
  for (const n of chordNotes(0)) tone(t, bar * 1.5, midiHz(n), "triangle", 0.06, { attack: 0.05, release: 1.2 });

  const buf = await ctx.startRendering();
  return { blob: wav(buf.getChannelData(0), SR), duration: buf.duration };
}

function wav(data, sr) {
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  const gain = peak > 0 ? 0.95 / peak : 1;
  const out = new DataView(new ArrayBuffer(44 + data.length * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); out.setUint32(4, 36 + data.length * 2, true); w(8, "WAVE"); w(12, "fmt ");
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, sr, true); out.setUint32(28, sr * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true);
  w(36, "data"); out.setUint32(40, data.length * 2, true);
  for (let i = 0; i < data.length; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i] * gain)) * 32767, true);
  return new Blob([out], { type: "audio/wav" });
}
