// 設定（localStorage）與歌曲資料（IndexedDB）

const SKEY = "sfy.settings.v1";
const DEFAULTS = {
  musicKey: "",
  musicBase: "https://api.sunoapi.org",
  musicModel: "V6",
  callbackUrl: "",
  negativeTags: "",
  claudeKey: "",
  claudeBase: "",
  claudeModel: "claude-opus-5-5",
  saveAudio: true,
};

export function getSettings() {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(SKEY)) || {}) };
  } catch {
    return { ...DEFAULTS };
  }
}
export function saveSettings(patch) {
  const s = { ...getSettings(), ...patch };
  try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch { /* ignore */ }
  return s;
}

const DRAFT = "sfy.draft.v1";
export function getDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT)) || null; } catch { return null; }
}
export function saveDraft(d) {
  try { d ? localStorage.setItem(DRAFT, JSON.stringify(d)) : localStorage.removeItem(DRAFT); } catch { /* ignore */ }
}

// ── IndexedDB ──
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open("singforyou", 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore("songs", { keyPath: "id" });
      d.createObjectStore("blobs");
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function tx(store, mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(store, mode);
    const st = t.objectStore(store);
    const out = fn(st);
    t.oncomplete = () => res(out && "result" in out ? out.result : out);
    t.onerror = () => rej(t.error);
  });
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export async function listSongs() {
  const all = await tx("songs", "readonly", (s) => s.getAll());
  return (all || []).sort((a, b) => b.createdAt - a.createdAt);
}
export const getSong = (id) => tx("songs", "readonly", (s) => s.get(id));
export async function putSong(song) {
  song.updatedAt = Date.now();
  await tx("songs", "readwrite", (s) => s.put(song));
  window.dispatchEvent(new CustomEvent("sfy:song", { detail: song.id }));
  return song;
}
export async function deleteSong(song) {
  await tx("songs", "readwrite", (s) => s.delete(song.id));
  for (const v of song.versions || []) for (const t of v.tracks || []) {
    if (t.blobKey) await tx("blobs", "readwrite", (s) => s.delete(t.blobKey));
  }
}
export const putBlob = (key, blob) => tx("blobs", "readwrite", (s) => s.put(blob, key));
export const getBlob = (key) => tx("blobs", "readonly", (s) => s.get(key));

export async function exportAll() {
  const songs = await listSongs();
  return { app: "為你而唱", version: 1, exportedAt: new Date().toISOString(), songs };
}
export async function importAll(data) {
  if (!data || !Array.isArray(data.songs)) throw new Error("檔案格式不正確");
  let n = 0;
  for (const s of data.songs) {
    if (!s.id) continue;
    for (const v of s.versions || []) for (const t of v.tracks || []) delete t.blobKey;
    await putSong(s);
    n++;
  }
  return n;
}
