/**
 * hs-tracker v3 本機引擎層（重建版）
 * ─────────────────────────────────────────────────────────────
 * 專案合併時遺失的用戶端引擎：DataLayer / GameCore / GameEngine /
 * SyncManager / GASProxy / DBManager / IDBManager / BackupManager。
 * 全部掛在 globalThis，介面契約以 store.ts / ParchmentScroll.tsx 的呼叫為準。
 *
 * 持久化：localStorage（離線優先、同步寫入、無外部依賴）。
 * 雲端：對接 gas/（Apps Script）的 ping / push / pull / backup / restore 契約，
 *       未設定 gas_url 時為純離線模式。
 */
import skillsJson from '../../data/skills.json';
import badgesJson from '../../data/badges.json';

type AnyObj = Record<string, any>;
const G = () => globalThis as AnyObj;

/* ─────────────────────────── 儲存層 ─────────────────────────── */

const K = {
  settings: 'hst3.settings',
  workouts: 'hst3.workouts',
  exercises: 'hst3.exercises',
  skills: 'hst3.skills',
  badges: 'hst3.badges',
  xplog: 'hst3.xplog',
  queue: 'hst3.queue',
  meta: 'hst3.meta',
};

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 空間不足等異常：離線引擎不中斷 UI */
  }
}

const nowISO = () => new Date().toISOString();
const todayISO = () => new Date().toISOString().slice(0, 10);

function allWorkouts(): AnyObj { return readJSON(K.workouts, {}); }
function allExercises(): AnyObj { return readJSON(K.exercises, {}); }
function allSkills(): AnyObj { return readJSON(K.skills, {}); }
function allBadges(): AnyObj { return readJSON(K.badges, {}); }
function allXpLog(): AnyObj[] { return readJSON(K.xplog, []); }
function settings(): AnyObj { return readJSON(K.settings, {}); }
function setSettingsPatch(patch: AnyObj): AnyObj {
  const cur = { ...settings(), ...patch };
  writeJSON(K.settings, cur);
  return cur;
}

/* ───────────────────── 等級曲線（GameCore） ───────────────────── */

const LEVEL_STEP = 250; // 每級所需 XP（L2=250、L3=500…）
const LEVEL_TITLES = [
  '灰燼學徒', '見習之軀', '荒野旅人', '鐵盾新兵', '星辰獵人',
  '龍語行者', '冰霜騎士', '龍裔挑戰者', '穹頂守護者', '都瓦克因',
];

function levelForXp(totalXp: number): { level: number; title: string; progress: number } {
  const xp = Math.max(0, Number(totalXp) || 0);
  const level = Math.min(99, Math.floor(xp / LEVEL_STEP) + 1);
  const title = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
  const into = xp - (level - 1) * LEVEL_STEP;
  const progress = Math.max(0, Math.min(1, into / LEVEL_STEP));
  return { level, title, progress };
}

/* ─────────────────── 資料存取層（DataLayer） ─────────────────── */

