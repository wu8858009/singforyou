// 企業版 PRO：歌詞 MV 影片（照片輪播＋逐句歌詞＋音樂），在瀏覽器裡即時錄製成 MP4（不支援時為 WebM）
import { brand, loadImage, drawWatermarkSync } from "./brand.js";
import { vocalActivity, alignLines } from "./align.js";

const FORMATS = { land: { w: 1280, h: 720, name: "橫式 16:9（YouTube）" }, port: { w: 720, h: 1280, name: "直式 9:16（IG／抖音）" } };

function pickMime() {
  const c = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1,mp4a", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return c.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || "";
}

// 歌詞時間軸：先分析音檔找出哪裡在唱歌，把每句對上去；分析不出來（單聲道等）才依字數平均分配
export function buildTimeline(lyrics, D, buf, timing) {
  const lines = [];
  let sec = "";
  for (const raw of String(lyrics || "").split("\n")) {
    const l = raw.trim();
    const m = l.match(/^\[(.+?)\]$/);
    if (m) { sec = m[1]; continue; }
    if (l) lines.push({ text: l, sec });
  }
  // 電腦版用 Whisper 聽出來的實際演唱時間（含 AI 重複唱、跳句）
  if (timing && timing.length && lines.length) {
    const occ = timing.filter((x) => lines[x.i]).map((x) => ({ text: lines[x.i].text, sec: lines[x.i].sec, t0: x.t0, t1: x.t1 }));
    occ.sort((a, b) => a.t0 - b.t0);
    for (let i = 0; i < occ.length; i++) {
      const nx = occ[i + 1];
      if (nx) occ[i].t1 = nx.t0 - occ[i].t1 < 3 ? nx.t0 : occ[i].t1 + 0.6;
      else occ[i].t1 = Math.min(D, occ[i].t1 + 1.5);
    }
    if (occ.length) {
      const intro = Math.max(1.5, occ[0].t0 - 0.4);
      const outro = Math.max(occ[occ.length - 1].t1, Math.min(D - 2, occ[occ.length - 1].t1 + 2));
      return { lines: occ, intro, outro, aligned: "whisper" };
    }
  }
  if (buf && lines.length) {
    try {
      const va = vocalActivity(buf.getChannelData(0), buf.numberOfChannels > 1 ? buf.getChannelData(1) : null, buf.sampleRate);
      const al = va.contrast > 4 ? alignLines(lines.map((x) => [...x.text].length + 3), va) : null;
      if (al) {
        lines.forEach((x, i) => { x.t0 = al.lines[i].t0; x.t1 = Math.min(D, al.lines[i].t1); });
        const intro = Math.max(1.5, Math.min(al.first - 0.4, D * 0.3));
        const outro = Math.max(lines[lines.length - 1].t1, Math.min(D - 2, al.last + 2));
        return { lines, intro, outro, aligned: "audio" };
      }
    } catch (e) { console.warn("歌詞對時失敗，改用平均分配", e); }
  }
  const intro = Math.min(10, D * 0.07), outroLen = Math.min(7, D * 0.06);
  const start = intro, end = Math.max(start + 1, D - outroLen);
  const w = lines.map((x) => [...x.text].length + 3);
  const tot = w.reduce((a, b) => a + b, 0) || 1;
  let t = start;
  lines.forEach((x, i) => { x.t0 = t; t += ((end - start) * w[i]) / tot; x.t1 = t; });
  return { lines, intro, outro: end };
}

// 照片完整顯示不裁切：背後放同一張照片放大＋模糊＋變暗填滿空白
function photoDraw(g, im, W, H, zoom, alpha) {
  g.save();
  g.globalAlpha = alpha;
  const kc = Math.max(W / im.width, H / im.height) * 1.1;
  const cw = im.width * kc, ch = im.height * kc;
  g.filter = "blur(28px) brightness(0.55)";
  g.drawImage(im, (W - cw) / 2, (H - ch) / 2, cw, ch);
  g.filter = "none";
  const k = Math.min(W / im.width, H / im.height) * zoom;
  const w = im.width * k, h = im.height * k;
  g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = 30;
  g.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
  g.restore();
}

