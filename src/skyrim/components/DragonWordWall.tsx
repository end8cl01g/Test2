import React, { useState } from 'react';
import { Sparkles, Wind, Volume2, Compass, Flame } from 'lucide-react';
import { skyrimAudio } from '../utils/audio';
import badgesData from '../../../data/badges.json';

const Ol = (o: any) => String(o ?? "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F]/gu, "").replace(/\s{2,}/g, " ").trim();

const ku = (badgesData.badges || []).map((o: any, d: number) => ({
  id: o.id,
  name: Ol(o.name || o.id),
  englishName: o.id,
  description: Ol(o.desc || ""),
  words: [{
    dovah: String(o.id).toUpperCase(),
    runicGlyph: ["ᚱ", "ᛗ", "ᛟ", "ᛞ"][d % 4],
    meaning: Ol(o.name || o.id),
    phonetic: o.metric ? `${o.metric}${o.threshold != null ? ` ≥ ${o.threshold}` : ""}` : "自查",
    element: ["force", "fire", "frost", "time", "spirit", "storm"][d % 6]
  }],
  cooldown: o.threshold ?? 1,
  shoutLevelEffect: [o.desc || "達成條件見 PLAN.md", o.reward_xp ? `獎勵 ${o.reward_xp} XP` : ""].filter(Boolean),
  elementColor: "#d8c8a0"
}));

export const DragonWordWall: React.FC = () => {
  const [selectedShoutId, setSelectedShoutId] = useState(ku[0]?.id || "first_log");
  const [shoutLevel, setShoutLevel] = useState(0);
  const [isShouting, setIsShouting] = useState(false);
  const [shoutMultiplier, setShoutMultiplier] = useState(1);
  const [customWord, setCustomWord] = useState("DOVAHKIIN");
  const [glowEffect, setGlowEffect] = useState("fire");
  const [hoveredWord, setHoveredWord] = useState<any>(null);

  const activeShout = ku.find(b => b.id === selectedShoutId) || ku[0];

  const handleShoutSelect = (shout: any) => {
    setSelectedShoutId(shout.id);
    setShoutLevel(0);
    setShoutMultiplier(1);
    skyrimAudio.playMenuClick();
  };

  const playFullShout = (stages = 3) => {
    setIsShouting(true);
    setShoutMultiplier(stages);
    skyrimAudio.playDragonShout(stages);
    setTimeout(() => {
      setIsShouting(false);
    }, 1200);
  };

  const triggerWordClick = (word: any, idx: number) => {
    setShoutLevel(idx);
    setShoutMultiplier(idx + 1);
    skyrimAudio.playDragonShout(idx + 1);
  };

  const getGlowClass = () => {
    switch (glowEffect) {
      case "fire":
        return "text-amber-200 drop-shadow-[0_0_20px_rgba(234,88,12,0.9)] animate-pulse";
      case "frost":
        return "text-cyan-100 drop-shadow-[0_0_20px_rgba(56,189,248,0.9)] animate-pulse";
      case "arcane":
        return "text-purple-200 drop-shadow-[0_0_25px_rgba(168,85,247,0.9)] animate-pulse";
      case "gold":
        return "text-yellow-100 drop-shadow-[0_0_20px_rgba(234,179,8,0.9)] animate-pulse";
      default:
        return "text-amber-200";
    }
  };

  return (
    <section className="relative w-full py-8 px-3 sm:px-6 md:px-8 max-w-6xl mx-auto flex flex-col items-center select-none">
      <div className="w-full flex flex-col items-center text-center mb-6">
        <div className="flex items-center gap-3 text-amber-500/80 mb-1">
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-amber-500/60" />
          <span className="font-cinzel text-xs tracking-widest uppercase">The Ancient Word Wall of Skyrim</span>
          <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-amber-500/60" />
        </div>
        <h2 className="font-cinzel-dec text-2xl sm:text-3xl md:text-4xl text-amber-100 tracking-wider font-bold drop-shadow-[0_2px_12px_rgba(245,158,11,0.3)]">
          龍語壁文 · 龍吼動態字體
        </h2>
        <p className="font-marcellus text-stone-400 text-xs sm:text-sm mt-1.5 max-w-2xl">
          古代諾德人在世界之喉刻下的神聖符文。觸碰詞彙即可激發龍吼共鳴與符文流光動態。
        </p>
      </div>

      <div className="w-full flex flex-wrap items-center justify-center gap-2 mb-6">
        {ku.map(b => {
          const isSelected = selectedShoutId === b.id;
          return (
            <button
              key={b.id}
              id={`select-shout-${b.id}`}
              onClick={() => handleShoutSelect(b)}
              className={`px-3.5 py-2 rounded border font-cinzel text-xs tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? "bg-stone-900 border-amber-500/80 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.3)] font-bold"
                  : "bg-stone-950/80 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700"
              }`}
            >
              <span className="w-2 h-2 rotate-45" style={{ backgroundColor: b.elementColor }} />
              <span>{b.words.map(w => w.dovah).join(" ")}</span>
              <span className="text-stone-500 text-[11px] font-serif-tc">({b.name})</span>
            </button>
          );
        })}
      </div>

      <div className="relative w-full max-w-4xl rounded-2xl p-6 sm:p-10 border-2 border-stone-800 bg-gradient-to-b from-[#1c1815] via-[#120f0d] to-[#0d0a08] shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-40" />
        {isShouting && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="w-40 h-40 rounded-full border-4 border-amber-400 animate-ping opacity-75 shadow-[0_0_50px_rgba(245,158,11,1)]" />
            <div className="w-80 h-80 rounded-full border-2 border-orange-500 animate-ping opacity-40" />
          </div>
        )}

        <div className="relative w-full flex items-center justify-between mb-8 pb-4 border-b border-stone-800/80">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rotate-45 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            <div>
              <h3 className="font-cinzel text-lg sm:text-xl font-bold text-stone-200">
                {activeShout.name} <span className="text-stone-500 text-sm font-normal">({activeShout.englishName})</span>
              </h3>
              <p className="font-serif-tc text-xs text-stone-400 mt-0.5">{activeShout.description}</p>
            </div>
          </div>
          <button
            id="trigger-full-shout-btn"
            onClick={() => playFullShout(3)}
            disabled={isShouting}
            className="flex items-center gap-2 px-4 py-2 rounded bg-gradient-to-r from-amber-900/60 to-orange-950/80 border border-amber-500/70 hover:border-amber-400 text-amber-200 hover:text-white transition-all shadow-[0_0_15px_rgba(245,158,11,0.25)] cursor-pointer disabled:opacity-50"
          >
            <Wind className={`w-4 h-4 text-amber-400 ${isShouting ? "animate-bounce" : ""}`} />
            <span className="font-cinzel text-xs tracking-wider font-bold">施放完整龍吼 (THU'UM)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 my-6 relative z-10">
          {activeShout.words.map((word, idx) => {
            const unlocked = idx <= shoutLevel;
            return (
              <div
                key={idx}
                id={`word-card-${idx}`}
                onClick={() => triggerWordClick(word, idx)}
                onMouseEnter={() => setHoveredWord(word)}
                onMouseLeave={() => setHoveredWord(null)}
                className={`group relative rounded-xl p-5 border-2 transition-all duration-300 flex flex-col items-center text-center cursor-pointer select-none ${
                  unlocked
                    ? "bg-stone-900/90 border-amber-500/80 shadow-[0_0_25px_rgba(245,158,11,0.35)] scale-[1.02]"
                    : "bg-stone-950/60 border-stone-800/80 hover:border-stone-700 hover:bg-stone-900/40"
                }`}
              >
                <div className="absolute top-2 right-2 text-[10px] font-cinzel text-stone-500 px-1.5 py-0.5 rounded bg-stone-950 border border-stone-800">
                  WORD #{idx + 1}
                </div>
                <div className="my-2 h-16 flex items-center justify-center">
                  <span
                    className={`font-uncial text-4xl sm:text-5xl transition-all duration-300 select-none ${
                      unlocked
                        ? "text-amber-200 drop-shadow-[0_0_16px_rgba(251,191,36,0.9)] animate-runic-glow scale-110"
                        : "text-stone-600 group-hover:text-stone-400"
                    }`}
                  >
                    {word.runicGlyph}
                  </span>
                </div>
                <h4
                  className={`font-cinzel-dec text-2xl font-black tracking-widest my-1 transition-all ${
                    unlocked ? "text-amber-100 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" : "text-stone-400 group-hover:text-stone-200"
                  }`}
                >
                  {word.dovah}
                </h4>
                <span className="text-[11px] font-marcellus text-amber-500/80 italic mb-2">/{word.phonetic}/</span>
                <div className="w-full pt-2 border-t border-stone-800/80 flex flex-col items-center">
                  <span className="font-serif-tc text-xs font-semibold text-stone-300">{word.meaning}</span>
                </div>
                <div className="mt-3 text-[10px] font-cinzel text-stone-500 group-hover:text-amber-400 flex items-center gap-1 transition-colors">
                  <Volume2 className="w-3 h-3" />
                  <span>點擊吟誦發聲</span>
                </div>
                {unlocked && (
                  <div className="absolute -bottom-1 left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-stone-950/80 border border-stone-800/80 text-xs">
          <div className="flex items-center gap-2 mb-2 text-amber-400 font-cinzel font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>當前龍吼階層效果 (THU'UM POWER STAGES)：</span>
          </div>
          <div className="space-y-1.5 font-serif-tc text-stone-300">
            {activeShout.shoutLevelEffect.map((effect, idx) => (
              <div
                key={idx}
                className={`p-2 rounded transition-colors ${
                  idx === shoutLevel ? "bg-amber-950/40 border-l-2 border-amber-500 text-amber-200 font-medium" : "text-stone-400"
                }`}
              >
                {effect}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-stone-800/80">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-400" />
              <h4 className="font-cinzel text-sm text-stone-200 font-bold uppercase tracking-wider">
                龍語動態字體渲染實驗室 (Thu'um Font Sandbox)
              </h4>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-cinzel">
              <span className="text-stone-500 text-[11px]">符文靈光：</span>
              {["fire", "frost", "arcane", "gold"].map(effect => (
                <button
                  key={effect}
                  id={`effect-btn-${effect}`}
                  onClick={() => {
                    setGlowEffect(effect);
                    skyrimAudio.playMenuClick();
                  }}
                  className={`px-2 py-0.5 rounded capitalize transition-all cursor-pointer ${
                    glowEffect === effect
                      ? "bg-stone-800 text-amber-300 border border-amber-500/60 font-bold"
                      : "bg-stone-950 text-stone-500 border border-stone-800 hover:text-stone-300"
                  }`}
                >
                  {effect === "fire" ? "烈焰 (Fire)" : effect === "frost" ? "寒霜 (Frost)" : effect === "arcane" ? "奧術 (Arcane)" : "聖金 (Aedric)"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
            <input
              id="custom-word-input"
              type="text"
              value={customWord}
              onChange={e => setCustomWord(e.target.value)}
              placeholder="輸入英文字母或中文，如 DRAGON, SKYRIM, 龍裔..."
              className="w-full sm:flex-1 px-3 py-2 rounded bg-stone-900 border border-stone-800 text-amber-100 font-cinzel text-sm focus:outline-none focus:border-amber-500"
            />
            <button
              id="test-shout-echo-btn"
              onClick={() => playFullShout(2)}
              className="w-full sm:w-auto px-4 py-2 rounded bg-stone-800 border border-amber-600/50 hover:bg-stone-700 text-amber-200 font-cinzel text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>激發字體震盪</span>
            </button>
          </div>

          <div className="relative w-full py-10 px-4 rounded-lg bg-stone-950 border border-stone-800 flex flex-col items-center justify-center overflow-hidden min-h-[140px]">
            <div className="absolute inset-0 flex items-center justify-around opacity-5 select-none pointer-events-none font-uncial text-6xl">
              <span>ᚠ</span>
              <span>ᛋ</span>
              <span>ᚱ</span>
              <span>ᛟ</span>
              <span>ᛞ</span>
              <span>ᚨ</span>
            </div>
            <div className="text-center relative z-10">
              <span className={`font-cinzel-dec text-3xl sm:text-4xl md:text-5xl font-black tracking-widest transition-all duration-500 inline-block ${getGlowClass()}`}>
                {customWord || "DOVAHKIIN"}
              </span>
              <div className="mt-2 text-stone-500 font-serif-tc text-xs">
                「巨龍之喉低語著古老的名字，風雪為之止息。」
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
