import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  CheckSquare,
  Square,
  Sparkles,
  Calendar,
  MapPin,
  Clock,
  AlertCircle,
  Shield,
  RotateCcw,
  History,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Scroll,
  Award
} from 'lucide-react';
import workoutJson from '../../../data/workout.json';
import { skyrimAudio } from '../utils/audio';
import { toast } from '../store';

const W: any = workoutJson;
const KIND_LABELS: Record<string, string> = W.kind_labels || {
  warmup: '熱身',
  hold: '支撐',
  strength: '力量',
  core: '核心',
  mobility: '柔韌',
  play: '自由練習',
  assess: '評估',
  skill: '技巧'
};

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type DayKey = typeof DAY_KEYS[number];

const DAY_LABELS: Record<DayKey, string> = {
  mon: '週一',
  tue: '週二',
  wed: '週三',
  thu: '週四',
  fri: '週五',
  sat: '週六',
  sun: '週日'
};

const PHASES = [
  { id: 'phase0', name: 'Phase 0 · 除鏽重建', subtitle: '第 1-6 週 · 重新連結神經與關節' },
  { id: 'phase1', name: 'Phase 1 · 基礎啟動', subtitle: '第 7-16 週 · 肩關節力量與靠牆倒立' },
  { id: 'phase2', name: 'Phase 2 · 離牆倒立', subtitle: '第 17-28 週 · 自由平衡與初級壓倒立' },
  { id: 'phase3', name: 'Phase 3 · 蓄力下壓', subtitle: '第 29-40 週 · 全程控制與壓倒立蓄力' },
  { id: 'phase4', name: 'Phase 4 · 自由平衡', subtitle: '第 41-52 週 · 獨立倒立 30 秒與壓起完成' }
];

interface ExerciseItem {
  name: string;
  xp?: number;
  kind?: string;
  detail?: string;
  note?: string;
  regression?: string;
  sets?: number;
  reps?: string;
  seconds?: number;
}

interface ParchmentScrollProps {
  onWorkoutLogged?: () => void;
}

