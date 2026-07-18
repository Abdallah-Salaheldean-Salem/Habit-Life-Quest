/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Trophy,
  Shield,
  Heart,
  Calendar,
  Flame,
  BookOpen,
  Sword,
  Crown,
  Music,
  CheckCircle2,
  Circle,
  Trash2,
  Edit2,
  Save,
  Plus,
  ChevronRight,
  Info,
  RefreshCw,
  Clock,
  History,
  CloudLightning,
  AlertCircle,
  Cloud,
  Check
} from 'lucide-react';

import { Quest, LedgerEntry, UserClass, StatType, STATS, CLASSES } from './types';
import Sigil from './components/Sigil';
import RadarChart from './components/RadarChart';
import Chronicle from './components/Chronicle';
import AddQuestModal from './components/AddQuestModal';
import DiagnosticsPanel from './components/DiagnosticsPanel';
import { ACHIEVEMENTS } from './utils/achievements';
import {
  toDateStr,
  getMonday,
  getDaysAgoStr,
  getPreviousDateStr,
  getNextDateStr,
  getPreviousWeekMonday,
  calculateQuestXp,
  getLevelAndProgress,
  getCharacterTitle,
  getStatRank,
  getDailyQuestStreak,
  getWeeklyQuestStreak,
  getAppWideStreak,
  getMockSaveData
} from './utils/logic';

const SAVE_KEY = 'habitquest:save:v1';
const SCHEMA_VERSION = 4;

