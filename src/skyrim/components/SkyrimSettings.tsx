import React, { useState, useEffect, useRef } from 'react';
import {
  Settings, X, AlertCircle, RefreshCw, Activity, Cloud, Save, CloudOff,
  Download, Upload, Clipboard, Trash2
} from 'lucide-react';
import { skyrimAudio } from '../utils/audio';
import {
  subscribeSync, getSetting, setSetting, checkGasUrl, testCloudConnect,
  forceSyncCloud, exportBackupJSON, pushBackupToCloud, importBackupJSON,
  deleteLocalDatabase, getDiagnosticReport, toast, EMPTY_SYNC, SYNC_LABEL
} from '../store';

interface SettingsProps {
  onClose: () => void;
}

export const SkyrimSettings: React.FC<SettingsProps> = ({ onClose }) => {
  const [sync, setSync] = useState(EMPTY_SYNC);
  const [gasUrl, setGasUrl] = useState('');
  const [gasSecret, setGasSecret] = useState('');
  const [urlProblem, setUrlProblem] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [diagnosticText, setDiagnosticText] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = subscribeSync(setSync);
    
    // Load initial settings
    getSetting('gas_url').then(setGasUrl);
    getSetting('gas_secret').then(setGasSecret);

    return () => unsub();
  }, []);

  const handleForceSync = async () => {
    setLoading('sync');
    setStatusText('同步中...');
    try {
      const res = await forceSyncCloud();
      setStatusText(res.summary);
      if (res.ok) {
        toast("同步完成");
        // Trigger page refresh using store reload shim if required
        globalThis.location.reload();
      } else {
        toast(res.summary, true);
      }
    } catch (e: any) {
      setStatusText("同步出錯: " + e.message);
      toast("同步出錯", true);
    } finally {
      setLoading(null);
    }
  };

  const handleTestConnection = async () => {
    setLoading('test');
    setStatusText('測試連線中...');
    try {
      const res = await testCloudConnect();
      setStatusText(res.detail);
      toast(res.ok ? "連線成功" : "連線失敗", !res.ok);
    } catch (e: any) {
      setStatusText("連線失敗: " + e.message);
      toast("連線失敗", true);
    } finally {
      setLoading(null);
    }
  };

  const handleCloudBackup = async () => {
    setLoading('backup');
    setStatusText('正在推動備份到雲端...');
    try {
      const res = await pushBackupToCloud();
      setStatusText("雲端備份成功: " + JSON.stringify(res));
      toast("雲端備份成功");
    } catch (e: any) {
      setStatusText("備份失敗: " + e.message);
      toast("備份失敗", true);
    } finally {
      setLoading(null);
    }
  };

  const handleSaveUrl = async () => {
    const check = checkGasUrl(gasUrl);
    if (check.problem) {
      setUrlProblem(check.problem);
      toast("URL 格式有誤", true);
      return;
    }
    setLoading('url');
    try {
      await setSetting('gas_url', check.clean);
      toast("URL 儲存成功");
      globalThis.location.reload();
    } catch (e: any) {
      toast("儲存失敗", true);
    } finally {
      setLoading(null);
    }
  };

  const handleSaveSecret = async () => {
    setLoading('secret');
    try {
      await setSetting('gas_secret', gasSecret);
      toast("密鑰儲存成功");
      globalThis.location.reload();
    } catch (e: any) {
      toast("儲存失敗", true);
    } finally {
      setLoading(null);
    }
  };

  const handleExportBackup = async () => {
    try {
      const data = await exportBackupJSON();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `skyrim_fit_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      toast("備份已下載");
    } catch (e: any) {
      toast("導出失敗", true);
    }
  };

  const handleImportBackup = async (file: File | undefined) => {
    if (!file) return;
    const confirm = window.confirm("此操作將覆蓋本機所有數據，確定要匯入嗎？");
    if (!confirm) return;
    setLoading('import');
    try {
      const text = await file.text();
      await importBackupJSON(text);
      toast("還原成功，即將重新載入");
      setTimeout(() => {
        location.reload();
      }, 1500);
    } catch (e: any) {
      toast("還原失敗", true);
    } finally {
      setLoading(null);
    }
  };

  const handleCopyDiagnostic = async () => {
    try {
      const report = await getDiagnosticReport();
      const text = JSON.stringify(report, null, 2);
      await navigator.clipboard.writeText(text);
      setDiagnosticText(text);
      toast("診斷報告已複製");
    } catch (e: any) {
      toast("複製失敗", true);
    }
  };

  const handleClearLocal = async () => {
    setLoading('clear');
    try {
      await deleteLocalDatabase();
      toast("本機數據已清空，即將重新載入");
      setTimeout(() => {
        location.reload();
      }, 1500);
    } catch (e: any) {
      toast("清空失敗", true);
    } finally {
      setLoading(null);
    }
  };

  const textInputStyle = "w-full px-3 py-2 rounded bg-stone-900/90 border border-stone-800 text-amber-100 font-mono text-xs focus:outline-none focus:border-amber-500/60";

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-label="設定卷軸" className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto border border-amber-800/40 bg-[#141311] shadow-[0_0_60px_rgba(0,0,0,0.9)] rounded-lg">
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-gradient-to-b from-[#1c1a16] to-[#141311] border-b border-amber-900/40">
          <Settings className="w-4 h-4 text-amber-400" />
          <div className="font-cinzel text-sm tracking-[0.2em] uppercase text-amber-200/90">見習者之卷 · 設定</div>
          <div className="ml-auto flex items-center gap-3">
            <span className="font-mono text-[10px] text-stone-500">build v3</span>
            <button onClick={() => { skyrimAudio.playMenuClick(); onClose(); }} className="p-1.5 text-stone-400 hover:text-amber-300" aria-label="關閉設定">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-7">
          <section className="space-y-3">
            <div className="border-b border-stone-800 pb-1">
              <h3 className="font-cinzel text-xs text-amber-400/80 tracking-widest font-bold">CLOUD SYNC / 雲端同步</h3>
            </div>
            <div className="border border-stone-700/60 bg-black/30 p-3.5">
              <div className="text-sm font-semibold flex items-center gap-2 text-stone-300">
                <span>狀態：</span>
                <span className={sync.status === 'ok' ? 'text-emerald-400' : 'text-amber-400'}>
                  {SYNC_LABEL[sync.status] || sync.status}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 text-[11px] text-stone-400 font-mono">
                <div>待同步 <span className="text-stone-200 font-semibold">{sync.pending}</span> 列</div>
                <div>衝突 <span className="text-stone-200 font-semibold">{sync.conflicts}</span> 列</div>
                <div className="col-span-2">
                  最後同步 <span className="text-stone-200">{sync.lastSyncAt ? new Date(sync.lastSyncAt).toLocaleString() : "尚未"}</span>
                </div>
              </div>
              {sync.lastError && (
                <div className="mt-2 flex items-start gap-2 text-[11px] text-rose-300/90 font-mono">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span className="break-all">{sync.lastError}</span>
                </div>
              )}
              <div className="mt-3.5 flex flex-wrap gap-2">
                <button
                  disabled={!!loading}
                  onClick={handleForceSync}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-stone-800 bg-stone-900/80 text-[11px] font-cinzel text-stone-300 hover:border-amber-600/60 hover:text-amber-300 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading === 'sync' ? 'animate-spin' : ''}`} />
                  <span>立即同步</span>
                </button>
                <button
                  disabled={!!loading}
                  onClick={handleTestConnection}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-stone-800 bg-stone-900/80 text-[11px] font-cinzel text-stone-300 hover:border-amber-600/60 hover:text-amber-300 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>測試連線</span>
                </button>
                <button
                  disabled={!!loading}
                  onClick={handleCloudBackup}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-stone-800 bg-stone-900/80 text-[11px] font-cinzel text-stone-300 hover:border-amber-600/60 hover:text-amber-300 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>雲端備檔</span>
                </button>
              </div>
              {statusText && (
                <div className="mt-2.5 text-[11px] font-mono text-stone-400 break-all bg-black/40 p-2 border border-stone-900">
                  {statusText}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <div className="border-b border-stone-800 pb-1">
              <h3 className="font-cinzel text-xs text-amber-400/80 tracking-widest font-bold">CONNECTION / 連線憑證</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-[11px] text-stone-500 mb-1">GAS Web App URL（清空並儲存＝停用雲端，回到純離線）</div>
                <input
                  className={textInputStyle}
                  value={gasUrl}
                  onChange={e => { setGasUrl(e.target.value); setUrlProblem(null); }}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  spellCheck={false}
                  autoComplete="off"
                />
                {urlProblem && <div className="mt-1.5 text-[11px] text-rose-300">錯誤：{urlProblem}</div>}
              </div>
              <div>
                <div className="text-[11px] text-stone-500 mb-1">密鑰（只存本機資料庫，不會出現在任何 URL）</div>
                <input
                  className={textInputStyle}
                  type="password"
                  value={gasSecret}
                  onChange={e => setGasSecret(e.target.value)}
                  placeholder={gasSecret.length ? `已存 ${gasSecret.length} 字元` : "尚未設定"}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={!!loading}
                  onClick={handleSaveUrl}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-stone-800 bg-stone-900/80 text-[11px] font-cinzel text-stone-300 hover:border-amber-600/60 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>儲存 URL</span>
                </button>
                <button
                  disabled={!!loading}
                  onClick={() => {
                    setGasUrl('');
                    setSetting('gas_url', '').then(() => {
                      toast("已停用雲端同步");
                      globalThis.location.reload();
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-stone-800 bg-stone-900/80 text-[11px] font-cinzel text-stone-300 hover:border-amber-600/60 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  <CloudOff className="w-3.5 h-3.5" />
                  <span>停用雲端</span>
                </button>
                <button
                  disabled={!!loading}
                  onClick={handleSaveSecret}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-stone-800 bg-stone-900/80 text-[11px] font-cinzel text-stone-300 hover:border-amber-600/60 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>儲存密鑰</span>
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="border-b border-stone-800 pb-1">
              <h3 className="font-cinzel text-xs text-amber-400/80 tracking-widest font-bold">ARCHIVE / 備份與還原</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={!!loading}
                onClick={handleExportBackup}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-stone-800 bg-stone-900/80 text-[11px] font-cinzel text-stone-300 hover:border-amber-600/60 hover:text-amber-300 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>匯出 JSON</span>
              </button>
              <button
                disabled={!!loading}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-stone-800 bg-stone-900/80 text-[11px] font-cinzel text-stone-300 hover:border-amber-600/60 hover:text-amber-300 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>匯入備份檔</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={e => handleImportBackup(e.target.files?.[0])}
              />
            </div>
            <div className="mt-2 text-[11px] leading-relaxed text-stone-500">
              匯入是「整庫取代」，不是合併。App 離線可用，但瀏覽器可能在 7 天後清掉本機資料庫——手動留一份才回來。
            </div>
          </section>

          <section className="space-y-3">
            <div className="border-b border-stone-800 pb-1">
              <h3 className="font-cinzel text-xs text-amber-400/80 tracking-widest font-bold">DIAGNOSTICS / 診斷</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                disabled={!!loading}
                onClick={handleCopyDiagnostic}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-stone-800 bg-stone-900/80 text-[11px] font-cinzel text-stone-300 hover:border-amber-600/60 hover:text-amber-300 transition-colors cursor-pointer"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>複製診斷</span>
              </button>
              <span className="text-[11px] text-stone-500 font-serif-tc">含版號、SW 是否接管、實際存到的 URL、ping 原文（不含密鑰本體）</span>
            </div>
            {diagnosticText && (
              <pre className="mt-3 max-h-52 overflow-auto border border-stone-700/60 bg-black/50 p-3 text-[10.5px] leading-relaxed font-mono text-stone-300 whitespace-pre-wrap break-all">
                {diagnosticText}
              </pre>
            )}
          </section>

          <section className="space-y-3">
            <div className="border-b border-stone-800 pb-1">
              <h3 className="font-cinzel text-xs text-rose-500 tracking-widest font-bold">DANGER / 危險區</h3>
            </div>
            <div className="border border-rose-900/50 bg-rose-950/10 p-3.5 rounded">
              <div className="text-[11px] text-stone-400 leading-relaxed">
                清空本機資料庫（含未同步的佇列）。雲端已同步的列不會被刪，重新連線後可拉回。
              </div>
              <div className="mt-2.5">
                {confirmDelete ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-rose-300 font-serif-tc">確定？此動作無法復原</span>
                    <button
                      disabled={!!loading}
                      onClick={() => { setConfirmDelete(false); handleClearLocal(); }}
                      className="px-3 py-1.5 rounded border border-rose-800/70 bg-rose-950/40 text-[11px] font-cinzel text-rose-200 hover:border-rose-400 transition-colors cursor-pointer"
                    >
                      真的清空
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-1.5 rounded border border-stone-800 bg-stone-900/80 text-[11px] font-cinzel text-stone-300 cursor-pointer"
                    >
                      算了
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { skyrimAudio.playMenuClick(); setConfirmDelete(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-rose-900/60 bg-rose-950/20 text-[11px] font-cinzel text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>清空本機資料</span>
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
