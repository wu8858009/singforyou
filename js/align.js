// ── 人聲偵測：AI 歌曲的人聲多在正中央（左右聲道相同），伴奏較寬。
// 比較「中央」與「兩側」在人聲頻段（250–3500Hz）的能量比，就能看出哪裡在唱歌。
const HOP = 0.1; // 每格 0.1 秒
function biquad(x, sr, type, f0) {
  const w = 2 * Math.PI * f0 / sr, c = Math.cos(w), al = Math.sin(w) / (2 * Math.SQRT1_2);
  let b0, b1, b2;
  if (type === "hp") { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; } else { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
  const a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
export function vocalActivity(L, R, sr) {
  // 先降取樣到約 11kHz 加快速度
  const step = Math.max(1, Math.floor(sr / 11025)), fs = sr / step, n = Math.floor(L.length / step);
  const mid = new Float32Array(n), side = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = L[i * step], b = R ? R[i * step] : a; mid[i] = (a + b) / 2; side[i] = (a - b) / 2; }
  const band = (x) => biquad(biquad(biquad(biquad(x, fs, "hp", 250), fs, "hp", 250), fs, "lp", 3500), fs, "lp", 3500);
  const M = band(mid), S = band(side);
  const hop = Math.round(fs * HOP), F = Math.floor(n / hop);
  const ratio = new Float32Array(F), energy = new Float32Array(F);
  let maxE = 1e-12;
  for (let f = 0; f < F; f++) {
    let m = 0, s = 0;
    for (let i = f * hop; i < (f + 1) * hop; i++) { m += M[i] * M[i]; s += S[i] * S[i]; }
    ratio[f] = 10 * Math.log10((m + 1e-9) / (s + 1e-9)); energy[f] = m; if (m > maxE) maxE = m;
  }
  // 太小聲（-35dB 以下）當作沒唱；平滑 0.5 秒
  const raw = new Float32Array(F);
  for (let f = 0; f < F; f++) raw[f] = 10 * Math.log10(energy[f] / maxE + 1e-12) < -35 ? -5 : ratio[f];
  const sm = new Float32Array(F);
  for (let f = 0; f < F; f++) { let a = 0, c = 0; for (let k = -2; k <= 2; k++) if (raw[f + k] !== undefined) { a += raw[f + k]; c++; } sm[f] = a / c; }
  const sorted = [...sm].sort((a, b) => a - b), q = (p) => sorted[Math.floor(p * (sorted.length - 1))];
  const lo = q(0.15), hi = q(0.85), thr = lo + (hi - lo) * 0.45;
  const voice = sm.map((v) => (v > thr ? 1 : 0));
  return { sm, voice, lo, hi, thr, hop: HOP, frames: F, mono: !R, contrast: hi - lo };
}

// ── 把每句歌詞對到人聲：以「動態規劃」找出換句的位置
// 每句實際唱的格數要接近依字數估計的長度，換句點盡量落在人聲變弱（換氣、間奏）的地方
export function alignLines(weights, va) {
  const { sm, voice, lo, hi, frames: F, hop } = va;
  const N = weights.length;
  let first = voice.indexOf(1), last = voice.lastIndexOf(1);
  if (!N || first < 0 || last - first < N * 5) return null;
  // 開頭要連續唱 1 秒以上才算開始唱（避免前奏的雜訊）
  const run = (f, dir) => { let c = 0; for (let k = 0; k < 10 && voice[f + k * dir]; k++) c++; return c; };
  while (first < last && run(first, 1) < 8) first++;
  while (last > first && run(last, -1) < 8) last--;
  const pre = new Int32Array(F + 1);
  for (let f = 0; f < F; f++) pre[f + 1] = pre[f] + voice[f];
  const V = pre[last + 1] - pre[first];
  const tot = weights.reduce((a, b) => a + b, 0);
  const exp = weights.map((w) => (V * w) / tot);
  const bcost = (f) => Math.min(1, Math.max(0, (sm[f] - lo) / (hi - lo || 1))); // 換句點在人聲弱處較好
  const INF = 1e18;
  // dp[i][f]：前 i 句唱完、第 i 句在 f 格結束（不含 f）
  let prev = new Float64Array(F + 1).fill(INF); prev[first] = 0;
  const back = [];
  for (let i = 0; i < N; i++) {
    const cur = new Float64Array(F + 1).fill(INF), bk = new Int32Array(F + 1).fill(-1);
    const e = exp[i], minV = e * 0.35, maxV = e * 2.6 + 3;
    const lastLine = i === N - 1;
    for (let s = first; s <= last; s++) {
      if (prev[s] >= INF) continue;
      for (let f = s + 1; f <= last + 1; f++) {
        const v = pre[f] - pre[s];
        if (v > maxV) break;
        if (v < minV) continue;
        if (lastLine && f !== last + 1) continue;
        const d = (v - e) / e;
        const c = prev[s] + 4 * d * d + (lastLine ? 0 : 1.5 * bcost(Math.min(F - 1, f)));
        if (c < cur[f]) { cur[f] = c; bk[f] = s; }
      }
    }
    back.push(bk); prev = cur;
  }
  if (prev[last + 1] >= INF) return null;
  const cuts = new Array(N + 1); cuts[N] = last + 1;
  for (let i = N - 1; i >= 0; i--) cuts[i] = back[i][cuts[i + 1]];
  // 每句從真正開口的那格開始顯示，到下一句開口前結束
  const out = [];
  for (let i = 0; i < N; i++) {
    let s = cuts[i]; while (s < cuts[i + 1] - 1 && !voice[s]) s++;
    out.push({ t0: s * hop, t1: cuts[i + 1] * hop });
  }
  for (let i = 0; i < N - 1; i++) {
    // 間奏（3 秒以上沒唱）時不顯示歌詞；短的換氣就讓這句一直停在畫面上
    const gap = out[i + 1].t0 - out[i].t1;
    out[i].t1 = gap > 3 ? out[i].t1 + 0.6 : out[i + 1].t0;
  }
  out[N - 1].t1 += 1.5;
  return { lines: out, first: first * hop, last: (last + 1) * hop };
}
