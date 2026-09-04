import React, { useState } from 'react';
import { skyrimAudio } from '../utils/audio';
import workoutData from '../../../data/workout.json';

const _0: Record<string, string> = (workoutData as any).kind_labels || {
  warmup: "熱身",
  hold: "支撐",
  strength: "力量",
  core: "核心",
  mobility: "柔韌",
  play: "自由練習",
  assess: "評估",
  skill: "技巧"
};

const Ol = (o: any) => String(o ?? "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F]/gu, "").replace(/\s{2,}/g, " ").trim();

const buildInventoryList = () => {
  const o: Record<string, { sets: number; items: Set<string>; kind: string }> = {};
  for (const h of Object.values((workoutData as any).phases || {})) {
    for (const r of Object.values((h as any).days || {})) {
      const itemsList = Array.isArray(r) ? r : (r as any).exercises || (r as any).items || [];
      for (const E of itemsList) {
        const v = E.kind || "misc";
        o[v] = o[v] || { sets: 0, items: new Set(), kind: v };
        o[v].sets += Number(E.sets) || 0;
        o[v].items.add(E.name || E.id);
      }
    }
  }
  const d: Record<string, string> = {
    strength: "weapons",
    core: "weapons",
    hold: "apparel",
    mobility: "potions",
    play: "misc",
    skill: "scrolls",
    warmup: "apparel",
    assess: "scrolls"
  };
  return Object.entries(o).map(([h, r]) => ({
    id: h,
    name: `${_0[h] || h}`,
    category: d[h] || "misc",
    type: `${r.items.size} 個動作`,
    weight: r.sets,
    value: r.sets * 10,
    description: `全計劃共 ${r.sets} 組；包含 ${[...r.items].slice(0, 4).join("、")}${r.items.size > 4 ? "…" : ""}`,
    enchantment: h === "mobility" ? "退階版優先（受傷防控最高優先級）" : undefined,
    iconType: h === "strength" ? "Swords" : h === "core" ? "Zap" : h === "mobility" ? "Wand2" : "Star",
    isEquipped: false,
    damage: h === "strength" ? r.sets * 2 : undefined,
    armor: h === "hold" ? r.sets * 3 : undefined,
  }));
};

export const SkyrimInventory: React.FC<{
  onReadScrollClick?: () => void;
}> = ({ onReadScrollClick }) => {
  const [items, setItems] = useState(() => buildInventoryList());
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id || "strength");

  const filteredItems = items.filter(f => categoryFilter === "all" ? true : f.category === categoryFilter);
  const selectedItem = items.find(f => f.id === selectedItemId) || items[0];

  const handleItemClick = (item: any) => {
    setSelectedItemId(item.id);
    skyrimAudio.playMenuClick();
  };

  const handleEquipClick = (itemId: string) => {
    setItems(prev => prev.map(w => {
      if (w.id === itemId) {
        const nextEquipped = !w.isEquipped;
        if (nextEquipped) {
          skyrimAudio.playEquip();
        } else {
          skyrimAudio.playMenuClick();
        }
        return { ...w, isEquipped: nextEquipped };
      }
      return w;
    }));
  };

  const totalWeight = items.reduce((sum, item) => sum + (item.isEquipped ? item.weight : 0), 0);

  return (
    <section className="relative w-full py-8 px-3 sm:px-6 md:px-8 max-w-6xl mx-auto flex flex-col items-center">
      <div className="w-full flex flex-col items-center text-center mb-6">
        <div className="flex items-center gap-3 text-amber-500/80 mb-1">
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-amber-500/60" />
          <span className="font-cinzel text-xs tracking-widest uppercase">Inventory & Equipment</span>
          <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-amber-500/60" />
        </div>
        <h2 className="font-cinzel-dec text-2xl sm:text-3xl md:text-4xl text-amber-100 tracking-wider font-bold drop-shadow-[0_2px_12px_rgba(245,158,11,0.3)]">
          龍裔裝備庫存欄
        </h2>
        <p className="font-marcellus text-stone-400 text-xs sm:text-sm mt-1.5 max-w-2xl">
          原汁原味重現天際省清爽經典的分割式庫存介面、菱形標記與 3D 擬真物品檢視。
        </p>
      </div>

      <div className="w-full flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-stone-950/80 border border-stone-800 mb-6">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
          {[
            { id: "all", label: "全部 ALL" },
            { id: "weapons", label: "武器 WEAPONS" },
            { id: "apparel", label: "護甲 APPAREL" },
            { id: "scrolls", label: "卷軸 SCROLLS" },
            { id: "potions", label: "藥水 POTIONS" },
            { id: "misc", label: "雜項 MISC" }
          ].map(f => (
            <button
              key={f.id}
              id={`inv-category-${f.id}`}
              onClick={() => {
                setCategoryFilter(f.id);
                skyrimAudio.playMenuClick();
              }}
              className={`px-3 py-1.5 rounded font-cinzel text-xs tracking-wider transition-all cursor-pointer ${
                categoryFilter === f.id
                  ? "bg-amber-950 text-amber-200 border border-amber-600/70 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                  : "bg-stone-900/60 text-stone-400 border border-stone-800 hover:text-stone-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs font-cinzel text-stone-300">
          <div className="flex items-center gap-1">
            <span className="text-stone-500">負重 (WEIGHT):</span>
            <span className="text-amber-300 font-semibold">{totalWeight.toFixed(1)} / 450</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-stone-500">金幣 (GOLD):</span>
            <span className="text-amber-400 font-semibold">{(34850).toLocaleString()} 賽普汀</span>
          </div>
        </div>
      </div>

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 rounded-xl border border-stone-800 bg-stone-950/70 p-3 flex flex-col h-[520px]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-stone-800 text-[11px] font-cinzel text-stone-500">
            <span>物品名稱 (ITEM)</span>
            <div className="flex items-center gap-6">
              <span>重量</span>
              <span>價值</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 pt-2">
            {filteredItems.map(f => {
              const active = selectedItemId === f.id;
              return (
                <div
                  key={f.id}
                  id={`item-row-${f.id}`}
                  onClick={() => handleItemClick(f)}
                  className={`group flex items-center justify-between px-3 py-2.5 transition-all duration-300 cursor-pointer select-none border-b border-stone-800/40 ${
                    active
                      ? "text-[#d4af37] !pl-4 font-bold border-b !border-[#8b0000] bg-stone-900/80 shadow-[0_0_8px_rgba(139,0,0,0.3)]"
                      : "text-stone-300 hover:bg-stone-900/40 hover:text-white hover:pl-3.5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 flex items-center justify-center">
                      {f.isEquipped && (
                        <div className="w-2 h-2 rotate-45 bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
                      )}
                    </div>
                    <span className={`font-cinzel text-xs sm:text-sm tracking-wide ${active ? "font-bold" : ""}`}>
                      {f.name.split("(")[0]}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-xs font-cinzel text-stone-400">
                    <span className="w-8 text-right">{f.weight}</span>
                    <span className="w-12 text-right text-amber-300/90 font-medium">{f.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-7 rounded-xl border border-stone-800 bg-gradient-to-b from-[#161210] to-[#0c0a09] p-6 flex flex-col justify-between h-[520px] shadow-2xl relative overflow-hidden">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          {selectedItem && (
            <>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-cinzel tracking-widest text-amber-500/80 uppercase">
                    {selectedItem.category}
                  </span>
                  {selectedItem.isEquipped && (
                    <span className="text-[10px] font-cinzel text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/80">
                      EQUIPPED (已裝備)
                    </span>
                  )}
                </div>
                <h3 className="font-cinzel text-xl sm:text-2xl text-amber-100 font-bold tracking-wide mt-1">
                  {selectedItem.name}
                </h3>
              </div>

              <div className="flex-1 flex items-center justify-center relative my-4">
                <div className="relative group transition-transform duration-500 hover:scale-105">
                  {selectedItem.category === "weapons" && (
                    <div className="w-48 h-48 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-36 h-36 drop-shadow-[0_10px_20px_rgba(245,158,11,0.3)]">
                        <path d="M75 15 L85 25 L45 65 L40 60 Z" fill="#b45309" />
                        <path d="M40 60 L45 65 L35 75 L30 70 Z" fill="#78350f" />
                        <line x1="75" y1="15" x2="35" y2="55" stroke="#fef3c7" strokeWidth="2" />
                        <circle cx="28" cy="78" r="4" fill="#d97706" />
                      </svg>
                    </div>
                  )}
                  {selectedItem.category === "apparel" && (
                    <div className="w-48 h-48 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-36 h-36 drop-shadow-[0_10px_20px_rgba(56,189,248,0.3)]">
                        <path d="M30 20 L70 20 L80 50 L50 85 L20 50 Z" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
                        <circle cx="50" cy="45" r="14" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
                      </svg>
                    </div>
                  )}
                  {selectedItem.category === "scrolls" && (
                    <div className="w-48 h-48 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-36 h-36 drop-shadow-[0_10px_20px_rgba(245,158,11,0.4)]">
                        <rect x="25" y="30" width="50" height="40" rx="3" fill="#ede2c9" stroke="#92400e" strokeWidth="2" />
                        <line x1="20" y1="30" x2="80" y2="30" stroke="#78350f" strokeWidth="5" strokeLinecap="round" />
                        <line x1="20" y1="70" x2="80" y2="70" stroke="#78350f" strokeWidth="5" strokeLinecap="round" />
                        <circle cx="50" cy="50" r="8" fill="#b91c1c" />
                      </svg>
                    </div>
                  )}
                  {selectedItem.category === "potions" && (
                    <div className="w-48 h-48 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-36 h-36 drop-shadow-[0_10px_20px_rgba(239,68,68,0.4)]">
                        <path d="M45 20 L55 20 L55 35 L70 65 C75 75, 65 85, 50 85 C35 85, 25 75, 30 65 L45 35 Z" fill="#991b1b" stroke="#f87171" strokeWidth="2" />
                        <rect x="42" y="16" width="16" height="6" fill="#78350f" rx="1" />
                      </svg>
                    </div>
                  )}
                  {selectedItem.category === "misc" && (
                    <div className="w-48 h-48 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-36 h-36 drop-shadow-[0_10px_20px_rgba(251,191,36,0.3)]">
                        <circle cx="50" cy="50" r="28" fill="#d97706" />
                        <circle cx="50" cy="50" r="10" fill="#1c1917" />
                        <path d="M35 35 Q50 30 65 35 Q70 50 65 65 Q50 70 35 65 Z" fill="#fef3c7" opacity="0.8" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full space-y-3 pt-3 border-t border-stone-800 animate-fade-in">
                <div className="flex items-center justify-around py-2 rounded bg-stone-900/80 border border-stone-800 text-xs font-cinzel">
                  {selectedItem.damage && (
                    <div className="text-center">
                      <div className="text-stone-500 text-[10px]">攻擊傷害 (DAMAGE)</div>
                      <div className="text-amber-300 font-bold text-sm">{selectedItem.damage}</div>
                    </div>
                  )}
                  {selectedItem.armor && (
                    <div className="text-center">
                      <div className="text-stone-500 text-[10px]">護甲值 (ARMOR)</div>
                      <div className="text-sky-300 font-bold text-sm">{selectedItem.armor}</div>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-stone-500 text-[10px]">重量 (WEIGHT)</div>
                    <div className="text-stone-300 font-bold text-sm">{selectedItem.weight}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-stone-500 text-[10px]">賽普汀價值 (VALUE)</div>
                    <div className="text-amber-400 font-bold text-sm">{selectedItem.value}</div>
                  </div>
                </div>

                <p className="font-serif-tc text-xs text-stone-400 leading-relaxed">{selectedItem.description}</p>
                {selectedItem.enchantment && (
                  <div className="p-2 rounded bg-amber-950/30 border border-amber-800/40 text-xs font-serif-tc text-amber-200">
                    <span className="font-cinzel text-amber-400 font-bold">附魔效果：</span>
                    <span>{selectedItem.enchantment}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-1">
                  {selectedItem.category === "scrolls" && onReadScrollClick && (
                    <button
                      id="open-scroll-reader-btn"
                      onClick={onReadScrollClick}
                      className="px-4 py-1.5 rounded bg-amber-950 border border-amber-600/70 text-amber-200 font-cinzel text-xs hover:bg-amber-900 transition-colors cursor-pointer"
                    >
                      閱讀羊皮紙卷軸
                    </button>
                  )}
                  <button
                    id={`toggle-equip-${selectedItem.id}`}
                    onClick={() => handleEquipClick(selectedItem.id)}
                    className={`px-4 py-1.5 rounded font-cinzel text-xs transition-all cursor-pointer ${
                      selectedItem.isEquipped
                        ? "bg-stone-800 border border-stone-700 text-stone-400 hover:text-stone-200"
                        : "bg-gradient-to-r from-amber-700 to-amber-900 border border-amber-500 text-white font-bold hover:brightness-110 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                    }`}
                  >
                    {selectedItem.isEquipped ? "卸下裝備 (Unequip)" : "裝備物品 (Equip)"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