export default function App() {
  // ---------------------------------------------------------
  // CORE STATE
  // ---------------------------------------------------------
  const [userName, setUserName] = useState<string>('Abdallah');
  const [userClass, setUserClass] = useState<UserClass>('scholar');
  const [quests, setQuests] = useState<Quest[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [currentMockDate, setCurrentMockDate] = useState<string>('2026-07-18'); // Saturdays match the mockup
  const [timeframe, setTimeframe] = useState<'7' | '30' | 'all'>('30');
  
  // Character Onboarding Screen States
  const [hasCreatedCharacter, setHasCreatedCharacter] = useState<boolean>(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.hasCreatedCharacter ?? true;
      } catch {
        return false;
      }
    }
    return false;
  });
  const [creationName, setCreationName] = useState('');
  const [creationClass, setCreationClass] = useState<UserClass>('warrior');
  const [showSyncInline, setShowSyncInline] = useState(false);
  const [creationEmail, setCreationEmail] = useState('');
  const [isSyncingLanding, setIsSyncingLanding] = useState(false);
  
  // UI states
  const [isAddQuestOpen, setIsAddQuestOpen] = useState(false);
  const [isEditingCharacter, setIsEditingCharacter] = useState(false);
  const [editName, setEditName] = useState('Abdallah');
  const [editClass, setEditClass] = useState<UserClass>('scholar');
  const [hoveredAchievement, setHoveredAchievement] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cloud Sync Simulation State
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [syncEmail, setSyncEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // ---------------------------------------------------------
  // INITIAL LOAD & SCHEMA MIGRATION
  // ---------------------------------------------------------
  useEffect(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Simple schema migration function
        // Keeps old saves alive forever across schema changes v1 -> v4
        const migrated = migrate(parsed);
        
        setUserName(migrated.userName);
        setUserClass(migrated.userClass);
        setQuests(migrated.quests);
        setLedger(migrated.ledger);
        if (migrated.currentMockDate) {
          setCurrentMockDate(migrated.currentMockDate);
        }
        if (migrated.hasCreatedCharacter !== undefined) {
          setHasCreatedCharacter(migrated.hasCreatedCharacter);
        } else {
          setHasCreatedCharacter(true);
        }
        if (migrated.syncEmail) {
          setSyncEmail(migrated.syncEmail);
        }
      } catch (err) {
        console.error('Failed to parse save state, loading default mockup state', err);
        loadMockupState();
      }
    } else {
      loadMockupState();
    }
  }, []);

  // Save changes to localStorage whenever core state updates
  useEffect(() => {
    if (quests.length > 0 || ledger.length > 0) {
      const stateToSave = {
        version: SCHEMA_VERSION,
        userName,
        userClass,
        quests,
        ledger,
        currentMockDate,
        hasCreatedCharacter,
        syncEmail
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(stateToSave));
    }
  }, [userName, userClass, quests, ledger, currentMockDate, hasCreatedCharacter, syncEmail]);

  // Migration logic covering hypothetical v1->v4 schemas
  const migrate = (save: any) => {
    const updated = { ...save };
    if (!updated.version) updated.version = 1;
    
    // v1 -> v2: Added active flag to quests
    if (updated.version < 2) {
      if (updated.quests) {
        updated.quests = updated.quests.map((q: any) => ({
          ...q,
          active: q.active !== undefined ? q.active : true
        }));
      }
    }
    
    // v2 -> v3: Added target parameter for weekly quests
    if (updated.version < 3) {
      if (updated.quests) {
        updated.quests = updated.quests.map((q: any) => ({
          ...q,
          target: q.target || (q.type === 'weekly' ? 2 : 1)
        }));
      }
    }

    // v3 -> v4: Added currentMockDate configuration for robust testing
    if (updated.version < 4) {
      updated.currentMockDate = updated.currentMockDate || '2026-07-18';
      updated.version = SCHEMA_VERSION;
    }

    return updated;
  };

  const loadMockupState = () => {
    const mock = getMockSaveData('2026-07-18');
    setUserName(mock.userName);
    setUserClass(mock.userClass);
    setQuests(mock.quests);
    setLedger(mock.ledger);
    setCurrentMockDate('2026-07-18');
    showToast('Loaded Original Mockup State!');
  };

  // Helper to trigger small status popups
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ---------------------------------------------------------
  // DYNAMIC DERIVATION ENGINE (No totals stored!)
  // ---------------------------------------------------------
  
  // Total XP sum
  const totalXp = ledger.reduce((sum, entry) => sum + entry.xp, 0);

  // Level & level progress bounds
  const levelProgress = getLevelAndProgress(totalXp);
  const characterTitle = getCharacterTitle(levelProgress.level);

  // Total completions count
  const totalCleared = ledger.length;

  // App-wide active day streak (consecutive days with completions)
  const ledgerDates = ledger.map((e) => e.date);
  const appWideStreak = getAppWideStreak(ledgerDates, currentMockDate);

  // Per-stat totals
  const getStatXp = (stat: StatType): number => {
    return ledger.filter((entry) => entry.stat === stat).reduce((sum, e) => sum + e.xp, 0);
  };

  const statXps: Record<StatType, number> = {
    body: getStatXp('body'),
    mind: getStatXp('mind'),
    spirit: getStatXp('spirit'),
    career: getStatXp('career'),
    hobby: getStatXp('hobby'),
  };

  // Per-stat ranks
  const statRanks: Record<StatType, number> = {
    body: getStatRank(statXps.body),
    mind: getStatRank(statXps.mind),
    spirit: getStatRank(statXps.spirit),
    career: getStatRank(statXps.career),
    hobby: getStatRank(statXps.hobby),
  };

  // Helper to compute progress bar info for per-stat ranks
  // Rank 0 needs 100 XP. Rank 1 needs 150. Rank 2 needs 200, etc.
  const getStatRankProgress = (stat: StatType) => {
    const xp = statXps[stat];
    let rank = 0;
    let costForNextRank = 100;
    let accumulatedXp = 0;

    while (true) {
      if (xp >= accumulatedXp + costForNextRank) {
        accumulatedXp += costForNextRank;
        rank++;
        costForNextRank += 50;
      } else {
        const progressInRank = xp - accumulatedXp;
        const percent = Math.min(100, Math.round((progressInRank / costForNextRank) * 100));
        return {
          current: progressInRank,
          target: costForNextRank,
          percentage: percent,
        };
      }
    }
  };

  // Helper to calculate a single quest's current streak
  const getQuestStreak = (q: Quest): number => {
    const questCompletions = ledger.filter((e) => e.questId === q.id).map((e) => e.date);
    if (q.type === 'daily') {
      return getDailyQuestStreak(questCompletions, currentMockDate);
    } else if (q.type === 'weekly') {
      return getWeeklyQuestStreak(questCompletions, q.target, currentMockDate);
    }
    return 0; // Milestones do not have streaks
  };

  // Check achievements unlocks
  const unlockedAchievementsCount = ACHIEVEMENTS.reduce((count, ach) => {
    const isUnlocked = ach.check({
      ledger,
      quests,
      level: levelProgress.level,
      statRanks,
      getQuestStreak,
    });
    return count + (isUnlocked ? 1 : 0);
  }, 0);

  // Calculate effort distribution for Radar & Balance Chart based on timeframe
  const getEffortForTimeframe = (daysLimit: number | null) => {
    let filteredEntries = ledger;
    if (daysLimit !== null) {
      const boundaryDate = getDaysAgoStr(currentMockDate, daysLimit - 1);
      filteredEntries = ledger.filter((entry) => entry.date >= boundaryDate && entry.date <= currentMockDate);
    }

    const timeframeTotals: Record<StatType, number> = {
      body: 0,
      mind: 0,
      spirit: 0,
      career: 0,
      hobby: 0,
    };

    for (const entry of filteredEntries) {
      timeframeTotals[entry.stat] += entry.xp;
    }

    const sumXp = Object.values(timeframeTotals).reduce((sum, v) => sum + v, 0);

    const effort: Record<StatType, { xp: number; percentage: number }> = {
      body: { xp: timeframeTotals.body, percentage: 0 },
      mind: { xp: timeframeTotals.mind, percentage: 0 },
      spirit: { xp: timeframeTotals.spirit, percentage: 0 },
      career: { xp: timeframeTotals.career, percentage: 0 },
      hobby: { xp: timeframeTotals.hobby, percentage: 0 },
    };

    if (sumXp > 0) {
      for (const key in effort) {
        const s = key as StatType;
        effort[s].percentage = Math.round((timeframeTotals[s] / sumXp) * 100);
      }
    }

    return { effort, sumXp };
  };

  const activeTimeframeDays = timeframe === '7' ? 7 : timeframe === '30' ? 30 : null;
  const { effort: timeframeEffort, sumXp: timeframeTotalXp } = getEffortForTimeframe(activeTimeframeDays);

  // Generate dynamic caption
  const generateBalanceCaption = () => {
    if (timeframeTotalXp === 0) {
      return 'No quests logged in this timeframe. Set forth on your habits to trace your aura!';
    }

    const effortArray = (Object.keys(timeframeEffort) as StatType[]).map((s) => ({
      stat: s,
      ...timeframeEffort[s],
    }));

    // Sort by percentage descending
    effortArray.sort((a, b) => b.percentage - a.percentage);

    const highest = effortArray[0];
    const lowest = effortArray[effortArray.length - 1];

    const tfLabel = timeframe === '7' ? '7 days' : timeframe === '30' ? '30 days' : 'all time';

    return (
      <>
        <span className={`${STATS[highest.stat].textClass} font-semibold capitalize`}>{STATS[highest.stat].name}</span> takes the most of you in the last {tfLabel} at <span className="font-mono text-white font-bold">{highest.percentage}%</span> of your XP. <span className={`${STATS[lowest.stat].textClass} font-semibold capitalize`}>{STATS[lowest.stat].name}</span> gets the least, at <span className="font-mono text-white font-bold">{lowest.percentage}%</span>.
      </>
    );
  };

  // ---------------------------------------------------------
  // CORE ACTION LOGIC (Checkboxes, Toggles, and Appends)
  // ---------------------------------------------------------
  
  // Is quest completed today?
  const isLoggedToday = (questId: string): boolean => {
    return ledger.some((entry) => entry.questId === questId && entry.date === currentMockDate);
  };

  // Count completions in the current week (Monday to Sunday)
  const getWeeklyCompletionsCount = (questId: string): number => {
    const mondayStr = getMonday(currentMockDate);
    const sundayStr = getDaysAgoStr(mondayStr, -6); // Monday + 6 days = Sunday
    return ledger.filter(
      (entry) => entry.questId === questId && entry.date >= mondayStr && entry.date <= sundayStr
    ).length;
  };

  // Is a weekly quest satisfied right now?
  const isWeeklySatisfied = (q: Quest): boolean => {
    return getWeeklyCompletionsCount(q.id) >= q.target;
  };

  // Is a milestone quest satisfied?
  const isMilestoneSatisfied = (questId: string): boolean => {
    return ledger.some((entry) => entry.questId === questId);
  };

  // Click handler for check circle: "did I log this today?"
  const handleToggleCheckCircle = (q: Quest) => {
    const alreadyLoggedToday = isLoggedToday(q.id);

    if (q.type === 'daily') {
      if (alreadyLoggedToday) {
        // Undo today's completion (remove ledger entry)
        setLedger(ledger.filter((entry) => !(entry.questId === q.id && entry.date === currentMockDate)));
        showToast(`Removed today's log for "${q.title}"`);
      } else {
        // Complete it today!
        const xp = calculateQuestXp(q.difficulty, q.type, q.stat, userClass);
        const newEntry: LedgerEntry = {
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          date: currentMockDate,
          questId: q.id,
          questTitle: q.title,
          xp,
          stat: q.stat,
          difficulty: q.difficulty,
          type: q.type,
        };
        setLedger([...ledger, newEntry]);
        showToast(`Earned +${xp} XP! "${q.title}" logged`);
      }
    } else if (q.type === 'weekly') {
      // For weekly quests, the user can log it multiple times a week. Clicking adds a completion for today.
      // If already logged today, we toggle it off (undo), otherwise we add another!
      if (alreadyLoggedToday) {
        // Remove one log for today
        const idx = ledger.findIndex((entry) => entry.questId === q.id && entry.date === currentMockDate);
        if (idx !== -1) {
          const updatedLedger = [...ledger];
          updatedLedger.splice(idx, 1);
          setLedger(updatedLedger);
          showToast(`Undone today's log for "${q.title}"`);
        }
      } else {
        const xp = calculateQuestXp(q.difficulty, q.type, q.stat, userClass);
        const newEntry: LedgerEntry = {
          id: `log_${Date.now()}`,
          date: currentMockDate,
          questId: q.id,
          questTitle: q.title,
          xp,
          stat: q.stat,
          difficulty: q.difficulty,
          type: q.type,
        };
        setLedger([...ledger, newEntry]);
        showToast(`Earned +${xp} XP! "${q.title}" logged today`);
      }
    } else if (q.type === 'milestone') {
      // Milestones are done once and cleared forever
      if (isMilestoneSatisfied(q.id)) {
        // Undo milestone
        setLedger(ledger.filter((entry) => entry.questId !== q.id));
        showToast(`Reset milestone "${q.title}" to unfinished`);
      } else {
        const xp = calculateQuestXp(q.difficulty, q.type, q.stat, userClass);
        const newEntry: LedgerEntry = {
          id: `log_${Date.now()}`,
          date: currentMockDate,
          questId: q.id,
          questTitle: q.title,
          xp,
          stat: q.stat,
          difficulty: q.difficulty,
          type: q.type,
        };
        setLedger([...ledger, newEntry]);
        showToast(`Milestone Complete! Earned +${xp} XP!`);
      }
    }
  };

  // Add a new quest
  const handleAddQuest = (questData: Omit<Quest, 'id' | 'createdAt' | 'active'>) => {
    const newQuest: Quest = {
      ...questData,
      id: `quest_${Date.now()}`,
      createdAt: currentMockDate,
      active: true,
    };
    setQuests([...quests, newQuest]);
    showToast(`Drafted new Quest: "${newQuest.title}"`);
  };

  // Archive/delete quest (keeping XP ledger intact!)
  const handleDeleteQuest = (questId: string) => {
    setQuests(quests.map((q) => (q.id === questId ? { ...q, active: false } : q)));
    showToast('Quest removed. Historical XP remains in your ledger.');
  };

  // Edit character profile
  const handleSaveCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    const name = editName.trim();
    if (!name) {
      showToast('Your character needs a name.');
      return;
    }
    setUserName(name);
    setUserClass(editClass);
    setIsEditingCharacter(false);
    showToast(`Profile updated to ${name} the ${CLASSES[editClass].name}!`);
  };

  // Trigger simulated Cloud Sync via email link
  const handleCloudSync = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setIsSyncing(true);

    setTimeout(() => {
      setSyncEmail(emailInput.trim());
      setIsSyncing(false);
      setIsSyncOpen(false);
      showToast('Cloud sync complete. Database merged offline-first!');
    }, 1500);
  };

  // Handle character creation submission on landing page
  const handleBeginAdventure = (e: React.FormEvent) => {
    e.preventDefault();
    const name = creationName.trim();
    if (!name) {
      showToast('Your character needs a name.');
      return;
    }
    
    setUserName(name);
    setUserClass(creationClass);
    setHasCreatedCharacter(true);
    showToast(`Welcome, ${name} the ${CLASSES[creationClass].name}! Your quest begins.`);
  };

  // Handle cloud sync simulation on landing page
  const handleSyncLanding = (e: React.FormEvent) => {
    e.preventDefault();
    const email = creationEmail.trim();
    if (!email) return;
    setIsSyncingLanding(true);

    setTimeout(() => {
      setSyncEmail(email);
      setHasCreatedCharacter(true);
      setIsSyncingLanding(false);
      showToast('Cloud sync complete. Welcome back, Adventurer!');
    }, 1500);
  };

  // ---------------------------------------------------------
  // MOCK SYSTEM UTILITIES (Temporals, Freebies, Resets)
  // ---------------------------------------------------------
  const handleAddFreeXp = (xp: number) => {
    // We add free XP by creating a historical dummy entry on today's date
    const dummyEntry: LedgerEntry = {
      id: `free_${Date.now()}`,
      date: currentMockDate,
      questId: 'free_xp_grant',
      questTitle: 'Astral XP Infusion',
      xp,
      stat: 'spirit', // Infuse into Spirit
      difficulty: 'hard',
      type: 'milestone',
    };
    setLedger([...ledger, dummyEntry]);
    showToast(`Granted +${xp} XP free bounty!`);
  };

  const handleAdvanceDay = () => {
    const nextDate = getNextDateStr(currentMockDate);
    setCurrentMockDate(nextDate);
    showToast(`Time warped 1 day forward to ${nextDate}`);
  };

  const handleAdvanceWeek = () => {
    const d = new Date(currentMockDate + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    const nextDate = toDateStr(d);
    setCurrentMockDate(nextDate);
    showToast(`Time warped 1 week forward to ${nextDate}`);
  };

  // Group active quests
  const activeQuests = quests.filter((q) => q.active);
  const activeDailies = activeQuests.filter((q) => q.type === 'daily');
  const activeWeeklies = activeQuests.filter((q) => q.type === 'weekly');
  const activeMilestones = activeQuests.filter((q) => q.type === 'milestone');

  // Fractions for fractions displays in UI:
  // 1. Standing quest count satisfied right now
  const countStandingSatisfied = activeQuests.filter((q) => {
    if (q.type === 'daily') return isLoggedToday(q.id);
    if (q.type === 'weekly') return isWeeklySatisfied(q);
    return isMilestoneSatisfied(q.id); // Milestone
  }).length;

  // 2. Dailies completed today
  const countDailiesClearedToday = activeDailies.filter((q) => isLoggedToday(q.id)).length;

  // 3. Weeklies met targets this week
  const countWeekliesSatisfiedThisWeek = activeWeeklies.filter((q) => isWeeklySatisfied(q)).length;

  // 4. Milestones cleared
  const countMilestonesCleared = activeMilestones.filter((q) => isMilestoneSatisfied(q.id)).length;

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!hasCreatedCharacter) {
    return (
      <div className="min-h-screen bg-[#050510] text-[#e0e0e0] font-sans pb-12 antialiased selection:bg-[#d4af37]/30 selection:text-white flex flex-col justify-between">
        {/* Toast Alert popups */}
        {toastMessage && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#15152a] border border-[#d4af37]/30 text-[#d4af37] px-5 py-3 rounded-lg shadow-2xl font-mono text-xs flex items-center gap-2.5 animate-bounce">
            <Sparkles className="w-4 h-4 text-[#d4af37] animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
          {/* Logo and Intro text */}
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="flex items-center justify-center gap-3.5 mb-4">
              <div className="w-5 h-5 bg-gradient-to-r from-[#d4af37] to-[#aa7c11] rounded-sm rotate-45 border border-[#d4af37]/30 shadow-md glow-active" />
              <h1 className="font-serif text-3xl md:text-5xl font-bold tracking-[0.25em] text-[#d4af37] uppercase select-none cursor-default">
                HABITQUEST
              </h1>
            </div>
            <p className="font-serif text-sm md:text-base italic text-slate-400 leading-relaxed max-w-xl mx-auto">
              Your habits are quests. Clearing them earns XP. Keep at it and the character on the page becomes a record of the one at the keyboard.
            </p>
          </div>

          {/* MAIN CARD */}
          <div className="w-full max-w-xl bg-[#15152a] border border-[#d4af37]/20 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.08)]">
            {!showSyncInline ? (
              /* CREATE YOUR CHARACTER FORM */
              <form onSubmit={handleBeginAdventure} className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="font-serif text-lg font-bold text-[#d4af37] uppercase tracking-widest">
                    CREATE YOUR CHARACTER
                  </h2>
                </div>

                {/* NAME INPUT */}
                <div>
                  <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-bold">
                    NAME
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={24}
                    placeholder="What should we call you?"
                    value={creationName}
                    onChange={(e) => setCreationName(e.target.value)}
                    className="w-full bg-[#1a1a2e] border border-white/5 focus:border-[#d4af37]/50 rounded-lg py-3 px-4 text-sm text-[#e0e0e0] placeholder-slate-600 outline-none transition-all font-sans"
                  />
                </div>

                {/* CLASS GRID */}
                <div>
                  <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-widest mb-3 font-bold">
                    CLASS
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* WARRIOR */}
                    <button
                      type="button"
                      onClick={() => setCreationClass('warrior')}
                      className={`p-4 rounded-lg border text-left transition-all cursor-pointer bg-[#101020]/60 ${
                        creationClass === 'warrior'
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                          : 'border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300'
                      }`}
                    >
                      <span className="font-mono text-xs font-semibold tracking-widest uppercase block mb-0.5">
                        WARRIOR
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block leading-relaxed">
                        Bonus XP on Body quests
                      </span>
                    </button>

                    {/* SCHOLAR */}
                    <button
                      type="button"
                      onClick={() => setCreationClass('scholar')}
                      className={`p-4 rounded-lg border text-left transition-all cursor-pointer bg-[#101020]/60 ${
                        creationClass === 'scholar'
                          ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                          : 'border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300'
                      }`}
                    >
                      <span className="font-mono text-xs font-semibold tracking-widest uppercase block mb-0.5">
                        SCHOLAR
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block leading-relaxed">
                        Bonus XP on Mind quests
                      </span>
                    </button>

                    {/* MONK */}
                    <button
                      type="button"
                      onClick={() => setCreationClass('monk')}
                      className={`p-4 rounded-lg border text-left transition-all cursor-pointer bg-[#101020]/60 ${
                        creationClass === 'monk'
                          ? 'border-purple-500/50 bg-purple-500/10 text-purple-400'
                          : 'border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300'
                      }`}
                    >
                      <span className="font-mono text-xs font-semibold tracking-widest uppercase block mb-0.5">
                        MONK
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block leading-relaxed">
                        Bonus XP on Spirit quests
                      </span>
                    </button>

                    {/* GUILDMASTER */}
                    <button
                      type="button"
                      onClick={() => setCreationClass('guildmaster')}
                      className={`p-4 rounded-lg border text-left transition-all cursor-pointer bg-[#101020]/60 ${
                        creationClass === 'guildmaster'
                          ? 'border-orange-500/50 bg-orange-500/10 text-orange-400'
                          : 'border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300'
                      }`}
                    >
                      <span className="font-mono text-xs font-semibold tracking-widest uppercase block mb-0.5">
                        GUILDMASTER
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block leading-relaxed">
                        Bonus XP on Career quests
                      </span>
                    </button>

                    {/* BARD */}
                    <button
                      type="button"
                      onClick={() => setCreationClass('bard')}
                      className={`sm:col-span-2 p-4 rounded-lg border transition-all cursor-pointer bg-[#101020]/60 text-center ${
                        creationClass === 'bard'
                          ? 'border-pink-500/50 bg-pink-500/10 text-pink-400'
                          : 'border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300'
                      }`}
                    >
                      <span className="font-mono text-xs font-semibold tracking-widest uppercase block mb-0.5">
                        BARD
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block leading-relaxed">
                        Bonus XP on Hobby quests
                      </span>
                    </button>
                  </div>
                </div>

                {/* BEGIN BUTTON */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-[#aa7c11] to-[#d4af37] hover:from-[#d4af37] hover:to-[#f3e5ab] text-slate-950 font-sans font-bold text-xs uppercase tracking-widest py-3 px-8 rounded-md shadow-lg transition-all cursor-pointer"
                  >
                    BEGIN
                  </button>
                </div>
              </form>
            ) : (
              /* SIGN IN TO SYNC FORM */
              <form onSubmit={handleSyncLanding} className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="font-serif text-lg font-bold text-[#d4af37] uppercase tracking-widest">
                    SIGN IN TO SYNC
                  </h2>
                  <p className="font-sans text-xs text-slate-400 mt-1.5 leading-normal">
                    Enter your email to request a passwordless code and synchronize your hero logs.
                  </p>
                </div>

                <div>
                  <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-bold">
                    EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={creationEmail}
                    onChange={(e) => setCreationEmail(e.target.value)}
                    className="w-full bg-[#1a1a2e] border border-white/5 focus:border-[#d4af37]/50 rounded-lg py-3 px-4 text-sm text-[#e0e0e0] placeholder-slate-600 outline-none transition-all font-sans"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSyncInline(false)}
                    className="flex-1 border border-white/5 text-slate-400 font-mono text-[10px] uppercase tracking-wider py-2.5 rounded-md hover:bg-[#1a1a2e] transition-colors cursor-pointer"
                  >
                    Back to Character Creation
                  </button>
                  <button
                    type="submit"
                    disabled={isSyncingLanding}
                    className="flex-1 bg-gradient-to-r from-[#aa7c11] to-[#d4af37] hover:from-[#d4af37] hover:to-[#f3e5ab] text-[#050510] font-sans font-bold text-xs uppercase tracking-widest py-2.5 rounded-md shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isSyncingLanding ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Simulating link...
                      </>
                    ) : (
                      'Request Code'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* SIGN IN TO SYNC FOOTER LINK */}
          {!showSyncInline && (
            <p className="text-center font-mono text-[10px] text-slate-500 mt-8 select-none">
              Already have a character on another device?{' '}
              <button
                type="button"
                onClick={() => setShowSyncInline(true)}
                className="text-[#d4af37] hover:text-[#f3e5ab] font-bold tracking-wider cursor-pointer uppercase transition-colors"
              >
                SIGN IN TO SYNC
              </button>
            </p>
          )}
        </div>

        {/* Diagnostics Panel under landing screen */}
        <div className="fixed bottom-4 right-4 z-50">
          <DiagnosticsPanel
            currentMockDate={currentMockDate}
            onSetMockDate={setCurrentMockDate}
            onAdvanceDay={handleAdvanceDay}
            onAdvanceWeek={handleAdvanceWeek}
            onAddFreeXp={handleAddFreeXp}
            onResetToMockup={loadMockupState}
          />
        </div>

        {/* Footer */}
        <footer className="text-center border-t border-white/5 pt-6 font-mono text-[9px] text-slate-600 uppercase select-none">
          <p>Every shaded day holds the memory of your discipline.</p>
          <p className="mt-1 text-[8px] text-slate-700">Habit Quest © 2026 · Local-First RPG Ledger System</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050510] text-[#e0e0e0] font-sans pb-24 antialiased selection:bg-[#d4af37]/30 selection:text-white">
      
      {/* Toast Alert popups */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#15152a] border border-[#d4af37]/30 text-[#d4af37] px-5 py-3 rounded-lg shadow-2xl font-mono text-xs flex items-center gap-2.5 animate-bounce">
          <Sparkles className="w-4 h-4 text-[#d4af37] animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER BAR */}
      <header className="border-b border-[#d4af37]/30 bg-[#15152a]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 bg-gradient-to-r from-[#d4af37] to-[#aa7c11] rounded-sm rotate-45 border border-[#d4af37]/30 shadow-md glow-active" />
            <h1 className="font-serif text-lg font-bold tracking-[0.25em] text-[#d4af37] uppercase select-none cursor-default">
              HABITQUEST
            </h1>
          </div>

          {/* Controls & Sync */}
          <div className="flex items-center gap-3.5">
            {/* Sync trigger button */}
            <button
              onClick={() => {
                setIsSyncOpen(!isSyncOpen);
                setEmailInput(syncEmail || '');
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-mono uppercase tracking-wider cursor-pointer transition-all ${
                syncEmail
                  ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                  : 'border-white/10 bg-[#1a1a2e]/50 text-[#e0e0e0]/70 hover:border-[#d4af37]/40 hover:text-white'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${syncEmail ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
              <span>{syncEmail ? 'SYNC ACTIVE' : 'SYNC'}</span>
            </button>

            {/* Sync dropdown popover */}
            {isSyncOpen && (
              <div className="absolute top-16 right-4 sm:right-20 bg-[#15152a] border border-[#d4af37]/30 rounded-lg p-4 w-72 shadow-2xl z-40 animate-fade-in">
                <h4 className="font-serif text-xs font-bold text-[#d4af37] uppercase mb-1">
                  Optional Cloud Sync
                </h4>
                <p className="font-sans text-[10px] text-slate-400 leading-normal mb-3">
                  Back up and mirror your habits across devices using passwordless email codes. Works fully offline by merging logs.
                </p>

                {syncEmail ? (
                  <div className="space-y-3">
                    <div className="bg-[#1a1a2e] border border-white/5 p-2.5 rounded text-left">
                      <span className="font-mono text-[8px] text-slate-500 uppercase block">Synced Profile:</span>
                      <span className="font-mono text-xs text-emerald-400 font-bold block overflow-ellipsis overflow-hidden">{syncEmail}</span>
                    </div>
                    <button
                      onClick={() => {
                        setSyncEmail(null);
                        showToast('Sync profile logged out.');
                      }}
                      className="w-full bg-[#1a1a2e] border border-white/10 hover:border-rose-500/30 text-rose-400 font-mono text-[9px] uppercase tracking-wider py-1.5 rounded cursor-pointer transition-all"
                    >
                      Sever Connection
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleCloudSync} className="space-y-3">
                    <input
                      type="email"
                      required
                      placeholder="Enter your email address"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full bg-[#1a1a2e] border border-white/10 focus:border-[#d4af37]/40 rounded py-1.5 px-2.5 text-xs text-slate-200 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isSyncing}
                      className="w-full bg-[#d4af37] hover:bg-[#f3e5ab] text-[#050510] font-mono text-[9px] font-bold uppercase py-1.5 rounded cursor-pointer transition-all flex items-center justify-center gap-1.5"
                    >
                      {isSyncing ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" /> Simulating link...
                        </>
                      ) : (
                        'Request Passwordless Code'
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Current Date Display */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 border border-white/5 bg-[#1a1a2e] rounded-md font-mono text-[10px] text-[#e0e0e0] cursor-default select-none uppercase tracking-wider"
              title="Current Date"
            >
              <Calendar className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>{formatDateLabel(currentMockDate)}</span>
            </div>

          </div>
        </div>
      </header>

      {/* CORE LAYOUT */}
      <main className="max-w-7xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* =========================================================
              LEFT COLUMN (CHARACTER, LEDGER, ACHIEVEMENTS)
              ========================================================= */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* CHARACTER CARD */}
            <div id="character-panel" className="bg-[#15152a] border border-[#d4af37]/20 rounded-lg p-5 shadow-[0_0_15px_rgba(212,175,55,0.05)] relative overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
                  CHARACTER
                </span>
                
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[10px] text-[#d4af37] font-semibold uppercase tracking-wider">
                    {CLASSES[userClass].name}
                  </span>
                  {!isEditingCharacter && (
                    <button
                      onClick={() => {
                        setEditName(userName);
                        setEditClass(userClass);
                        setIsEditingCharacter(true);
                      }}
                      className="p-1 text-slate-500 hover:text-[#d4af37] transition-colors cursor-pointer"
                      title="Edit Profile"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Character display mode */}
              <>
                {/* The dynamic engraved Sigil SVG */}
                <Sigil userClass={userClass} statXps={statXps} level={levelProgress.level} />

                <div className="text-center mt-3 mb-5">
                  <h2 className="font-serif text-2xl font-bold text-[#d4af37] uppercase tracking-wide">
                    {userName}
                  </h2>
                  <span className="font-mono text-[10px] text-[#d4af37]/80 uppercase tracking-widest block mt-0.5 font-bold">
                    {characterTitle}
                  </span>
                </div>

                {/* Level Progress Bar */}
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <div className="flex justify-between items-center font-mono text-[10px]">
                    <span className="text-slate-300 font-bold">Level {levelProgress.level}</span>
                    <span className="text-slate-500">
                      <span className="text-[#d4af37] font-semibold">{levelProgress.currentXp}</span> / {levelProgress.nextLevelCost} XP
                    </span>
                  </div>
                  <div className="w-full bg-[#1a1a2e] h-2 rounded overflow-hidden border border-white/5 shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-[#aa7c11] to-[#d4af37] rounded-r-sm transition-all duration-500"
                      style={{ width: `${Math.min(100, (levelProgress.currentXp / levelProgress.nextLevelCost) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stat-specific ranks progress section */}
                <div className="space-y-3 pt-5 mt-5 border-t border-white/5">
                  {(Object.keys(STATS) as StatType[]).map((s) => {
                    const config = STATS[s];
                    const rank = statRanks[s];
                    const rankProgress = getStatRankProgress(s);
                    return (
                      <div key={s} className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-slate-400 capitalize font-medium">{config.name}</span>
                          <span className={`${config.textClass} font-bold`}>Rank {rank}</span>
                        </div>
                        {/* Mini Stat Rank Progress Bar */}
                        <div className="w-full bg-[#1a1a2e] h-1.5 rounded overflow-hidden border border-white/5 relative">
                          <div
                            className="h-full transition-all duration-500 rounded-r-sm"
                            style={{
                              width: `${rankProgress.percentage}%`,
                              backgroundColor: config.color,
                            }}
                          />
                        </div>
                        {/* Progress text on hover / detail */}
                        <div className="flex justify-between text-[8px] font-mono text-slate-600 uppercase tracking-wider">
                          <span>{config.covers}</span>
                          <span>{statXps[s]} XP total</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            </div>

            {/* LEDGER CARD */}
            <div id="ledger-stats-panel" className="bg-[#15152a] border border-[#d4af37]/20 rounded-lg p-5 shadow-[0_0_15px_rgba(212,175,55,0.05)]">
              <h3 className="font-mono text-[10px] text-slate-500 uppercase tracking-widest mb-4">
                LEDGER
              </h3>
              
              <div className="grid grid-cols-3 gap-2.5 text-center">
                
                {/* Total XP */}
                <div className="bg-[#1a1a2e] border border-white/5 rounded-md p-3">
                  <span className="font-mono text-[22px] font-bold text-[#d4af37] block">
                    {totalXp}
                  </span>
                  <span className="font-mono text-[8px] text-slate-500 uppercase tracking-wider block mt-0.5">
                    TOTAL XP
                  </span>
                </div>

                {/* Cleared Count */}
                <div className="bg-[#1a1a2e] border border-white/5 rounded-md p-3">
                  <span className="font-mono text-[22px] font-bold text-slate-200 block">
                    {totalCleared}
                  </span>
                  <span className="font-mono text-[8px] text-slate-500 uppercase tracking-wider block mt-0.5">
                    CLEARED
                  </span>
                </div>

                {/* Day Streak */}
                <div className="bg-[#1a1a2e] border border-white/5 rounded-md p-3 relative group">
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-mono text-[22px] font-bold text-[#d4af37] block">
                      {appWideStreak}
                    </span>
                    <Flame className={`w-4 h-4 text-[#d4af37] ${appWideStreak > 0 ? 'animate-pulse' : 'opacity-30'}`} />
                  </div>
                  <span className="font-mono text-[8px] text-slate-500 uppercase tracking-wider block mt-0.5">
                    DAY STREAK
                  </span>
                </div>

              </div>
            </div>

            {/* ACHIEVEMENTS CARD */}
            <div id="achievements-panel" className="bg-[#15152a] border border-[#d4af37]/20 rounded-lg p-5 shadow-[0_0_15px_rgba(212,175,55,0.05)] relative">
              <div className="flex justify-between items-center mb-4">
                <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
                  ACHIEVEMENTS
                </span>
                <span className="font-mono text-[10px] text-[#d4af37] font-bold uppercase">
                  {unlockedAchievementsCount} / 11
                </span>
              </div>

              {/* Achievements dynamic grid list */}
              <div className="space-y-3.5">
                {ACHIEVEMENTS.map((ach) => {
                  const isUnlocked = ach.check({
                    ledger,
                    quests,
                    level: levelProgress.level,
                    statRanks,
                    getQuestStreak,
                  });

                  return (
                    <div
                      key={ach.id}
                      className="relative flex items-center gap-3 bg-[#1a1a2e]/60 p-2 rounded border border-white/5 group"
                    >
                      {/* Roman Numeral / Custom Icon Circle */}
                      <div
                        className={`w-7 h-7 rounded-full border flex items-center justify-center font-mono text-[9px] font-bold shadow-md transition-all ${
                          isUnlocked
                            ? 'border-[#d4af37]/50 bg-[#d4af37]/10 text-[#d4af37]'
                            : 'border-white/5 bg-[#050510]/50 text-slate-600'
                        }`}
                      >
                        {ach.numIcon || 'I'}
                      </div>

                      {/* Title & Criteria */}
                      <div className="flex-1 text-left">
                        <h4
                          className={`font-sans text-[11px] font-semibold transition-colors duration-200 ${
                            isUnlocked ? 'text-slate-200' : 'text-slate-500 line-through'
                          }`}
                        >
                          {ach.title}
                        </h4>
                        <p className="font-sans text-[9px] text-slate-500 leading-normal">
                          {ach.description}
                        </p>
                      </div>

                      {/* Unlocked lock/checkmark marker */}
                      {isUnlocked && (
                        <div className="w-2 h-2 rounded-full bg-[#d4af37] shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* =========================================================
              RIGHT COLUMN (QUEST LOG, BALANCE, CHRONICLE)
              ========================================================= */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* QUEST LOG CARD */}
            <div id="quest-log-card" className="bg-[#15152a] border border-[#d4af37]/20 rounded-lg p-6 shadow-[0_0_15px_rgba(212,175,55,0.05)] relative">
              <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-3">
                <div>
                  <h2 className="font-serif text-lg font-bold text-[#d4af37] uppercase tracking-widest">
                    QUEST LOG
                  </h2>
                  <p className="font-mono text-[9px] text-slate-500 uppercase mt-0.5">
                    Your Current Habits and Milestones
                  </p>
                </div>
                <div className="font-mono text-[10px] text-slate-300 bg-[#1a1a2e] border border-white/5 py-1 px-3 rounded">
                  <span className="text-[#d4af37] font-bold">{countStandingSatisfied}</span> of {activeQuests.length} standing cleared
                </div>
              </div>

              {/* DAILY QUESTS CONTAINER */}
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                  <h3 className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    DAILY QUESTS
                  </h3>
                  <span className="font-mono text-[9px] text-slate-500 uppercase">
                    {countDailiesClearedToday} of {activeDailies.length} cleared today
                  </span>
                </div>

                {activeDailies.length === 0 ? (
                  <p className="font-mono text-[10px] text-slate-600 py-2">No standing daily quests. Click "+ Add a Quest" to establish one!</p>
                ) : (
                  <div className="space-y-3">
                    {activeDailies.map((q) => {
                      const completedToday = isLoggedToday(q.id);
                      const config = STATS[q.stat];
                      const streak = getQuestStreak(q);
                      const baseChanceXp = calculateQuestXp(q.difficulty, q.type, q.stat, userClass);

                      return (
                        <div
                          key={q.id}
                          className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                            completedToday
                              ? 'bg-[#0c0c1b]/85 border-white/5 opacity-65'
                              : 'bg-[#1a1a2e] hover:bg-[#1e1e36] border-white/5 hover:border-[#d4af37]/30'
                          }`}
                          style={{
                            borderLeftWidth: '4px',
                            borderLeftColor: config.color,
                          }}
                        >
                          {/* Left: Custom Check Button */}
                          <button
                            onClick={() => handleToggleCheckCircle(q)}
                            className="text-slate-500 hover:text-[#d4af37] transition-colors cursor-pointer"
                          >
                            {completedToday ? (
                              <CheckCircle2 className="w-5.5 h-5.5" style={{ color: config.color }} />
                            ) : (
                              <Circle className="w-5.5 h-5.5 hover:scale-105 transition-transform" style={{ color: config.color }} />
                            )}
                          </button>

                          {/* Middle: Details */}
                          <div className="flex-1 text-left">
                            <h4
                              className={`font-sans text-xs font-semibold leading-snug ${
                                completedToday ? 'text-slate-400 line-through' : 'text-slate-100'
                              }`}
                            >
                              {q.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1 font-mono text-[9px] text-slate-500 uppercase">
                              <span className="font-bold" style={{ color: config.color }}>{config.name}</span>
                              <span>·</span>
                              <span>{baseChanceXp} XP</span>
                              <span>·</span>
                              <span>{q.difficulty}</span>
                              {streak > 0 && (
                                <>
                                  <span>·</span>
                                  <span className="text-[#d4af37]/90 flex items-center gap-0.5 lowercase font-bold">
                                    <Flame className="w-2.5 h-2.5" /> {streak} {streak === 1 ? 'day' : 'days'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Right: delete action */}
                          <button
                            onClick={() => handleDeleteQuest(q.id)}
                            className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Abandon Quest"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* WEEKLY QUESTS CONTAINER */}
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                  <h3 className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    WEEKLY QUESTS
                  </h3>
                  <span className="font-mono text-[9px] text-slate-500 uppercase">
                    {countWeekliesSatisfiedThisWeek} of {activeWeeklies.length} on target this week
                  </span>
                </div>

                {activeWeeklies.length === 0 ? (
                  <p className="font-mono text-[10px] text-slate-600 py-2">No standing weekly quests. Click "+ Add a Quest" to establish one!</p>
                ) : (
                  <div className="space-y-3">
                    {activeWeeklies.map((q) => {
                      const loggedToday = isLoggedToday(q.id);
                      const satisfiedThisWeek = isWeeklySatisfied(q);
                      const config = STATS[q.stat];
                      const streak = getQuestStreak(q);
                      const baseChanceXp = calculateQuestXp(q.difficulty, q.type, q.stat, userClass);
                      const currentWeekCount = getWeeklyCompletionsCount(q.id);

                      return (
                        <div
                          key={q.id}
                          className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                            satisfiedThisWeek
                              ? 'bg-[#0c0c1b]/85 border-white/5 opacity-65 font-light'
                              : 'bg-[#1a1a2e] hover:bg-[#1e1e36] border-white/5 hover:border-[#d4af37]/30'
                          }`}
                          style={{
                            borderLeftWidth: '4px',
                            borderLeftColor: config.color,
                          }}
                        >
                          {/* Left Check Circle button toggles today's log */}
                          <button
                            onClick={() => handleToggleCheckCircle(q)}
                            className="text-slate-500 hover:text-[#d4af37] transition-colors cursor-pointer relative"
                          >
                            {loggedToday ? (
                              <CheckCircle2 className="w-5.5 h-5.5" style={{ color: config.color }} />
                            ) : satisfiedThisWeek ? (
                              <CheckCircle2 className="w-5.5 h-5.5 opacity-50" style={{ color: config.color }} />
                            ) : (
                              <Circle className="w-5.5 h-5.5 hover:scale-105 transition-transform" style={{ color: config.color }} />
                            )}
                          </button>

                          {/* Middle: Info */}
                          <div className="flex-1 text-left">
                            <h4
                              className={`font-sans text-xs font-semibold leading-snug ${
                                satisfiedThisWeek ? 'text-slate-400 line-through' : 'text-slate-100'
                              }`}
                            >
                              {q.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1 font-mono text-[9px] text-slate-500 uppercase">
                              <span className="font-bold" style={{ color: config.color }}>{config.name}</span>
                              <span>·</span>
                              <span>{baseChanceXp} XP</span>
                              <span>·</span>
                              <span>{q.difficulty}</span>
                              <span>·</span>
                              <span className={currentWeekCount >= q.target ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                                {currentWeekCount} of {q.target} this week
                              </span>
                              {streak > 0 && (
                                <>
                                  <span>·</span>
                                  <span className="text-[#d4af37]/90 flex items-center gap-0.5 lowercase font-bold">
                                    <Flame className="w-2.5 h-2.5" /> {streak} {streak === 1 ? 'week' : 'weeks'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Right: delete action */}
                          <button
                            onClick={() => handleDeleteQuest(q.id)}
                            className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Abandon Quest"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* MILESTONES CONTAINER */}
              <div className="space-y-4 mb-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                  <h3 className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    MILESTONES
                  </h3>
                  <span className="font-mono text-[9px] text-slate-500 uppercase">
                    {countMilestonesCleared} of {activeMilestones.length} cleared
                  </span>
                </div>

                {activeMilestones.length === 0 ? (
                  <p className="font-mono text-[10px] text-slate-600 py-2">No standing milestone quests. Click "+ Add a Quest" to declare a grand task!</p>
                ) : (
                  <div className="space-y-3">
                    {activeMilestones.map((q) => {
                      const cleared = isMilestoneSatisfied(q.id);
                      const config = STATS[q.stat];
                      const baseChanceXp = calculateQuestXp(q.difficulty, q.type, q.stat, userClass);

                      return (
                        <div
                          key={q.id}
                          className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                            cleared
                              ? 'bg-[#0c0c1b]/85 border-white/5 opacity-65 font-light'
                              : 'bg-[#1a1a2e] hover:bg-[#1e1e36] border-white/5 hover:border-[#d4af37]/30'
                          }`}
                          style={{
                            borderLeftWidth: '4px',
                            borderLeftColor: config.color,
                          }}
                        >
                          {/* Left check box toggles clearance */}
                          <button
                            onClick={() => handleToggleCheckCircle(q)}
                            className="text-slate-500 hover:text-[#d4af37] transition-colors cursor-pointer"
                          >
                            {cleared ? (
                              <CheckCircle2 className="w-5.5 h-5.5" style={{ color: config.color }} />
                            ) : (
                              <Circle className="w-5.5 h-5.5 hover:scale-105 transition-transform" style={{ color: config.color }} />
                            )}
                          </button>

                          {/* Middle: details */}
                          <div className="flex-1 text-left">
                            <h4
                              className={`font-sans text-xs font-semibold leading-snug ${
                                cleared ? 'text-slate-400 line-through' : 'text-slate-100'
                              }`}
                            >
                              {q.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1 font-mono text-[9px] text-slate-500 uppercase">
                              <span className="font-bold" style={{ color: config.color }}>{config.name}</span>
                              <span>·</span>
                              <span>{baseChanceXp} XP</span>
                              <span>·</span>
                              <span>{q.difficulty}</span>
                              {cleared && (
                                <>
                                  <span>·</span>
                                  <span className="text-[#d4af37]/80 font-bold lowercase">
                                    ◆ cleared
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Right: delete action */}
                          <button
                            onClick={() => handleDeleteQuest(q.id)}
                            className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Abandon Quest"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* "+ ADD A QUEST" dotted button */}
              <button
                onClick={() => setIsAddQuestOpen(true)}
                className="w-full border-2 border-dashed border-white/10 hover:border-[#d4af37]/40 text-slate-400 hover:text-[#d4af37] py-3 rounded-lg flex items-center justify-center gap-2 mt-6 cursor-pointer font-mono text-[10px] uppercase tracking-wider transition-all select-none hover:bg-[#d4af37]/5"
              >
                <Plus className="w-4 h-4" />
                <span>Add a Quest</span>
              </button>
            </div>

            {/* BALANCE CARD (Radar Chart and effort progress bars) */}
            <div id="balance-panel" className="bg-[#15152a] border border-[#d4af37]/20 rounded-lg p-6 shadow-[0_0_15px_rgba(212,175,55,0.05)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-3">
                <div>
                  <h3 className="font-serif text-sm tracking-widest text-[#d4af37] uppercase">
                    BALANCE
                  </h3>
                  <p className="font-mono text-[10px] text-slate-400 uppercase mt-0.5">
                    Where your effort goes
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex bg-[#1a1a2e] border border-white/5 rounded p-1 font-mono text-[9px]">
                  {(['7', '30', 'all'] as const).map((t) => {
                    const isActive = timeframe === t;
                    const label = t === '7' ? '7 DAYS' : t === '30' ? '30 DAYS' : 'ALL TIME';
                    return (
                      <button
                        key={t}
                        onClick={() => setTimeframe(t)}
                        className={`px-3 py-1 rounded text-center transition-all cursor-pointer uppercase ${
                          isActive
                            ? 'bg-[#d4af37]/15 text-[#d4af37] font-bold shadow-md'
                            : 'text-slate-500 hover:text-slate-400'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Side by side: Radar and Vertical Bars */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center py-2">
                
                {/* Left: Custom SVG Radar Chart */}
                <div className="md:col-span-5 flex justify-center">
                  <RadarChart statEffort={timeframeEffort} />
                </div>

                {/* Right: progress bars for each stat */}
                <div className="md:col-span-7 space-y-4">
                  {(Object.keys(STATS) as StatType[]).map((s) => {
                    const config = STATS[s];
                    const val = timeframeEffort[s];
                    return (
                      <div key={s} className="space-y-1.5 text-left">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-slate-300 font-medium capitalize">{config.name}</span>
                          <span className="text-slate-400">
                            <span className="text-slate-100 font-bold">{val.xp} XP</span> · <span className={`${config.textClass} font-bold`}>{val.percentage}%</span>
                          </span>
                        </div>
                        {/* Static Horizontal progress bar */}
                        <div className="w-full bg-[#1a1a2e] h-2 rounded overflow-hidden border border-white/5 shadow-inner">
                          <div
                            className="h-full rounded-r-sm transition-all duration-500"
                            style={{
                              width: `${val.percentage}%`,
                              backgroundColor: config.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>

              {/* Bottom Caption interpretation reading */}
              <div className="border-t border-white/5 pt-4 mt-6 text-center font-serif text-xs italic text-slate-400 leading-relaxed max-w-xl mx-auto">
                {generateBalanceCaption()}
              </div>
            </div>

            {/* CHRONICLE PANEL */}
            <Chronicle ledger={ledger} todayStr={currentMockDate} />

          </div>
        </div>
      </main>

      {/* FOOTER CODA */}
      <footer className="mt-16 text-center border-t border-white/5 pt-6 font-mono text-[9px] text-slate-600 uppercase select-none">
        <p>Every shaded day holds the memory of your discipline.</p>
        <p className="mt-1 text-[8px] text-slate-700">Habit Quest © 2026 · Local-First RPG Ledger System</p>
      </footer>

      {/* ADD QUEST OVERLAY MODAL */}
      <AddQuestModal
        isOpen={isAddQuestOpen}
        onClose={() => setIsAddQuestOpen(false)}
        onAdd={handleAddQuest}
        userClass={userClass}
      />

      {/* EDIT CHARACTER OVERLAY MODAL */}
      {isEditingCharacter && (
        <div className="fixed inset-0 bg-[#050510]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* MAIN CARD */}
          <div className="w-full max-w-xl bg-[#15152a] border border-[#d4af37]/20 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.08)] animate-fade-in">
            <form onSubmit={handleSaveCharacter} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="font-serif text-lg font-bold text-[#d4af37] uppercase tracking-widest">
                  EDIT YOUR CHARACTER
                </h2>
              </div>

              {/* NAME INPUT */}
              <div>
                <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-bold">
                  NAME
                </label>
                <input
                  type="text"
                  required
                  maxLength={24}
                  placeholder="What should we call you?"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#1a1a2e] border border-white/5 focus:border-[#d4af37]/50 rounded-lg py-3 px-4 text-sm text-[#e0e0e0] placeholder-slate-600 outline-none transition-all font-sans"
                />
              </div>

              {/* CLASS GRID */}
              <div>
                <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-widest mb-3 font-bold">
                  CLASS
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* WARRIOR */}
                  <button
                    type="button"
                    onClick={() => setEditClass('warrior')}
                    className={`p-4 rounded-lg border text-left transition-all cursor-pointer bg-[#101020]/60 ${
                      editClass === 'warrior'
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                        : 'border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300'
                    }`}
                  >
                    <span className="font-mono text-xs font-semibold tracking-widest uppercase block mb-0.5">
                      WARRIOR
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block leading-relaxed">
                      Bonus XP on Body quests
                    </span>
                  </button>

                  {/* SCHOLAR */}
                  <button
                    type="button"
                    onClick={() => setEditClass('scholar')}
                    className={`p-4 rounded-lg border text-left transition-all cursor-pointer bg-[#101020]/60 ${
                      editClass === 'scholar'
                        ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                        : 'border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300'
                    }`}
                  >
                    <span className="font-mono text-xs font-semibold tracking-widest uppercase block mb-0.5">
                      SCHOLAR
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block leading-relaxed">
                      Bonus XP on Mind quests
                    </span>
                  </button>

                  {/* MONK */}
                  <button
                    type="button"
                    onClick={() => setEditClass('monk')}
                    className={`p-4 rounded-lg border text-left transition-all cursor-pointer bg-[#101020]/60 ${
                      editClass === 'monk'
                        ? 'border-purple-500/50 bg-purple-500/10 text-purple-400'
                        : 'border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300'
                    }`}
                  >
                    <span className="font-mono text-xs font-semibold tracking-widest uppercase block mb-0.5">
                      MONK
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block leading-relaxed">
                      Bonus XP on Spirit quests
                    </span>
                  </button>

                  {/* GUILDMASTER */}
                  <button
                    type="button"
                    onClick={() => setEditClass('guildmaster')}
                    className={`p-4 rounded-lg border text-left transition-all cursor-pointer bg-[#101020]/60 ${
                      editClass === 'guildmaster'
                        ? 'border-orange-500/50 bg-orange-500/10 text-orange-400'
                        : 'border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300'
                    }`}
                  >
                    <span className="font-mono text-xs font-semibold tracking-widest uppercase block mb-0.5">
                      GUILDMASTER
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block leading-relaxed">
                      Bonus XP on Career quests
                    </span>
                  </button>

                  {/* BARD */}
                  <button
                    type="button"
                    onClick={() => setEditClass('bard')}
                    className={`sm:col-span-2 p-4 rounded-lg border transition-all cursor-pointer bg-[#101020]/60 text-center ${
                      editClass === 'bard'
                        ? 'border-pink-500/50 bg-pink-500/10 text-pink-400'
                        : 'border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300'
                    }`}
                  >
                    <span className="font-mono text-xs font-semibold tracking-widest uppercase block mb-0.5">
                      BARD
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block leading-relaxed">
                      Bonus XP on Hobby quests
                    </span>
                  </button>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingCharacter(false)}
                  className="flex-1 border border-white/5 text-slate-400 font-mono text-[10px] uppercase tracking-wider py-2.5 rounded-md hover:bg-[#1a1a2e] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[#aa7c11] to-[#d4af37] hover:from-[#d4af37] hover:to-[#f3e5ab] text-[#050510] font-sans font-bold text-xs uppercase tracking-widest py-2.5 rounded-md shadow-lg transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEVELOPER SANCTUM DIAGNOSTICS & CONTROL PANEL */}
      <DiagnosticsPanel
        currentMockDate={currentMockDate}
        onSetMockDate={(d) => setCurrentMockDate(d)}
        onResetToMockup={loadMockupState}
        onAddFreeXp={handleAddFreeXp}
        onAdvanceDay={handleAdvanceDay}
        onAdvanceWeek={handleAdvanceWeek}
      />

    </div>
  );
}