function wrapLines(g, text, maxW) {
  const out = [];
  let line = "";
  for (const ch of text) {
    if (g.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch;
  }
  if (line) out.push(line);
  return out;
}

export function mvPanelHtml(v, esc) {
  const nTracks = v.tracks.filter((t) => t.blobKey || t.audioUrl).length;
  return `<div class="card" style="margin-top:12px" id="mvCard">
    <h3>🎬 製作歌詞 MV 影片 <span class="badge ok">PRO</span></h3>
    <p class="muted small">音樂＋照片輪播＋逐句歌詞，加上你的品牌${brand().wmOn ? "與浮水印" : ""}。影片會照歌曲長度即時錄製，<b>製作時請讓這個視窗保持在最前面</b>。${onDesktop() ? "電腦版會先分離人聲、「聽」一次歌（第一次約 4 分鐘），讓每句歌詞準確對上演唱。" : "歌詞時間由音檔自動估算；用電腦版製作會更準。"}</p>
    <div class="q"><span class="lbl">影片格式</span><div class="seg" id="mvFmt">${Object.entries(FORMATS).map(([k, f], i) => `<button type="button" data-v="${k}" class="${i ? "" : "on"}">${f.name}</button>`).join("")}</div></div>
    ${nTracks > 1 ? `<div class="q"><span class="lbl">使用版本</span><div class="seg" id="mvTrack">${Array.from({ length: nTracks }, (_, i) => `<button type="button" data-v="${i}" class="${i ? "" : "on"}">版本 ${String.fromCharCode(65 + i)}</button>`).join("")}</div></div>` : ""}
    <div class="q"><span class="lbl">照片（選填，最多 20 張，依順序輪播）</span>
      <label class="btn btn-ghost btn-sm">選擇照片<input type="file" id="mvPhotos" accept="image/*" multiple hidden></label>
      <div class="mv-thumbs" id="mvThumbs"><span class="tiny">沒有照片就用品牌色的動態背景</span></div></div>
    <label class="row small"><input type="checkbox" id="mvHear"> 製作時播放聲音</label>
    <div class="row" style="margin-top:12px"><button class="btn" id="mvGo">🎬 開始製作 MV</button><button class="btn btn-ghost hidden" id="mvStop">取消</button></div>
    <div id="mvRun" class="hidden" style="margin-top:14px">
      <canvas id="mvPrev" class="mv-prev"></canvas>
      <div class="pbar" style="margin-top:10px"><b id="mvBar"></b></div>
      <p class="small muted" id="mvStat"></p>
    </div>
  </div>`;
}

// 電腦版：把音檔交給電腦版用 Whisper 聽，拿回每句歌詞實際唱的時間（約 1 分鐘）
const onDesktop = () => location.port === "47831" || !!(window.pywebview && window.pywebview.api);
export async function alignByListening(blob, lyrics) {
  if (!onDesktop()) return null;
  try {
    const r = await fetch("/align-lyrics", { method: "POST", headers: { "X-Lyrics": encodeURIComponent(lyrics || "") }, body: blob });
    const j = await r.json();
    if (j && Array.isArray(j.lines) && j.lines.length) return j.lines;
    console.warn("歌詞對時（Whisper）沒有結果", j);
  } catch (e) { console.warn("歌詞對時（Whisper）失敗", e); }
  return null;
}

// 綁定面板並負責錄製；getAudio(i) 回傳該版本音檔 Blob；save(blob, name) 存檔
export function bindMvPanel({ $, $$, song, v, getAudio, save, toast }) {
  let fmt = "land", track = 0, photos = [], job = null;
  $$("#mvFmt button").forEach((b) => b.onclick = () => { fmt = b.dataset.v; $$("#mvFmt button").forEach((x) => x.classList.toggle("on", x === b)); });
  $$("#mvTrack button").forEach((b) => b.onclick = () => { track = Number(b.dataset.v); $$("#mvTrack button").forEach((x) => x.classList.toggle("on", x === b)); });
  $("#mvPhotos").onchange = async (e) => {
    const files = [...e.target.files].slice(0, 20);
    photos = (await Promise.all(files.map((f) => loadImage(URL.createObjectURL(f))))).filter(Boolean);
    $("#mvThumbs").innerHTML = photos.length ? photos.map((p) => `<img src="${p.src}" alt="">`).join("") : `<span class="tiny">沒有可讀取的照片</span>`;
  };
  $("#mvStop").onclick = () => job && job.cancel();
  $("#mvGo").onclick = async () => {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return toast("這個瀏覽器不支援錄製影片，請改用電腦版或 Chrome／Edge", true);
    $("#mvGo").disabled = true; $("#mvStop").classList.remove("hidden"); $("#mvRun").classList.remove("hidden");
    try {
      const blob = await getAudio(track);
      if (!blob) throw new Error("找不到這個版本的音檔");
      $("#mvStat").textContent = onDesktop() ? "正在分離人聲並聽歌，找出每句歌詞唱的時間…（第一次約 4 分鐘，同一首歌再做會很快）" : "";
      const timing = await alignByListening(blob, v.lyrics);
      job = makeMv({ song, v, blob, photos, fmt, timing, hear: $("#mvHear").checked, canvas: $("#mvPrev"),
        onProgress: (p, t, D) => { $("#mvBar").style.width = (p * 100).toFixed(1) + "%"; $("#mvStat").textContent = `錄製中 ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")} / ${Math.floor(D / 60)}:${String(Math.floor(D % 60)).padStart(2, "0")}（${Math.round(p * 100)}%）`; } });
      const out = await job.done;
      if (out) {
        const ext = /mp4/.test(out.type) ? "mp4" : "webm";
        $("#mvStat").textContent = `完成！${(out.size / 1e6).toFixed(1)} MB（${ext.toUpperCase()}）`;
        await save(out, `${String(v.title).replace(/[\\/:*?"<>|]+/g, "_")}_MV.${ext}`);
      } else $("#mvStat").textContent = "已取消";
    } catch (e) {
      console.error(e); toast("MV 製作失敗：" + (e.message || e), true); $("#mvStat").textContent = "失敗：" + (e.message || e);
    } finally {
      job = null; $("#mvGo").disabled = false; $("#mvStop").classList.add("hidden");
    }
  };
}

export function makeMv({ song, v, blob, photos, fmt, timing, hear, canvas, onProgress }) {
  let cancelled = false, cleanup = () => {};
  const done = (async () => {
    const { w: W, h: H } = FORMATS[fmt] || FORMATS.land;
    const portrait = H > W, S = Math.min(W, H) / 720;
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext("2d");
    const b = brand();
    const logo = await loadImage(b.logo);
    await document.fonts.ready;

    const ac = new AudioContext();
    const buf = await ac.decodeAudioData(await blob.arrayBuffer());
    const D = buf.duration;
    const tl = buildTimeline(v.lyrics, D, buf, timing);
    const o = song.order;

    const dest = ac.createMediaStreamDestination();
    const src = ac.createBufferSource(); src.buffer = buf; src.connect(dest);
    if (hear) src.connect(ac.destination);
    const vstream = canvas.captureStream(30);
    const stream = new MediaStream([...vstream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const mime = pickMime();
    const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 5_000_000, audioBitsPerSecond: 192_000 });
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise((r) => (rec.onstop = r));

    const frame = (t) => {
      // 背景：照片輪播（緩慢放大＋交叉淡入）或品牌色動態漸層
      g.fillStyle = "#120a1d"; g.fillRect(0, 0, W, H);
      if (photos.length) {
        const per = D / photos.length, i = Math.min(photos.length - 1, Math.floor(t / per)), lt = t - i * per;
        photoDraw(g, photos[i], W, H, 0.94 + 0.05 * (lt / per), 1);
        const fade = 1.2;
        if (i + 1 < photos.length && per - lt < fade) photoDraw(g, photos[i + 1], W, H, 0.94, 1 - (per - lt) / fade);
      } else {
        const gr = g.createLinearGradient(0, 0, W, H);
        gr.addColorStop(0, "#1b1030"); gr.addColorStop(1, "#3a1a4d"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        for (let k = 0; k < 6; k++) {
          const x = W * (0.5 + 0.42 * Math.sin(t * 0.13 + k * 1.7)), y = H * (0.5 + 0.4 * Math.cos(t * 0.11 + k * 2.3)), r = (150 + 60 * Math.sin(t * 0.3 + k)) * S;
          const rg = g.createRadialGradient(x, y, 0, x, y, r);
          rg.addColorStop(0, (k % 2 ? b.c1 : b.c2) + "55"); rg.addColorStop(1, "transparent");
          g.fillStyle = rg; g.fillRect(0, 0, W, H);
        }
      }
      // 下方暗化，讓歌詞清楚
      const sh = g.createLinearGradient(0, H * 0.35, 0, H);
      sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,.72)");
      g.fillStyle = sh; g.fillRect(0, 0, W, H);
      g.textAlign = "center"; g.textBaseline = "middle";

      if (t < tl.intro) {
        // 開場標題卡
        const a = Math.min(1, t / 1.2, (tl.intro - t) / 1.2);
        g.globalAlpha = Math.max(0, a);
        g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(0, 0, W, H);
        g.fillStyle = b.c2; g.font = `600 ${30 * S}px 'Noto Sans TC', sans-serif`;
        g.fillText(`專為 ${o.recipient} 打造`, W / 2, H / 2 - 70 * S);
        g.fillStyle = "#fff"; g.font = `900 ${(portrait ? 64 : 72) * S}px 'Noto Serif TC', serif`;
        wrapLines(g, v.title, W * 0.86).forEach((ln, i, arr) => g.fillText(ln, W / 2, H / 2 + 20 * S + (i - (arr.length - 1) / 2) * 84 * S));
        g.globalAlpha = 1;
      } else if (t > tl.outro) {
        // 結尾卡：送禮人＋品牌
        const a = Math.min(1, (t - tl.outro) / 1.2);
        g.globalAlpha = a;
        g.fillStyle = "rgba(0,0,0,.45)"; g.fillRect(0, 0, W, H);
        g.fillStyle = "#fff"; g.font = `800 ${50 * S}px 'Noto Serif TC', serif`;
        g.fillText(o.sender ? `${o.sender} 送給 ${o.recipient}` : `送給 ${o.recipient}`, W / 2, H / 2 - 30 * S);
        if (logo) g.drawImage(logo, W / 2 - 40 * S, H / 2 + 20 * S, 80 * S, 80 * S);
        g.fillStyle = b.c2; g.font = `600 ${28 * S}px 'Noto Sans TC', sans-serif`;
        g.fillText(b.name, W / 2, H / 2 + (logo ? 130 : 50) * S);
        g.globalAlpha = 1;
      } else {
        // 逐句歌詞：目前這句（卡拉 OK 填色）＋下一句
        const idx = tl.lines.findIndex((x) => t >= x.t0 && t < x.t1);
        const cur = tl.lines[idx];
        if (cur) {
          const p = (t - cur.t0) / (cur.t1 - cur.t0);
          const fs = (portrait ? 54 : 58) * S;
          g.font = `800 ${fs}px 'Noto Sans TC', sans-serif`;
          const lines = wrapLines(g, cur.text, W * 0.86);
          const baseY = H * (portrait ? 0.7 : 0.74);
          const fadeIn = Math.min(1, (t - cur.t0) / 0.35);
          lines.forEach((ln, i) => {
            const y = baseY + (i - (lines.length - 1) / 2) * fs * 1.25;
            const tw = g.measureText(ln).width, x0 = W / 2 - tw / 2;
            g.globalAlpha = fadeIn;
            g.lineWidth = 8 * S; g.strokeStyle = "rgba(0,0,0,.55)"; g.strokeText(ln, W / 2, y);
            g.fillStyle = "#fff"; g.fillText(ln, W / 2, y);
            // 已唱過的部分用品牌色
            const share = Math.min(1, Math.max(0, p * lines.length - i));
            if (share > 0) { g.save(); g.beginPath(); g.rect(x0, y - fs, tw * share, fs * 2); g.clip(); g.fillStyle = b.c2; g.fillText(ln, W / 2, y); g.restore(); }
          });
          const nxt = tl.lines[idx + 1];
          if (nxt) {
            g.globalAlpha = 0.6 * fadeIn; g.font = `600 ${34 * S}px 'Noto Sans TC', sans-serif`; g.fillStyle = "#fff";
            g.fillText(wrapLines(g, nxt.text, W * 0.86)[0], W / 2, baseY + (lines.length / 2 + 0.9) * fs * 1.25);
          }
          g.globalAlpha = 1;
        } else {
          // 間奏：顯示音符和下一句
          const nx = tl.lines.find((x) => x.t0 > t);
          g.globalAlpha = 0.75; g.fillStyle = "#fff"; g.font = `600 ${40 * S}px 'Noto Sans TC', sans-serif`;
          g.fillText("♪　♪　♪", W / 2, H * (portrait ? 0.7 : 0.74));
          if (nx && nx.t0 - t < 4) { g.globalAlpha = 0.6; g.font = `600 ${34 * S}px 'Noto Sans TC', sans-serif`; g.fillText(wrapLines(g, nx.text, W * 0.86)[0], W / 2, H * (portrait ? 0.7 : 0.74) + 70 * S); }
          g.globalAlpha = 1;
        }
        // 左上角小標題
        g.textAlign = "left"; g.fillStyle = "rgba(255,255,255,.8)"; g.font = `600 ${22 * S}px 'Noto Sans TC', sans-serif`;
        g.fillText(v.title, 28 * S, 40 * S); g.textAlign = "center";
      }
      drawWatermarkSync(g, W, H, S, logo);
      // 進度條
      g.fillStyle = "rgba(255,255,255,.15)"; g.fillRect(0, H - 5 * S, W, 5 * S);
      g.fillStyle = b.c1; g.fillRect(0, H - 5 * S, W * (t / D), 5 * S);
    };

    frame(0);
    rec.start(1000);
    const t0 = ac.currentTime + 0.15;
    src.start(t0);
    let timer = 0;
    const loop = () => {
      const t = Math.max(0, ac.currentTime - t0);
      frame(Math.min(t, D));
      onProgress && onProgress(Math.min(1, t / D), t, D);
      if (cancelled || t >= D + 0.3) { finish(); return; }
      timer = requestAnimationFrame(loop);
    };
    // 視窗被遮住時 rAF 會停，補一個計時器維持畫面更新
    const backup = setInterval(() => { if (document.hidden) loop(); }, 200);
    let finished = false;
    const finish = () => {
      if (finished) return; finished = true;
      cancelAnimationFrame(timer); clearInterval(backup);
      try { src.stop(); } catch { /* ignore */ }
      if (rec.state !== "inactive") rec.stop();
    };
    cleanup = finish;
    timer = requestAnimationFrame(loop);
    await stopped;
    ac.close();
    if (cancelled) return null;
    return new Blob(chunks, { type: (mime || "video/webm").split(";")[0] });
  })();
  return { done, cancel: () => { cancelled = true; cleanup(); } };
}
