export interface Stats {
  totalXP: number;
  level: number;
  levelTitle: string;
  progress: number;
  streak: number;
  longestStreak: number;
  points: {
    total: number;
    spent: number;
    available: number;
  };
  unlocked: Record<string, boolean>;
  unlockedCount: number;
  ready: boolean;
  error?: string;
}

export interface SyncState {
  status: string;
  lastSyncAt: string | null;
  lastError: string | null;
  pending: number;
  conflicts: number;
  disabled: boolean;
}

export const EMPTY_STATS: Stats = {
  totalXP: 0,
  level: 1,
  levelTitle: "灰燼學徒",
  progress: 0,
  streak: 0,
  longestStreak: 0,
  points: {
    total: 0,
    spent: 0,
    available: 0,
  },
  unlocked: {},
  unlockedCount: 0,
  ready: false,
};

export const EMPTY_SYNC: SyncState = {
  status: "init",
  lastSyncAt: null,
  lastError: null,
  pending: 0,
  conflicts: 0,
  disabled: false,
};

export const SYNC_LABEL: Record<string, string> = {
  init: "就緒中",
  disabled: "純離線（未啟用雲端）",
  syncing: "同步中",
  retrying: "重試中",
  ok: "已同步",
  partial: "部分同步（佇列未清空）",
  error: "同步失敗",
};

const We = () => globalThis as any;

function Ux(level: number, spentPoints: number) {
  const h = We().GameCore;
  if (h?.skillPoints) {
    return h.skillPoints(level, spentPoints, 1);
  }
  const total = Math.max(0, (level || 1) - 1);
  return {
    total,
    spent: spentPoints,
    available: Math.max(0, total - spentPoints),
  };
}

export async function loadStats(): Promise<Stats> {
  try {
    const o = We().DataLayer;
    const d = We().GameEngine;
    const h = We().GameCore;
    if (!o || !h) {
      throw new Error("本機引擎尚未載入");
    }
    if (d?.init) {
      try {
        await d.init();
      } catch {}
    }
    const r = await o.getTotalXP();
    const E = h.levelFor(r);
    const v = await o.getWorkoutStreak(new Date().toISOString().slice(0, 10));
    const N = await o.getAllSkillStatuses();
    const T: Record<string, boolean> = {};
    for (const [b, A] of Object.entries(N)) {
      T[b] = !!(A as any)?.unlocked;
    }
    const p = Object.values(T).filter(Boolean).length;
    return {
      totalXP: r,
      level: E.level,
      levelTitle: E.title || "",
      progress: E.progress || 0,
      streak: v?.current || 0,
      longestStreak: v?.longest || 0,
      points: Ux(E.level, p),
      unlocked: T,
      unlockedCount: p,
      ready: true,
    };
  } catch (o: any) {
    return {
      ...EMPTY_STATS,
      error: o?.message || String(o),
    };
  }
}

export async function unlockSkillNode(perkId: string): Promise<any> {
  const d = We().GameEngine;
  if (!d?.tryUnlockSkill) {
    throw new Error("本機資料庫尚未就緒");
  }
  return d.tryUnlockSkill(perkId);
}

let toastSubscriber: ((t: { text: string; error?: boolean }) => void) | null = null;

const Lx = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F]/gu;
const Hx = (o: any) => String(o ?? "").replace(Lx, "").replace(/\s{2,}/g, " ").trim();

export function onToast(cb: (t: { text: string; error?: boolean }) => void) {
  toastSubscriber = cb;
  return () => {
    toastSubscriber = null;
  };
}

export function toast(message: string, error?: boolean) {
  toastSubscriber?.({ text: Hx(message), error });
}

let confirmSubscriber: ((m: string) => Promise<boolean>) | null = null;

export function onConfirm(cb: ((m: string) => Promise<boolean>) | null) {
  confirmSubscriber = cb;
}

export function installUiShim() {
  const o = We();
  o.UI = {
    toast: (d: any, h: any) => toast(String(d ?? ""), !!h),
    softReload: true,
    refresh: async () => {
      await o.App?.refresh?.();
    },
    confirm: async (d: string) => {
      return confirmSubscriber ? confirmSubscriber(d) : window.confirm(d);
    },
  };
  return o.UI;
}

