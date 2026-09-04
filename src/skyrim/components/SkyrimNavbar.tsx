import React from 'react';
import { Scroll, Wind, Briefcase, Settings, Star } from 'lucide-react';
import { skyrimAudio } from '../utils/audio';

export type SkyrimTab = 'scrolls' | 'wordwall' | 'inventory' | 'perks' | 'settings';

interface NavbarProps {
  activeTab: SkyrimTab;
  onTabChange: (tab: SkyrimTab) => void;
}

export const SkyrimNavbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    {
      id: "scrolls" as SkyrimTab,
      labelZh: "訓練卷軸 · 課表",
      labelEn: "WORKOUT CHECKLIST",
      icon: <Scroll className="w-4 h-4" />,
      badge: "每日打卡",
    },
    {
      id: "wordwall" as SkyrimTab,
      labelZh: "龍語壁文 · 龍吼",
      labelEn: "WORD WALL & THU'UM",
      icon: <Wind className="w-4 h-4" />,
      badge: "動態字體",
    },
    {
      id: "inventory" as SkyrimTab,
      labelZh: "物品庫存",
      labelEn: "INVENTORY",
      icon: <Briefcase className="w-4 h-4" />,
    },
    {
      id: "settings" as SkyrimTab,
      labelZh: "見習者之卷 · 設定",
      labelEn: "SETTINGS SCROLL",
      icon: <Settings className="w-4 h-4" />,
    },
    {
      id: "perks" as SkyrimTab,
      labelZh: "天賦星座",
      labelEn: "SKILL PERKS",
      icon: <Star className="w-4 h-4" />,
    }
  ];

  const handleTabClick = (id: SkyrimTab) => {
    if (id !== activeTab) {
      if (id === "scrolls") {
        skyrimAudio.playParchmentRustle();
      } else {
        skyrimAudio.playMenuClick();
      }
      onTabChange(id);
    }
  };

  return (
    <nav className="w-full relative z-20 py-2 border-b border-stone-800/80 bg-stone-950/60 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-center gap-2 sm:gap-6 md:gap-10">
        {tabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-button-${tab.id}`}
              onClick={() => handleTabClick(tab.id)}
              className={`group relative flex items-center gap-2.5 px-3.5 py-2 transition-all duration-300 cursor-pointer ${
                active ? "text-amber-300" : "text-stone-400 hover:text-stone-200 hover:scale-105"
              }`}
            >
              <span
                className={`font-cinzel text-xs transition-opacity duration-300 ${
                  active ? "opacity-100 text-amber-500 font-bold" : "opacity-0 -translate-x-1 group-hover:opacity-60"
                }`}
              >
                [
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`transition-transform duration-300 ${
                    active
                      ? "text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                      : "text-stone-500 group-hover:text-stone-300"
                  }`}
                >
                  {tab.icon}
                </span>
                <div className="flex flex-col text-left">
                  <span
                    className={`font-cinzel text-xs tracking-wider uppercase font-semibold leading-tight ${
                      active ? "text-amber-200 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "text-stone-300"
                    }`}
                  >
                    {tab.labelEn}
                  </span>
                  <span className="font-serif-tc text-[11px] text-stone-400 group-hover:text-stone-300 leading-none mt-0.5">
                    {tab.labelZh}
                  </span>
                </div>
              </div>
              {tab.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-cinzel ${
                    active
                      ? "bg-amber-950/80 border border-amber-500/60 text-amber-300"
                      : "bg-stone-900 border border-stone-800 text-stone-400"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
              <span
                className={`font-cinzel text-xs transition-opacity duration-300 ${
                  active ? "opacity-100 text-amber-500 font-bold" : "opacity-0 translate-x-1 group-hover:opacity-60"
                }`}
              >
                ]
              </span>
              {active && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rotate-45 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