function computeStreak(workouts: AnyObj, refISO: string): { current: number; longest: number } {
  const done = new Set(
    Object.values(workouts)
      .filter((w: AnyObj) => w && w.completed && !w.deleted && typeof w.date === 'string')
      .map((w: AnyObj) => w.date),
  );
  if (done.size === 0) return { current: 0, longest: 0 };

  // longest：掃序數日曆
  const sorted = [...done].sort();
  let longest = 1, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00Z').getTime();
    const cur = new Date(sorted[i] + 'T00:00:00Z').getTime();
    run = cur - prev === 86400000 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  // current：從今天（或昨天）往回數
  let current = 0;
  const cursor = new Date(refISO + 'T00:00:00Z');
  if (!done.has(refISO)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (done.has(cursor.toISOString().slice(0, 10))) {
    current++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return { current, longest: Math.max(longest, current) };
}

function totalXpFromRows(): number {
  return allXpLog().reduce((sum, r) => sum + (Number(r?.amount) || 0), 0);
}

function enqueue(table: string, row: AnyObj): void {
  const queue = readJSON<AnyObj[]>(K.queue, []);
  queue.push({ table, row });
  writeJSON(K.queue, queue);
  SyncManager._emit();
}

const DataLayer = {
  async getSetting(key: string): Promise<string> {
    return String(settings()[String(key)] ?? '');
  },

  async setSetting(key: string, value: string): Promise<void> {
    setSettingsPatch({ [String(key)]: String(value ?? '') });
    enqueue('settings', {
      key: String(key),
      value: String(value ?? ''),
      updated_at: nowISO(),
    });
  },

  async getWorkoutLog(date: string): Promise<AnyObj | null> {
    return allWorkouts()[date] ?? null;
  },

  async getExerciseLogs(date: string): Promise<AnyObj[]> {
    return allExercises()[date] ?? [];
  },

  async getRecentWorkouts(limit = 14): Promise<AnyObj[]> {
    return Object.values(allWorkouts())
      .filter((w: AnyObj) => w && !w.deleted)
      .sort((a: AnyObj, b: AnyObj) => (a.date < b.date ? 1 : -1))
      .slice(0, Number(limit) || 14);
  },

  async logWorkout(payload: AnyObj): Promise<AnyObj> {
    const date = String(payload.date || todayISO());
    const exercises: AnyObj[] = Array.isArray(payload.exercises) ? payload.exercises : [];
    const xpEarned = exercises.reduce((s, e) => s + (e.completed ? Number(e.xp) || 0 : 0), 0);

    const workouts = allWorkouts();
    const prev = workouts[date];
    const row = {
      id: date,
      date,
      phase: Number(payload.phase) || 0,
      day_type: String(payload.dayType || ''),
      completed: !!payload.completed,
      deleted: false,
      xp_earned: xpEarned,
      notes: String(payload.notes ?? ''),
      location: payload.location ?? null,
      created_at: prev?.created_at || nowISO(),
      updated_at: nowISO(),
    };
    workouts[date] = row;
    writeJSON(K.workouts, workouts);

    const exAll = allExercises();
    const exRows: AnyObj[] = exercises.map((e, i) => ({
      id: `${date}#${i}`,
      date,
      exercise_index: i,
      name: String(e.name ?? ''),
      xp: Number(e.xp) || 0,
      completed: !!e.completed,
      updated_at: nowISO(),
    }));
    exAll[date] = exRows;
    writeJSON(K.exercises, exAll);

    // XP 只結算「新完成」的部分（重打不重複加）
    const prevXp = prev && !prev.deleted ? Number(prev.xp_earned) || 0 : 0;
    const delta = xpEarned - prevXp;
    if (delta !== 0) {
      const xplog = allXpLog();
      const today = xplog.filter((r) => r.date === date && r.reason === 'workout');
      if (today.length) {
        today.forEach((r) => { r.amount = Math.max(0, (Number(r.amount) || 0) + delta); r.updated_at = nowISO(); });
      } else {
        xplog.push({ id: `xp-${date}`, date, amount: Math.max(0, delta), reason: 'workout', updated_at: nowISO() });
      }
      writeJSON(K.xplog, xplog);
    }

    enqueue('workout_logs', row);
    exRows.forEach((r) => enqueue('exercise_logs', r));
    if (delta > 0) enqueue('xp_log', { id: `xp-${date}`, date, amount: delta, reason: 'workout', updated_at: nowISO() });

    await GameEngine.evaluateBadges().catch(() => {});
    return row;
  },

  async getTotalXP(): Promise<number> {
    return totalXpFromRows();
  },

  async getWorkoutStreak(refISO: string): Promise<{ current: number; longest: number }> {
    return computeStreak(allWorkouts(), String(refISO || todayISO()));
  },

  async getAllSkillStatuses(): Promise<Record<string, { unlocked: boolean }>> {
    const out: Record<string, { unlocked: boolean }> = {};
    for (const n of nodes()) out[n.id] = { unlocked: !!allSkills()[n.id]?.unlocked };
    return out;
  },
};

/* ─────────────────── 遊戲規則（GameCore） ─────────────────── */

const GameCore = {
  levelFor: levelForXp,
  skillPoints(level: number, spentPoints: number, mult = 1) {
    const total = Math.max(0, (Number(level) || 1) - 1) * (Number(mult) || 1);
    return { total, spent: Number(spentPoints) || 0, available: Math.max(0, total - (Number(spentPoints) || 0)) };
  },
};

/* ─────────────── 遊戲引擎（GameEngine：解鎖／徽章） ─────────────── */

interface SkillNode { id: string; requires?: string[]; min_xp?: number; min_streak?: number; name?: string }
const nodes = (): SkillNode[] => ((skillsJson as AnyObj).nodes || []) as SkillNode[];
const badgeDefs = (): AnyObj[] => ((badgesJson as AnyObj).badges || []) as AnyObj[];

const GameEngine = {
  async init(): Promise<void> {
    // localStorage 為同步儲存，無需非同步準備；順手申請持久化，降低 iOS 清庫風險
    try { navigator.storage?.persist?.(); } catch {}
  },

  async tryUnlockSkill(perkId: string): Promise<{ ok: boolean; why?: string }> {
    const node = nodes().find((n) => n.id === perkId);
    if (!node) return { ok: false, why: '天賦不存在' };

    const skills = allSkills();
    if (skills[perkId]?.unlocked) return { ok: true };

    const unlockedMap = new Set(Object.keys(skills).filter((id) => skills[id]?.unlocked));
    const missing = (node.requires || []).filter((r) => !unlockedMap.has(r));
    if (missing.length) return { ok: false, why: '前置天賦尚未點亮' };

    const totalXp = totalXpFromRows();
    if ((node.min_xp || 0) > totalXp) return { ok: false, why: `經驗不足（需要 ${node.min_xp} XP）` };

    const { current } = computeStreak(allWorkouts(), todayISO());
    if ((node.min_streak || 0) > current) return { ok: false, why: `連續天數不足（需要 ${node.min_streak} 天）` };

    skills[perkId] = { skill_id: perkId, unlocked: true, unlocked_at: nowISO(), updated_at: nowISO() };
    writeJSON(K.skills, skills);

    const xplog = allXpLog();
    xplog.push({ id: `xp-skill-${perkId}`, date: todayISO(), amount: 50, reason: `skill:${perkId}`, updated_at: nowISO() });
    writeJSON(K.xplog, xplog);

    enqueue('skill_progress', { ...skills[perkId] });
    enqueue('xp_log', xplog[xplog.length - 1]);
    await GameEngine.evaluateBadges().catch(() => {});
    return { ok: true };
  },

  async evaluateBadges(): Promise<string[]> {
    const workouts = allWorkouts();
    const sessions = Object.values(workouts).filter((w: AnyObj) => w.completed && !w.deleted).length;
    const totalXp = totalXpFromRows();
    const { current, longest } = computeStreak(workouts, todayISO());
    const metrics: Record<string, number> = {
      total_sessions: sessions,
      total_xp: totalXp,
      current_streak: current,
      longest_streak: longest,
    };

    const earned = allBadges();
    const newly: string[] = [];
    for (const b of badgeDefs()) {
      if (earned[b.id]?.earned_at) continue;
      const value = metrics[String(b.metric)];
      if (value === undefined) continue;
      const target = Number(b.value) || 0;
      const pass = b.op === '>=' ? value >= target : b.op === '>' ? value > target : b.op === '==' ? value === target : false;
      if (pass) {
        earned[b.id] = { badge_id: b.id, earned_at: nowISO(), updated_at: nowISO() };
        newly.push(String(b.id));
        enqueue('badges', { ...earned[b.id] });
      }
    }
    if (newly.length) writeJSON(K.badges, earned);
    return newly;
  },
};

/* ─────────────── 雲端代理（GASProxy，對接 gas/） ─────────────── */

const GAS_URL_RE = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/;

const GASProxy = {
  cleanUrl(raw: string): string {
    let u = String(raw || '').trim().replace(/[\s\u3000]/g, '');
    u = u.replace(/\/dev$/, '/exec');
    return u;
  },
  urlProblem(clean: string): string | null {
    if (!clean) return null;
    if (!/^https:\/\//.test(clean)) return '網址必須以 https:// 開頭';
    if (!GAS_URL_RE.test(clean)) return '格式應為 https://script.google.com/macros/s/…/exec';
    return null;
  },
  async deviceId(): Promise<string> {
    const s = settings();
    if (s.device) return String(s.device);
    const id = 'dev-' + (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    setSettingsPatch({ device: id });
    return id;
  },
  async request(action: string, payload: AnyObj = {}): Promise<AnyObj> {
    const url = settings().gas_url;
    if (!url) throw Object.assign(new Error('尚未設定雲端 URL'), { kind: 'config' });
    const secret = String(settings().gas_secret || '');
    const device = await GASProxy.deviceId();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      // text/plain 避開 GAS 的 CORS 預檢（Apps Script 不處理 OPTIONS）
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, secret, device_id: device, ...payload }),
        signal: ctrl.signal,
        redirect: 'follow',
      });
      const text = await resp.text();
      let json: AnyObj;
      try { json = JSON.parse(text); } catch {
        throw Object.assign(new Error(`回應不是 JSON（HTTP ${resp.status}）`), { kind: 'bad-response' });
      }
      if (json && json.error === 'unauthorized') throw Object.assign(new Error('密鑰不符'), { kind: 'unauthorized' });
      if (json && json.error === 'rate-limited') throw Object.assign(new Error('請求過於頻繁，稍後再試'), { kind: 'rate-limited' });
      return json;
    } catch (e: any) {
      if (e?.name === 'AbortError') throw Object.assign(new Error('連線逾時'), { kind: 'timeout' });
      if (!e?.kind) throw Object.assign(new Error(String(e?.message || e)), { kind: 'network' });
      throw e;
    } finally {
      clearTimeout(timer);
    }
  },
  ping(): Promise<AnyObj> { return GASProxy.request('ping'); },
};

