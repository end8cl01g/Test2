import React, { useState, useEffect } from 'react';
import { MapPin, Sparkles, VolumeX, Volume2 } from 'lucide-react';
import { skyrimAudio } from '../utils/audio';

export const SkyrimCompass: React.FC<{
  currentLocation?: string;
  subLocation?: string;
}> = ({
  currentLocation = "雪漫省 · 龍霄宮 (Dragonsreach)",
  subLocation = "晨星之月 14日 · 晴朗霜風 (4:20 PM)"
}) => {
  const [deg, setDeg] = useState(60);
  const [muted, setMuted] = useState(skyrimAudio.getMuted());

  useEffect(() => {
    const p = setInterval(() => {
      setDeg(b => {
        const A = (Math.random() - 0.5) * 4;
        return (b + A + 360) % 360;
      });
    }, 1500);
    return () => clearInterval(p);
  }, []);

  const toggleMute = () => {
    const p = !muted;
    skyrimAudio.setMuted(p);
    setMuted(p);
    if (!p) {
      skyrimAudio.playMenuClick();
    }
  };

  const T = [
    { label: "N", deg: 0, isMajor: true },
    { label: "15", deg: 15 },
    { label: "30", deg: 30 },
    { label: "NE", deg: 45, isMajor: true },
    { label: "60", deg: 60 },
    { label: "75", deg: 75 },
    { label: "E", deg: 90, isMajor: true },
    { label: "105", deg: 105 },
    { label: "120", deg: 120 },
    { label: "SE", deg: 135, isMajor: true },
    { label: "150", deg: 150 },
    { label: "165", deg: 165 },
    { label: "S", deg: 180, isMajor: true },
    { label: "195", deg: 195 },
    { label: "210", deg: 210 },
    { label: "SW", deg: 225, isMajor: true },
    { label: "240", deg: 240 },
    { label: "255", deg: 255 },
    { label: "W", deg: 270, isMajor: true },
    { label: "285", deg: 285 },
    { label: "300", deg: 300 },
    { label: "NW", deg: 315, isMajor: true },
    { label: "330", deg: 330 },
    { label: "345", deg: 345 }
  ];

  return (
    <header className="relative w-full pt-3 pb-2 px-4 select-none z-30 border-b border-stone-800/60 bg-gradient-to-b from-stone-950/90 via-stone-950/70 to-transparent backdrop-blur-xs">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        <div className="w-full flex items-center justify-between text-xs text-stone-400 mb-2 px-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-amber-500/80" />
            <span className="font-cinzel tracking-wider text-stone-300 font-semibold">{currentLocation}</span>
            <span className="text-stone-600">|</span>
            <span className="font-marcellus text-stone-400 hidden sm:inline">{subLocation}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-stone-900/70 border border-stone-800 text-[11px] text-amber-400/90 font-cinzel">
              <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
              <span>SKYRIM THEME</span>
            </div>
            <button
              onClick={toggleMute}
              id="toggle-audio-btn"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-stone-800 bg-stone-900/80 hover:border-amber-600/60 hover:text-amber-300 transition-colors text-stone-400 cursor-pointer"
              title={muted ? "開啟天際遊戲原聲音效" : "靜音"}
            >
              {muted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-stone-500" />
                  <span className="text-[11px] font-cinzel">靜音</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-cinzel text-stone-300">音效開啟</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="relative w-full max-w-xl flex flex-col items-center justify-center overflow-hidden pt-1 pb-2">
          <div className="absolute top-0 z-20 flex flex-col items-center pointer-events-none">
            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            <div className="w-[2px] h-3 bg-white opacity-100 shadow-[0_0_6px_rgba(255,255,255,0.9)]" />
          </div>

          <div
            className="flex items-end gap-5 transition-transform duration-700 ease-out h-8 mb-1"
            style={{ transform: `translateX(${(180 - deg) * 1.8}px)` }}
          >
            <div className="flex flex-col items-center mb-1">
              <div className="w-2.5 h-2.5 rotate-45 bg-amber-300 border border-white shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse mb-0.5" />
              <span className="text-[8px] font-cinzel text-amber-200 tracking-wider">QUEST</span>
            </div>

            {T.map((p, idx) => (
              <div key={idx} className="flex items-end justify-center min-w-[24px]">
                {p.isMajor ? (
                  <div className="flex flex-col items-center">
                    <span className="compass-label !text-xs !mx-1 text-white font-bold tracking-widest drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]">
                      {p.label}
                    </span>
                    <div className="w-[1.5px] h-3.5 bg-white opacity-90 shadow-[0_0_4px_rgba(255,255,255,0.6)]" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center pb-0.5">
                    <span className="text-[9px] text-stone-500 font-cinzel mb-0.5">{p.label}</span>
                    <div className="compass-tick h-2 bg-stone-400 opacity-60 w-[1px]" />
                  </div>
                )}
              </div>
            ))}

            <div className="flex flex-col items-center mb-1">
              <div className="w-2.5 h-2.5 rounded-full border border-sky-400 bg-sky-950 flex items-center justify-center shadow-[0_0_6px_rgba(56,189,248,0.7)]">
                <div className="w-1 h-1 bg-sky-300 rounded-full" />
              </div>
              <span className="text-[8px] font-cinzel text-sky-300 tracking-wider">SHRINE</span>
            </div>
          </div>

          <div
            className="w-[500px] max-w-full h-[1px]"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)" }}
          />
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-stone-950 via-stone-950/80 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-stone-950 via-stone-950/80 to-transparent pointer-events-none z-10" />
        </div>
      </div>
    </header>
  );
};