export function subscribeSync(cb: (s: SyncState) => void) {
  const d = We().SyncManager;
  if (d) {
    d.onStateChange = (h: any) => cb({ ...EMPTY_SYNC, ...h });
    cb({ ...EMPTY_SYNC, ...d.state });
    d.refreshPending?.().catch(() => {});
    d.startAuto?.();
    return () => {
      d.onStateChange = null;
    };
  } else {
    cb(EMPTY_SYNC);
    return () => {};
  }
}

export async function getSetting(key: string): Promise<string> {
  try {
    return (await We().DataLayer?.getSetting?.(key)) ?? "";
  } catch {
    return "";
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  const h = We().DataLayer;
  if (!h?.setSetting) {
    throw new Error("本機資料庫尚未就緒");
  }
  await h.setSetting(key, value);
}

export function checkGasUrl(url: string) {
  const d = We().GASProxy;
  const h = d?.cleanUrl ? d.cleanUrl(url) : String(url || "").trim();
  const r = d?.urlProblem ? d.urlProblem(h) : null;
  return { clean: h, problem: r || null };
}

export async function testCloudConnect(): Promise<{ ok: boolean; detail: string }> {
  try {
    const o = await We().GASProxy.ping();
    return { ok: true, detail: `連通：${JSON.stringify(o).slice(0, 120)}` };
  } catch (o: any) {
    return { ok: false, detail: `${o?.kind || "error"}：${o?.message || o}` };
  }
}

export async function forceSyncCloud(): Promise<{ ok: boolean; summary: string }> {
  const o = We();
  try {
    await o.DBManager?.flushNow?.();
  } catch {}
  const d = o.SyncManager;
  if (!d?.fullSync) {
    return { ok: false, summary: "同步模組尚未載入" };
  }
  try {
    const h = await d.fullSync();
    return h?.skipped === "no-url"
      ? { ok: false, summary: "尚未設定雲端 URL——目前是純離線模式" }
      : h?.skipped
      ? { ok: false, summary: `略過：${h.skipped}` }
      : {
          ok: true,
          summary: `下載 ${h.pulled ?? 0} 列・上傳 ${h.pushed ?? 0} 列${
            h.conflicts ? `・衝突 ${h.conflicts}` : ""
          }${h.truncated ? "・佇列未清空（再按一次）" : ""}`,
        };
  } catch (h: any) {
    return { ok: false, summary: `同步失敗：${h?.kind || ""} ${h?.message || h}`.trim() };
  }
}

export async function exportBackupJSON(): Promise<string> {
  const o = We().BackupManager;
  if (!o?.exportJSON) {
    throw new Error("備份模組尚未載入");
  }
  return o.exportJSON();
}

export async function pushBackupToCloud(): Promise<any> {
  const o = We().BackupManager;
  if (!o?.pushBackupToCloud) {
    throw new Error("備份模組尚未載入");
  }
  return o.pushBackupToCloud();
}

export async function importBackupJSON(file: string): Promise<any> {
  const d = We().BackupManager;
  if (!d?.importFromFile) {
    throw new Error("備份模組尚未載入");
  }
  return d.importFromFile(file);
}

export async function deleteLocalDatabase(): Promise<boolean> {
  const o = We();
  if (!o.IDBManager?.delete || !o.DBManager?.IDB_KEY) {
    throw new Error("落盤模組尚未提供刪除介面");
  }
  await o.IDBManager.delete(o.DBManager.IDB_KEY);
  try {
    await o.DBManager.db?.close?.();
  } catch {}
  return true;
}

export async function getDiagnosticReport(): Promise<any> {
  const o = We();
  const d: any = {
    t: new Date().toISOString(),
    build: "v3",
    ua: navigator?.userAgent || "?",
    origin: location?.origin || "?",
    path: location?.pathname || "?",
    sw_controlled: !!navigator?.serviceWorker?.controller,
    gas_url: (await getSetting("gas_url")) || "(未設定)",
    secret_len: String(await getSetting("gas_secret") || "").length,
    pending: o.SyncManager?.state?.pending ?? "?",
    status: o.SyncManager?.state?.status ?? "n/a",
    last_error: o.SyncManager?.state?.lastError ?? null,
    persisted: navigator?.storage?.persisted ? await navigator.storage.persisted() : "n/a",
  };
  try {
    d.device_id = await o.GASProxy?.deviceId?.();
  } catch (h: any) {
    d.device_id_error = String(h?.message || h);
  }
  return d;
}