/* ─────────────── 同步管理（SyncManager） ─────────────── */

type SyncStatus = 'init' | 'disabled' | 'syncing' | 'retrying' | 'ok' | 'partial' | 'error';
interface SyncSnapshot { status: SyncStatus; lastSyncAt: string | null; lastError: string | null; pending: number; conflicts: number; disabled: boolean }

const SyncManager = {
  state: {
    status: 'disabled' as SyncStatus,
    lastSyncAt: null as string | null,
    lastError: null as string | null,
    pending: 0,
    conflicts: 0,
    disabled: true,
  } as SyncSnapshot,
  onStateChange: null as null | ((s: SyncSnapshot) => void),
  _timer: null as any,

  _emit() {
    this.state.pending = readJSON<AnyObj[]>(K.queue, []).length;
    this.state.disabled = !settings().gas_url;
    this.onStateChange?.({ ...this.state });
  },

  async refreshPending(): Promise<void> { this._emit(); },

  startAuto(): void {
    if (this._timer) return;
    this._emit();
    this._timer = setInterval(() => {
      if (!settings().gas_url) return this._emit();
      if (navigator.onLine === false) return;
      if (readJSON<AnyObj[]>(K.queue, []).length > 0) this.fullSync().catch(() => {});
    }, 90_000);
  },

  _mergePulled(rows: Record<string, AnyObj[]>): number {
    let conflicts = 0;
    const newer = (incoming: AnyObj, local?: AnyObj) =>
      !local || Date.parse(incoming.updated_at || '') > Date.parse(local.updated_at || '');

    const workouts = allWorkouts();
    (rows.workout_logs || []).forEach((r) => {
      const local = workouts[r.date || r.id];
      if (String(r.op) === 'delete') { if (local) { local.deleted = true; local.updated_at = r.updated_at || nowISO(); conflicts++; } return; }
      if (newer(r, local)) { workouts[r.date || r.id] = { ...local, ...r }; if (local) conflicts++; }
    });
    writeJSON(K.workouts, workouts);

    const exAll = allExercises();
    (rows.exercise_logs || []).forEach((r) => {
      const date = String(r.date || '');
      if (!date) return;
      const list: AnyObj[] = Array.isArray(exAll[date]) ? exAll[date] : [];
      const idx = list.findIndex((x) => x.id === r.id);
      if (String(r.op) === 'delete') { if (idx >= 0) { list.splice(idx, 1); conflicts++; } }
      else if (newer(r, idx >= 0 ? list[idx] : undefined)) {
        if (idx >= 0) { list[idx] = { ...list[idx], ...r }; conflicts++; } else list.push(r);
      }
      exAll[date] = list;
    });
    writeJSON(K.exercises, exAll);

    const skills = allSkills();
    (rows.skill_progress || []).forEach((r) => {
      const id = String(r.skill_id || '');
      if (!id) return;
      if (r.op === 'delete') { if (skills[id]) { delete skills[id]; conflicts++; } return; }
      if (newer(r, skills[id])) { skills[id] = { ...skills[id], ...r }; conflicts++; }
    });
    writeJSON(K.skills, skills);

    const badges = allBadges();
    (rows.badges || []).forEach((r) => {
      const id = String(r.badge_id || '');
      if (!id || r.op === 'delete') return;
      if (!badges[id]) { badges[id] = { badge_id: id, earned_at: r.earned_at || nowISO(), updated_at: nowISO() }; conflicts++; }
    });
    writeJSON(K.badges, badges);

    (rows.settings || []).forEach((r) => {
      if (!r.key || r.op === 'delete') return;
      if (String(r.key) === 'gas_secret') return; // 密鑰只留在本機
      if (settings()[String(r.key)] !== String(r.value ?? '')) setSettingsPatch({ [String(r.key)]: String(r.value ?? '') });
    });
    return conflicts;
  },

  async fullSync(): Promise<{ pulled?: number; pushed?: number; conflicts?: number; truncated?: boolean; skipped?: string }> {
    const url = settings().gas_url;
    if (!url) { this.state.status = 'disabled'; this._emit(); return { skipped: 'no-url' }; }

    this.state.status = 'syncing';
    this._emit();
    try {
      let pushed = 0, truncated = false;
      // 1) push：把待同步佇列整批送上（伺服器單次上限內分批）
      let queue = readJSON<AnyObj[]>(K.queue, []);
      while (queue.length) {
        const tables: Record<string, AnyObj[]> = {};
        queue.slice(0, 200).forEach(({ table, row }) => { (tables[table] = tables[table] || []).push(row); });
        const resp = await GASProxy.request('push', { tables });
        if (resp?.ok === false) throw new Error(resp?.error || 'push 失敗');
        const acked = resp?.acked || {};
        const ackedCount = Object.values(acked).reduce((s: number, a: any) => s + (Number((a as AnyObj)?.count) || 0), 0);
        pushed += ackedCount;
        truncated = queue.length > 200;
        queue = queue.slice(200);
        writeJSON(K.queue, queue);
        if (!ackedCount && !truncated) break;
      }

      // 2) pull：抓 server_ts 之後的變更並合併
      const meta = readJSON<AnyObj>(K.meta, {});
      const pullResp = await GASProxy.request('pull', { since: meta.since || null });
      if (pullResp?.ok === false) throw new Error(pullResp?.error || 'pull 失敗');
      const pulledRows = pullResp?.rows || {};
      const conflicts = this._mergePulled(pulledRows);
      const pulled = Object.values(pulledRows).reduce((s: number, list: any) => s + (Array.isArray(list) ? list.length : 0), 0);
      meta.since = pullResp?.server_ts || nowISO();
      meta.lastSyncAt = nowISO();
      writeJSON(K.meta, meta);

      this.state.status = 'ok';
      this.state.lastSyncAt = meta.lastSyncAt;
      this.state.lastError = null;
      this.state.conflicts = conflicts;
      this._emit();
      return { pulled, pushed, conflicts, truncated };
    } catch (e: any) {
      this.state.status = 'error';
      this.state.lastError = String(e?.message || e);
      this._emit();
      throw e;
    }
  },
};