export const ParchmentScroll: React.FC<ParchmentScrollProps> = ({ onWorkoutLogged }) => {
  const [selectedPhase, setSelectedPhase] = useState<string>('phase0');
  const [selectedDay, setSelectedDay] = useState<DayKey>('mon');
  const [completedIndices, setCompletedIndices] = useState<Record<number, boolean>>({});
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [isLoggedToday, setIsLoggedToday] = useState<boolean>(false);
  const [loggedXP, setLoggedXP] = useState<number>(0);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Determine current day of week (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const currentWeekdayKey = useMemo<DayKey>(() => {
    const day = new Date().getDay();
    const map: Record<number, DayKey> = {
      0: 'sun',
      1: 'mon',
      2: 'tue',
      3: 'wed',
      4: 'thu',
      5: 'fri',
      6: 'sat'
    };
    return map[day] || 'mon';
  }, []);

  // Initialize selected day to today
  useEffect(() => {
    setSelectedDay(currentWeekdayKey);
  }, [currentWeekdayKey]);

  // Load existing log for today and recent history from DataLayer
  const loadDatabaseState = async () => {
    const DL = (globalThis as any).DataLayer;
    if (!DL) return;

    try {
      const todayLog = await DL.getWorkoutLog(todayISO);
      if (todayLog && todayLog.completed && !todayLog.deleted) {
        setIsLoggedToday(true);
        setLoggedXP(todayLog.xp_earned || 0);
        if (todayLog.notes) setSessionNotes(todayLog.notes);
        if (todayLog.phase !== undefined && `phase${todayLog.phase}` in W.phases) {
          setSelectedPhase(`phase${todayLog.phase}`);
        }
        if (todayLog.day_type && DAY_KEYS.includes(todayLog.day_type as DayKey)) {
          setSelectedDay(todayLog.day_type as DayKey);
        }
      }

      // Load exercise checklist state
      const exerciseLogs = await DL.getExerciseLogs(todayISO);
      if (Array.isArray(exerciseLogs) && exerciseLogs.length > 0) {
        const checkedMap: Record<number, boolean> = {};
        exerciseLogs.forEach((log: any) => {
          if (log.completed) {
            checkedMap[log.exercise_index] = true;
          }
        });
        setCompletedIndices(checkedMap);
      }

      // Load recent 14 logs for history table
      const recent = await DL.getRecentWorkouts(14);
      if (Array.isArray(recent)) {
        setRecentLogs(recent);
      }
    } catch {
      // Fallback cleanly if database is still bootstrapping
    }
  };

  useEffect(() => {
    loadDatabaseState();
  }, [todayISO]);

  // Get current phase data and day data
  const phaseData = W.phases?.[selectedPhase] || W.phases?.phase0 || {};
  const dayMeta = phaseData.day_meta?.[selectedDay] || null;
  const rawDayData = phaseData.days?.[selectedDay];
  const isRestDay = !rawDayData || (Array.isArray(rawDayData) && rawDayData.length === 0);

  const exercises: ExerciseItem[] = useMemo(() => {
    if (!rawDayData) return [];
    if (Array.isArray(rawDayData)) return rawDayData;
    if (rawDayData.exercises) return rawDayData.exercises;
    if (rawDayData.items) return rawDayData.items;
    return [];
  }, [rawDayData]);

  // Handle checking/unchecking an exercise
  const toggleExercise = (index: number) => {
    skyrimAudio.playMenuClick();
    setCompletedIndices(prev => {
      const next = { ...prev, [index]: !prev[index] };
      return next;
    });
  };

  // Bulk actions
  const handleSelectAll = () => {
    skyrimAudio.playParchmentRustle();
    const all: Record<number, boolean> = {};
    exercises.forEach((_, i) => {
      all[i] = true;
    });
    setCompletedIndices(all);
  };

  const handleClearAll = () => {
    skyrimAudio.playMenuClick();
    setCompletedIndices({});
  };

  // Completion calculation
  const completedCount = useMemo(() => {
    return exercises.filter((_, i) => !!completedIndices[i]).length;
  }, [exercises, completedIndices]);

  const totalCalculatedXP = useMemo(() => {
    return exercises.reduce((sum, item, i) => {
      return sum + (completedIndices[i] ? Number(item.xp || 15) : 0);
    }, 0);
  }, [exercises, completedIndices]);

  // Sign & submit today's workout
  const handleSignDecree = async () => {
    if (exercises.length === 0 && !isRestDay) return;
    setIsSubmitting(true);

    try {
      const DL = (globalThis as any).DataLayer;
      const GE = (globalThis as any).GameEngine;

      const phaseNum = parseInt(selectedPhase.replace('phase', ''), 10) || 0;
      const exerciseRecords = exercises.map((item, index) => ({
        name: item.name,
        xp: item.xp || 15,
        completed: !!completedIndices[index]
      }));

      if (DL?.logWorkout) {
        await DL.logWorkout({
          date: todayISO,
          phase: phaseNum,
          dayType: selectedDay,
          completed: completedCount > 0 || isRestDay,
          notes: sessionNotes.trim(),
          location: dayMeta?.place || null,
          exercises: exerciseRecords
        });

        // Trigger badge evaluation
        if (GE?.evaluateBadges) {
          try {
            await GE.evaluateBadges();
          } catch {
            // silent badge pass
          }
        }

        setIsLoggedToday(true);
        setLoggedXP(totalCalculatedXP);
        skyrimAudio.playLevelUp();
        toast(`今日修煉已結算入冊！獲得 +${totalCalculatedXP} XP 經驗值`);

        // Refresh app state
        onWorkoutLogged?.();
        loadDatabaseState();
      }
    } catch (e: any) {
      toast(`記錄失敗：${e?.message || e}`, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative w-full py-6 px-3 sm:px-6 md:px-8 max-w-5xl mx-auto flex flex-col items-center">
      {/* Top Header Banner */}
      <div className="w-full flex flex-col items-center text-center mb-6">
        <div className="flex items-center gap-3 text-amber-500/80 mb-1">
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-amber-500/60" />
          <span className="font-cinzel text-xs tracking-widest uppercase">Skyrim Discipline Scroll</span>
          <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-amber-500/60" />
        </div>
        <h2 className="font-cinzel-dec text-2xl sm:text-3xl text-amber-100 tracking-wider font-bold drop-shadow-[0_2px_12px_rgba(245,158,11,0.3)]">
          修煉卷軸 · 每日課表
        </h2>
        <p className="font-marcellus text-stone-400 text-xs sm:text-sm mt-1 max-w-xl">
          倒立之殿 52 週訓練計劃 · 依日照表每日自律修煉並簽署印泥結算
        </p>
      </div>

      {/* Phase Selector Bar */}
      <div className="w-full mb-4">
        <div className="text-xs font-cinzel text-amber-500/90 tracking-wider uppercase mb-2 flex items-center gap-2">
          <Scroll className="w-3.5 h-3.5" />
          <span>修煉階段（PHASE SELECTION）：</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {PHASES.map((p, idx) => {
            const isSelected = selectedPhase === p.id;
            return (
              <button
                key={p.id}
                id={`select-phase-${p.id}`}
                onClick={() => {
                  skyrimAudio.playParchmentRustle();
                  setSelectedPhase(p.id);
                }}
                className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-950/80 border-amber-500/80 text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                    : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-cinzel text-xs font-bold tracking-wider">
                    {p.name.split('·')[0].trim()}
                  </span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                  )}
                </div>
                <div className="font-serif-tc text-xs font-medium text-amber-200/90 truncate mt-1">
                  {p.name.split('·')[1]?.trim() || ''}
                </div>
                <div className="text-[10px] text-stone-500 truncate mt-0.5">
                  週數：{idx === 0 ? '1-6' : idx === 1 ? '7-16' : idx === 2 ? '17-28' : idx === 3 ? '29-40' : '41-52'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Weekday Selector Bar */}
      <div className="w-full mb-6">
        <div className="text-xs font-cinzel text-amber-500/90 tracking-wider uppercase mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>星期課表（DAY OF WEEK）：</span>
          </div>
          <span className="text-[11px] text-stone-400 font-serif-tc">
            今日：<span className="text-amber-300 font-semibold">{DAY_LABELS[currentWeekdayKey]}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {DAY_KEYS.map((day) => {
            const isSelected = selectedDay === day;
            const isToday = currentWeekdayKey === day;
            const meta = phaseData.day_meta?.[day];
            const hasExercises = !!phaseData.days?.[day]?.length;

            return (
              <button
                key={day}
                id={`select-day-${day}`}
                onClick={() => {
                  skyrimAudio.playMenuClick();
                  setSelectedDay(day);
                }}
                className={`relative px-3 sm:px-4 py-2 rounded-md font-cinzel text-xs tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? 'bg-amber-900/90 text-amber-100 border border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)] font-bold'
                    : 'bg-stone-900/70 text-stone-400 border border-stone-800 hover:text-stone-200 hover:border-stone-700'
                }`}
              >
                <span>{DAY_LABELS[day]}</span>
                {meta?.label && (
                  <span className="text-[10px] opacity-80 font-serif-tc hidden md:inline">
                    · {meta.label.slice(0, 6)}
                  </span>
                )}
                {!hasExercises && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-stone-800 text-stone-500 font-serif-tc">
                    休
                  </span>
                )}
                {isToday && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399]" title="今天" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* THE ANCIENT PARCHMENT SCROLL WORKOUT CHECKLIST ARTIFACT */}
      {/* ========================================================= */}
      <div className="relative w-full transition-all duration-300 select-text">
        {/* Left Scroll Roller */}
        <div className="hidden sm:block scroll-roller" style={{ left: '-16px' }}>
          <div className="scroll-roller-top" />
          <div className="scroll-roller-bottom" />
        </div>

        {/* Right Scroll Roller */}
        <div className="hidden sm:block scroll-roller" style={{ right: '-16px' }}>
          <div className="scroll-roller-top" />
          <div className="scroll-roller-bottom" />
        </div>

        {/* Leather Wrapping Border Frame */}
        <div className="relative rounded-2xl p-3 sm:p-5 md:p-6 leather-bound-texture border-2 border-[#54301d] shadow-[0_25px_60px_rgba(0,0,0,0.95)]">
          {/* Leather stitching decorative lines */}
          <div className="absolute inset-2 rounded-xl border border-dashed border-[#8d5e38]/40 pointer-events-none" />
          
          {/* 4 Corner Brass Fasteners */}
          <div className="absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 border-amber-500/70 rounded-tl pointer-events-none flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-600/90" />
          </div>
          <div className="absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 border-amber-500/70 rounded-tr pointer-events-none flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-600/90" />
          </div>
          <div className="absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 border-amber-500/70 rounded-bl pointer-events-none flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-600/90" />
          </div>
          <div className="absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 border-amber-500/70 rounded-br pointer-events-none flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-600/90" />
          </div>

          {/* INNER VINTAGE PARCHMENT SHEET */}
          <div className="relative rounded-xl p-4 sm:p-7 md:p-9 bg-[#f4ebe1] text-[#28180d] border border-[#a47b4d] shadow-[inset_0_0_60px_rgba(110,65,25,0.22),inset_0_0_15px_rgba(70,40,15,0.3)]">
            {/* Parchment Watermark Dragon Silhouette */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5 flex items-center justify-center">
              <span className="font-cinzel text-9xl tracking-widest font-black text-amber-950 select-none">
                DOVAH
              </span>
            </div>

            {/* Scroll Header Content */}
            <div className="relative border-b-2 border-[#875f36]/40 pb-4 mb-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="font-cinzel text-xs sm:text-sm font-bold tracking-widest text-[#784d25] uppercase">
                  {phaseData.title || selectedPhase} · {DAY_LABELS[selectedDay]} 修煉課表
                </span>
                <div className="flex items-center gap-2">
                  {isLoggedToday && selectedDay === currentWeekdayKey && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-800/20 text-emerald-900 border border-emerald-700/40 text-xs font-cinzel font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-700" />
                      <span>今日已簽署結算 (+{loggedXP} XP)</span>
                    </span>
                  )}
                  <span className="text-xs font-serif-tc text-[#7a5330]">
                    {todayISO}
                  </span>
                </div>
              </div>

              <h1 className="font-cinzel-dec text-xl sm:text-2xl md:text-3xl font-bold tracking-wide text-[#2c1a0e] drop-shadow-sm">
                {dayMeta?.label || (isRestDay ? '修整調息日（Rest & Recovery）' : `${DAY_LABELS[selectedDay]} 倒立體系訓練`)}
              </h1>

              {/* Day Meta Info Pills (Place, Duration, Focus) */}
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs font-serif-tc text-[#5c3a1b]">
                {dayMeta?.place && (
                  <div className="flex items-center gap-1 bg-[#ead9c4] px-2.5 py-1 rounded border border-[#b8956e]">
                    <MapPin className="w-3.5 h-3.5 text-[#8c5220]" />
                    <span>地點：{dayMeta.place}</span>
                  </div>
                )}
                {dayMeta?.minutes && (
                  <div className="flex items-center gap-1 bg-[#ead9c4] px-2.5 py-1 rounded border border-[#b8956e]">
                    <Clock className="w-3.5 h-3.5 text-[#8c5220]" />
                    <span>時長：約 {dayMeta.minutes} 分鐘</span>
                  </div>
                )}
                {dayMeta?.optional && (
                  <div className="bg-[#dfd0bb] px-2.5 py-1 rounded text-[#714e28] border border-[#b8956e] font-medium">
                    可選（不做不算破功）
                  </div>
                )}
                <div className="flex items-center gap-1 text-[#6b421a] ml-auto">
                  <Award className="w-3.5 h-3.5 text-amber-700" />
                  <span>本單元總經驗：+{exercises.reduce((s, e) => s + (e.xp || 15), 0)} XP</span>
                </div>
              </div>

              {/* Phase Focus Message */}
              {phaseData.focus && (
                <div className="mt-3 p-2.5 rounded bg-[#ebdccb] border border-[#be9a73]/60 text-xs font-serif-tc text-[#4d2d14] leading-relaxed">
                  <span className="font-bold text-[#7d461b]">階段核心焦點：</span>
                  {phaseData.focus}
                </div>
              )}
            </div>

            {/* CHECKLIST OR REST DAY CONTENT */}
            {isRestDay ? (
              <div className="py-10 px-4 text-center flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-[#ebdccb] border-2 border-[#a47b4d] flex items-center justify-center mb-4 text-[#784d25]">
                  <Scroll className="w-7 h-7" />
                </div>
                <h3 className="font-cinzel text-lg sm:text-xl font-bold text-[#3a2010] mb-2">
                  今日修整：讓結締組織與神經超量恢復
                </h3>
                <p className="font-serif-tc text-xs sm:text-sm text-[#614022] max-w-md leading-relaxed">
                  倒立與支撐對腕關節、肩袖肌群及中樞神經的要求極高。休養日並非怠惰，而是修煉週期中使組織癒合、肌力增長之關鍵。
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs font-serif-tc text-[#7a4e27]">
                  <span className="bg-[#ead9c4] px-2.5 py-1 rounded border border-[#b8956e]">滾筒胸椎放鬆</span>
                  <span className="bg-[#ead9c4] px-2.5 py-1 rounded border border-[#b8956e]">手腕柔韌輕拉伸</span>
                  <span className="bg-[#ead9c4] px-2.5 py-1 rounded border border-[#b8956e]">充裕睡眠與水分</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* List Action Toolbar */}
                <div className="flex items-center justify-between text-xs font-serif-tc text-[#663e1d] pb-1 border-b border-[#a47b4d]/30">
                  <div className="font-medium flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-[#8a5223]" />
                    <span>動作檢核清單（共 {exercises.length} 項動作）</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      id="select-all-exercises-btn"
                      onClick={handleSelectAll}
                      className="text-[#7d481b] hover:text-[#381e08] hover:underline font-semibold cursor-pointer"
                    >
                      全選完成
                    </button>
                    <span>·</span>
                    <button
                      id="clear-all-exercises-btn"
                      onClick={handleClearAll}
                      className="text-[#885a33] hover:text-[#381e08] hover:underline cursor-pointer"
                    >
                      全部清空
                    </button>
                  </div>
                </div>

                {/* Exercises Check-list Items */}
                <div className="space-y-2.5">
                  {exercises.map((exercise, index) => {
                    const isChecked = !!completedIndices[index];
                    const kindLabel = KIND_LABELS[exercise.kind || ''] || exercise.kind || '動作';

                    return (
                      <div
                        key={`${exercise.name}-${index}`}
                        id={`exercise-item-${index}`}
                        onClick={() => toggleExercise(index)}
                        className={`group relative p-3 sm:p-3.5 rounded-lg border transition-all cursor-pointer select-none ${
                          isChecked
                            ? 'bg-[#e4d3bd] border-[#9f7243] shadow-[inset_0_1px_4px_rgba(70,40,10,0.1)]'
                            : 'bg-[#f7efe6] hover:bg-[#ede0d0] border-[#cbb399]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox Icon */}
                          <div className="mt-0.5 flex-shrink-0 text-[#693e1b]">
                            {isChecked ? (
                              <div className="w-5 h-5 rounded bg-[#70421a] border border-[#522f12] text-amber-100 flex items-center justify-center shadow-sm">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded border-2 border-[#8b5a2b] bg-[#fbf5ed] group-hover:border-[#522f12] transition-colors" />
                            )}
                          </div>

                          {/* Main Exercise Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-sm sm:text-base font-serif-tc font-bold tracking-tight transition-all ${
                                    isChecked
                                      ? 'line-through text-[#6e5138] opacity-80'
                                      : 'text-[#2a170b]'
                                  }`}
                                >
                                  {exercise.name}
                                </span>
                                <span className="text-[11px] px-1.5 py-0.2 rounded bg-[#ded0bd] text-[#5e3818] border border-[#bca082] font-serif-tc font-medium">
                                  {kindLabel}
                                </span>
                              </div>

                              {/* XP Badge */}
                              <div className="flex items-center gap-1 font-cinzel text-xs font-bold text-[#824e1d]">
                                <Sparkles className="w-3 h-3 text-amber-600" />
                                <span>+{exercise.xp || 15} XP</span>
                              </div>
                            </div>

                            {/* Detail (Sets × Reps, Tempo) */}
                            {exercise.detail && (
                              <div className="mt-1 text-xs font-serif-tc font-semibold text-[#4e2f15]">
                                處方細節：{exercise.detail}
                              </div>
                            )}

                            {/* Note / Caution (⚠️) */}
                            {exercise.note && (
                              <div className="mt-1.5 p-1.5 rounded bg-[#ebd7c2]/80 border-l-2 border-amber-700 text-xs font-serif-tc text-[#5c3616] flex items-start gap-1.5 leading-relaxed">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-800 flex-shrink-0 mt-0.5" />
                                <span>{exercise.note}</span>
                              </div>
                            )}

                            {/* Regression / Scale-down alternative */}
                            {exercise.regression && (
                              <div className="mt-1 text-xs font-serif-tc text-[#6c4826] flex items-start gap-1 leading-relaxed">
                                <Shield className="w-3.5 h-3.5 text-[#885422] flex-shrink-0 mt-0.5" />
                                <span><span className="font-semibold">退階方案：</span>{exercise.regression}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Progress & Stamping Footer Area */}
                <div className="mt-6 pt-5 border-t-2 border-[#875f36]/40">
                  {/* Progress Indicator */}
                  <div className="flex items-center justify-between text-xs font-serif-tc text-[#5c3717] mb-2 font-medium">
                    <span>
                      修煉進度：完成 <strong className="text-[#2b1709]">{completedCount}</strong> / {exercises.length} 項
                    </span>
                    <span className="font-cinzel font-bold text-[#7d481b]">
                      本次獲得 +{totalCalculatedXP} XP
                    </span>
                  </div>

                  {/* Progress Bar Track */}
                  <div className="w-full h-2.5 rounded-full bg-[#ded0be] overflow-hidden border border-[#b4906b] mb-4">
                    <div
                      className="h-full bg-gradient-to-r from-amber-700 to-amber-500 transition-all duration-300 rounded-full"
                      style={{
                        width: `${exercises.length > 0 ? (completedCount / exercises.length) * 100 : 0}%`
                      }}
                    />
                  </div>

                  {/* Optional Session Notes */}
                  <div className="mb-4">
                    <label htmlFor="session-notes-input" className="block text-xs font-serif-tc text-[#69421f] mb-1 font-semibold">
                      修煉筆記（記錄肩膀反饋、負荷重量或感受）：
                    </label>
                    <input
                      id="session-notes-input"
                      type="text"
                      value={sessionNotes}
                      onChange={(e) => setSessionNotes(e.target.value)}
                      placeholder="例如：今日靠牆倒立手腕無痛感，胸推機加重至 40kg..."
                      className="w-full px-3 py-2 rounded bg-[#fdf8f2] border border-[#b9946e] text-[#2c1709] font-serif-tc text-xs sm:text-sm placeholder-[#9c7855] focus:outline-none focus:border-[#7d461b]"
                    />
                  </div>

                  {/* Action Button & Wax Seal Stamping Area */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                    <div className="text-[11px] font-serif-tc text-[#7a5430]">
                      * 點擊簽署後將寫入本機 SQLite 資料庫，並於網路可用時自動備份至雲端。
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        id="sign-scroll-decree-btn"
                        onClick={handleSignDecree}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 rounded-lg bg-gradient-to-b from-[#874b1e] to-[#60310e] hover:from-[#9c5723] hover:to-[#6f3911] text-amber-100 font-cinzel text-xs sm:text-sm font-bold tracking-wider border border-[#b3753b] shadow-[0_4px_12px_rgba(70,30,5,0.4)] transition-all transform active:scale-95 cursor-pointer flex items-center gap-2"
                      >
                        <Award className="w-4 h-4 text-amber-300" />
                        <span>{isLoggedToday ? '更新今日打卡契約' : '印璽結契 · 提交今日修煉'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Skyrim Authenticated Wax Seal Stamp (When Logged) */}
            {isLoggedToday && (
              <div className="mt-6 flex justify-end">
                <div className="relative inline-flex items-center justify-center p-3 rounded-full bg-[#831818] border-2 border-[#a83232] shadow-[0_4px_16px_rgba(131,24,24,0.5)] text-amber-100 font-cinzel text-[10px] tracking-widest font-black uppercase transform rotate-[-6deg] select-none pointer-events-none">
                  <div className="absolute inset-1 rounded-full border border-dashed border-amber-300/40" />
                  <div className="flex flex-col items-center leading-tight">
                    <span className="text-[9px] text-amber-300">SKYRIM IMPERIAL</span>
                    <span className="text-xs font-bold text-amber-100">SEALED</span>
                    <span className="text-[8px] opacity-80">{todayISO}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Drawer Toggle */}
      <div className="w-full mt-6 flex flex-col items-center">
        <button
          id="toggle-workout-history-btn"
          onClick={() => {
            skyrimAudio.playMenuClick();
            setShowHistory(!showHistory);
          }}
          className="px-4 py-2 rounded-lg bg-stone-900/80 border border-stone-800 text-stone-400 hover:text-amber-200 hover:border-amber-800/60 font-cinzel text-xs tracking-wider flex items-center gap-2 transition-all cursor-pointer"
        >
          <History className="w-3.5 h-3.5 text-amber-500" />
          <span>歷戰史詩 · 近期修煉記錄 ({recentLogs.length} 筆)</span>
          {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showHistory && (
          <div className="w-full mt-3 p-4 rounded-xl bg-stone-950/90 border border-stone-800 backdrop-blur-md">
            {recentLogs.length === 0 ? (
              <div className="text-center py-6 text-xs text-stone-500 font-serif-tc">
                尚無歷戰記錄。完成首次打卡後即可在此回溯修煉軌跡。
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-serif-tc text-stone-300">
                  <thead>
                    <tr className="border-b border-stone-800 text-amber-500 font-cinzel text-[11px]">
                      <th className="py-2 px-3">日期</th>
                      <th className="py-2 px-3">階段</th>
                      <th className="py-2 px-3">課表單元</th>
                      <th className="py-2 px-3">獲得 XP</th>
                      <th className="py-2 px-3">地點</th>
                      <th className="py-2 px-3">修煉筆記</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-900">
                    {recentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-stone-900/40">
                        <td className="py-2.5 px-3 font-cinzel text-amber-200 font-medium whitespace-nowrap">
                          {log.log_date}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          Phase {log.phase}
                        </td>
                        <td className="py-2.5 px-3 text-stone-300 whitespace-nowrap">
                          {DAY_LABELS[log.day_type as DayKey] || log.day_type || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-cinzel text-amber-400 font-bold whitespace-nowrap">
                          +{log.xp_earned || 0} XP
                        </td>
                        <td className="py-2.5 px-3 text-stone-400 whitespace-nowrap">
                          {log.location || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-stone-400 max-w-xs truncate">
                          {log.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
