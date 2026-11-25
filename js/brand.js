// 企業版 PRO：自訂品牌（名稱、Logo、主色）與浮水印
import { getSettings, saveSettings } from "./store.js";

export const DEFAULT_BRAND = { brandName: "為你而唱", brandLogo: "", brandC1: "#ff6f91", brandC2: "#ffc46b", wmOn: false, wmText: "" };

export function brand() {
  const s = getSettings();
  return {
    name: (s.brandName || DEFAULT_BRAND.brandName).trim() || DEFAULT_BRAND.brandName,
    logo: s.brandLogo || "",
    c1: s.brandC1 || DEFAULT_BRAND.brandC1,
    c2: s.brandC2 || DEFAULT_BRAND.brandC2,
    wmOn: !!s.wmOn,
    wmText: (s.wmText || "").trim(),
  };
}
export const brandName = () => brand().name;
export const pageTitle = (x) => (x ? `${x} · ${brandName()}` : brandName());
// 浮水印文字：有開啟才回傳；沒填文字就用品牌名稱
export const watermark = () => { const b = brand(); return b.wmOn ? (b.wmText || b.name) : ""; };

function mix(hex, other, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = p(hex), b = p(other);
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

export function applyBrand() {
  const b = brand();
  const r = document.documentElement.style;
  r.setProperty("--rose", b.c1);
  r.setProperty("--gold", b.c2);
  r.setProperty("--grad", `linear-gradient(135deg, ${b.c1} 0%, ${mix(b.c1, b.c2, 0.5)} 55%, ${b.c2} 100%)`);
  const name = document.querySelector(".topbar .brand span");
  if (name) name.textContent = b.name;
  const img = document.querySelector(".topbar .brand img");
  if (img) img.src = b.logo || "icons/icon.svg";
  const foot = document.querySelector(".foot p");
  if (foot) foot.textContent = `${b.name}${b.wmText ? " · " + b.wmText : ""} · 歌曲由 AI 產生`;
  const fav = document.querySelector('link[rel="icon"]');
  if (fav) fav.href = b.logo || "icons/icon.svg";
  try { window.pywebview?.api?.set_title?.(b.name); } catch { /* 網頁版沒有 */ }
}

// 上傳的 Logo 縮成 256px 方形 PNG（存成 dataURL）
export function readLogo(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = () => rej(new Error("讀取圖片失敗"));
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => rej(new Error("不是可讀取的圖片"));
      im.onload = () => {
        const S = 256, c = document.createElement("canvas");
        c.width = c.height = S;
        const g = c.getContext("2d");
        const k = Math.min(S / im.width, S / im.height);
        const w = im.width * k, h = im.height * k;
        g.drawImage(im, (S - w) / 2, (S - h) / 2, w, h);
        res(c.toDataURL("image/png"));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

export function loadImage(src) {
  return new Promise((res) => { if (!src) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
}

// 在畫布右下角畫品牌浮水印（Logo＋文字）
export async function drawWatermark(g, W, H, scale = 1) {
  if (!watermark()) return;
  drawWatermarkSync(g, W, H, scale, await loadImage(brand().logo));
}
export function drawWatermarkSync(g, W, H, scale, logo) {
  const text = watermark();
  if (!text) return;
  const fs = Math.round(22 * scale), pad = Math.round(20 * scale), ls = Math.round(34 * scale);
  g.save();
  g.font = `600 ${fs}px 'Noto Sans TC', sans-serif`;
  g.textAlign = "right"; g.textBaseline = "middle";
  const tw = g.measureText(text).width;
  const boxW = tw + (logo ? ls + 10 * scale : 0) + pad * 1.2, boxH = Math.max(ls, fs) + pad * 0.8;
  const x = W - pad - boxW, y = H - pad - boxH;
  g.globalAlpha = 0.55; g.fillStyle = "#000";
  g.beginPath(); g.roundRect ? g.roundRect(x, y, boxW, boxH, 10 * scale) : g.rect(x, y, boxW, boxH); g.fill();
  g.globalAlpha = 0.95; g.fillStyle = "#fff";
  g.fillText(text, W - pad - pad * 0.6, y + boxH / 2);
  if (logo) g.drawImage(logo, x + pad * 0.6, y + (boxH - ls) / 2, ls, ls);
  g.restore();
}

// 設定頁的「品牌」與「浮水印」區塊
export function brandSettingsHtml(esc) {
  const b = brand();
  return `
    <div class="card" style="margin-top:16px">
      <h3>🎨 品牌設定 <span class="badge ok">PRO</span></h3>
      <p class="muted small">換成你的公司名稱、Logo 和主色，會套用到整個軟體、歌詞卡與 MV 影片。</p>
      <div class="kv"><label for="b-name">品牌名稱</label><input id="b-name" type="text" maxlength="20" value="${esc(b.name)}"></div>
      <div class="kv"><span class="lbl">Logo</span>
        <div class="row"><img id="b-logo-prev" src="${esc(b.logo || "icons/icon.svg")}" alt="" style="width:56px;height:56px;border-radius:12px;background:#1a0f2c;object-fit:contain">
          <label class="btn btn-ghost btn-sm">上傳圖片<input type="file" id="b-logo" accept="image/*" hidden></label>
          <button class="btn btn-ghost btn-sm" id="b-logo-clear">用預設</button></div></div>
      <div class="kv"><span class="lbl">主色</span>
        <div class="row"><input type="color" id="b-c1" value="${esc(b.c1)}"> <input type="color" id="b-c2" value="${esc(b.c2)}">
          <span id="b-sample" class="btn btn-sm" style="pointer-events:none">預覽按鈕</span>
          <button class="btn btn-ghost btn-sm" id="b-reset">恢復預設</button></div></div>
    </div>
    <div class="card" style="margin-top:16px">
      <h3>💧 浮水印 <span class="badge ok">PRO</span></h3>
      <p class="muted small">加在歌詞卡和 MV 影片的右下角，例如品牌名稱、LINE ID、電話或網址。</p>
      <label class="row small"><input type="checkbox" id="b-wm" ${b.wmOn ? "checked" : ""}> 開啟浮水印</label>
      <div class="kv" style="margin-top:8px"><label for="b-wmt">浮水印文字（留空就用品牌名稱）</label><input id="b-wmt" type="text" maxlength="40" value="${esc(b.wmText)}" placeholder="例如：為你而唱 · LINE @singforyou"></div>
    </div>`;
}

export function bindBrandSettings($, toast) {
  const live = () => {
    saveSettings({
      brandName: $("#b-name").value.trim() || DEFAULT_BRAND.brandName,
      brandC1: $("#b-c1").value, brandC2: $("#b-c2").value,
      wmOn: $("#b-wm").checked, wmText: $("#b-wmt").value.trim(),
    });
    applyBrand();
  };
  ["#b-name", "#b-c1", "#b-c2", "#b-wmt"].forEach((id) => $(id).addEventListener("input", live));
  $("#b-wm").addEventListener("change", live);
  $("#b-logo").addEventListener("change", async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { const url = await readLogo(f); saveSettings({ brandLogo: url }); $("#b-logo-prev").src = url; applyBrand(); toast("Logo 已更新"); }
    catch (er) { toast(er.message, true); }
  });
  $("#b-logo-clear").onclick = () => { saveSettings({ brandLogo: "" }); $("#b-logo-prev").src = "icons/icon.svg"; applyBrand(); };
  $("#b-reset").onclick = () => {
    $("#b-c1").value = DEFAULT_BRAND.brandC1; $("#b-c2").value = DEFAULT_BRAND.brandC2; live(); toast("已恢復預設顏色");
  };
}