/* ─────────── 落盤／清理（DBManager / IDBManager） ─────────── */

const DBManager = {
  IDB_KEY: 'hst3',
  db: { close: async () => {} },
  async flushNow(): Promise<void> { /* localStorage 同步落盤，無需 flush */ },
};

const IDBManager = {
  async delete(key: string): Promise<boolean> {
    if (String(key) !== 'hst3' && String(key) !== '*') {
      // 舊名稱（IndexedDB 時代）的相容清理
      try { indexedDB.deleteDatabase(String(key)); } catch {}
      return true;
    }
    Object.values(K).forEach((k) => { try { localStorage.removeItem(k); } catch {} });
    try { indexedDB.deleteDatabase('hs-tracker'); } catch {}
    try { indexedDB.deleteDatabase('hs-tracker-v2'); } catch {}
    SyncManager.state = { status: 'disabled', lastSyncAt: null, lastError: null, pending: 0, conflicts: 0, disabled: true };
    return true;
  },
};

/* ─────────────── 備份（BackupManager） ─────────────── */

const BackupManager = {
  async exportJSON(): Promise<string> {
    return JSON.stringify({
      version: 3,
      app: 'hs-tracker',
      exported_at: nowISO(),
      data: {
        workouts: allWorkouts(),
        exercises: allExercises(),
        skills: allSkills(),
        badges: allBadges(),
        xp_log: allXpLog(),
        settings: { gas_url: String(settings().gas_url || '') }, // 密鑰不進備份
      },
    }, null, 2);
  },

  async importFromFile(file: File): Promise<{ ok: boolean; summary?: string }> {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const d = parsed?.data || parsed;
    if (!d || typeof d !== 'object' || !d.workouts) throw new Error('備份檔格式不正確（缺少 data.workouts）');
    if (d.workouts) writeJSON(K.workouts, d.workouts);
    if (d.exercises) writeJSON(K.exercises, d.exercises);
    if (d.skills) writeJSON(K.skills, d.skills);
    if (d.badges) writeJSON(K.badges, d.badges);
    if (Array.isArray(d.xp_log)) writeJSON(K.xplog, d.xp_log);
    if (d.settings?.gas_url) setSettingsPatch({ gas_url: String(d.settings.gas_url) });
    const sessions = Object.values(allWorkouts()).filter((w: AnyObj) => w.completed && !w.deleted).length;
    return { ok: true, summary: `已還原 ${Object.keys(allWorkouts()).length} 筆記錄（${sessions} 次訓練）` };
  },

  async pushBackupToCloud(): Promise<AnyObj> {
    const payload = JSON.parse(await BackupManager.exportJSON());
    const resp = await GASProxy.request('backup', { payload });
    if (resp?.ok === false) throw new Error(resp?.error || 'backup 失敗');
    return resp;
  },
};

/* ─────────────────── 掛載到 globalThis ─────────────────── */

export function installEngine(): void {
  const g = G();
  // 注意：不可用 if (!g.X) 守衛 —— 例如 SyncManager 是瀏覽器原生建構函數
  // （Service Worker Background Sync API），守衛會讓引擎整個裝不上去。
  g.DataLayer = DataLayer;
  g.GameCore = GameCore;
  g.GameEngine = GameEngine;
  g.GASProxy = GASProxy;
  g.SyncManager = SyncManager;
  g.DBManager = DBManager;
  g.IDBManager = IDBManager;
  g.BackupManager = BackupManager;
  // 已設定 URL 的裝置視為可同步；否則純離線
  SyncManager.state.status = settings().gas_url ? 'ok' : 'disabled';
  SyncManager.state.disabled = !settings().gas_url;
  SyncManager._emit();
}

installEngine();
