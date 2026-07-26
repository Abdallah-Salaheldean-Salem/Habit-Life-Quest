/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion } from 'motion/react';
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
  Wrench,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Info,
  RefreshCw,
  Clock,
  History,
  CloudLightning,
  AlertCircle,
  Cloud,
  Check,
  Sun,
  Moon,
  Download,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

import { Quest, LedgerEntry, UserClass, StatType, STATS, CLASSES, SaveState, FrictionItem, Debuff, TriggerEvent, TraitGoal, TraitId, TraitCheckin } from './types';
import Sigil from './components/Sigil';
import RadarChart from './components/RadarChart';
import Chronicle from './components/Chronicle';
import TaskSkillTree from './components/TaskSkillTree';
import DiagnosticsPanel from './components/DiagnosticsPanel';
import DebuffPanel from './components/DebuffPanel';
import TraitPanel from './components/TraitPanel';
import { ACHIEVEMENTS } from './utils/achievements';

// Split out of the initial bundle — a modal and a one-off overlay that only
// mount on demand, so their code (and confetti) loads when first needed.
const AddQuestModal = lazy(() => import('./components/AddQuestModal'));
const MasteryCelebration = lazy(() => import('./components/MasteryCelebration'));

// Real-world Supabase Sync client and service
import { supabase } from './utils/supabase';
import { requestOtp, verifyOtp, pullSave, pushSave, mergeSaves, SaveStateData } from './utils/syncService';
import { migrate } from './utils/migrate';
import { uid } from './utils/id';
import { buildLocalSave, buildCloudSave } from './utils/saveState';

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
  getMockSaveData,
  getUnlockProgress,
  getAutomaticity,
  getAutomaticityState
} from './utils/logic';

const SAVE_KEY = 'habitquest:save:v1';

// Minimum (never-zero) completions earn a fraction of the full XP.
const MIN_XP_FACTOR = 0.4;
// A one-time environment change (friction item) is worth a flat XP reward.
const FRICTION_XP = 25;

// Inline input for adding a friction item to a quest.
function FrictionAddRow({ onAdd }: { onAdd: (text: string, kind: 'reduce' | 'add') => void }) {
  const [text, setText] = useState('');
  const [kind, setKind] = useState<'reduce' | 'add'>('reduce');
  const submit = () => {
    if (!text.trim()) return;
    onAdd(text, kind);
    setText('');
  };
  return (
    <div className="flex items-center gap-1.5 pt-1">
      <button
        type="button"
        onClick={() => setKind(kind === 'reduce' ? 'add' : 'reduce')}
        className={`font-mono text-[8px] uppercase tracking-wider px-1.5 py-1 rounded border shrink-0 cursor-pointer ${
          kind === 'reduce'
            ? 'text-emerald-400 border-emerald-500/30'
            : 'text-rose-400 border-rose-500/30'
        }`}
        title="Reduce friction makes the good habit easier; add friction makes a bad one harder"
      >
        {kind}
      </button>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="one change to your surroundings…"
        className="flex-1 min-w-0 bg-[#050510]/60 border border-white/5 focus:border-[#d4af37]/40 rounded px-2 py-1 text-[11px] text-slate-200 placeholder-slate-600 outline-none"
      />
      <button
        type="button"
        onClick={submit}
        className="text-slate-500 hover:text-[#d4af37] cursor-pointer shrink-0"
        title="Add"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function App() {
  // ---------------------------------------------------------
  // CORE STATE
  // ---------------------------------------------------------
  const [userName, setUserName] = useState<string>('Abdallah');
  const [userClass, setUserClass] = useState<UserClass>('scholar');
  const [quests, setQuests] = useState<Quest[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [frictionItems, setFrictionItems] = useState<FrictionItem[]>([]);
  const [expandedFriction, setExpandedFriction] = useState<Set<string>>(new Set());
  const [debuffs, setDebuffs] = useState<Debuff[]>([]);
  const [triggerEvents, setTriggerEvents] = useState<TriggerEvent[]>([]);
  const [traitGoals, setTraitGoals] = useState<TraitGoal[]>([]);
  // Soft-delete tombstones so a sync can't resurrect a record deleted here.
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  // Real users track the real date; the demo mockup keeps its frozen clock.
  const [liveClock, setLiveClock] = useState<boolean>(false);
  // The debuff module's data is the most sensitive in the app — kept on this
  // device by default, and only synced if the user turns it on.
  const [debuffLocalOnly, setDebuffLocalOnly] = useState<boolean>(true);
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
  const [showLandingOtpField, setShowLandingOtpField] = useState(false);
  const [creationOtp, setCreationOtp] = useState('');
  
  // UI states
  const [questViewMode, setQuestViewMode] = useState<'list' | 'tree'>('tree');
  const [questFilter, setQuestFilter] = useState<'all' | StatType>('all');
  const [isAddQuestOpen, setIsAddQuestOpen] = useState(false);
  const [isEditingCharacter, setIsEditingCharacter] = useState(false);
  const [editName, setEditName] = useState('Abdallah');
  const [editClass, setEditClass] = useState<UserClass>('scholar');
  const [hoveredAchievement, setHoveredAchievement] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // Full-screen celebration shown when a quest crosses into "mastered".
  const [mastery, setMastery] = useState<{ title: string; subtitle: string } | null>(null);

  // Cloud Sync Real State
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [syncEmail, setSyncEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showHeaderOtpField, setShowHeaderOtpField] = useState(false);
  const [headerOtp, setHeaderOtp] = useState('');

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      showToast('App installation is only available on supported browsers or if not already installed.');
      return;
    }
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  const handleExportData = () => {
    const data: SaveState = {
      version: 1,
      userName,
      userClass,
      quests,
      ledger,
      createdAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habitquest-save-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Save data exported successfully!');
  };

  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('habitquest:theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('habitquest:theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [theme]);


  // Helper to pull remote save state, merge with local state, and push back
  const handleInitialMerge = async (userId: string, email: string) => {
    setIsSyncing(true);
    setIsSyncingLanding(true);
    try {
      const res = await pullSave(userId);
      if (res.success && res.saveState) {
        let localState: SaveStateData = buildCloudSave({
          userName, userClass, quests, ledger, frictionItems, debuffs, triggerEvents,
          traitGoals, deletedIds, liveClock, debuffLocalOnly, currentMockDate, hasCreatedCharacter: true,
        });
        
        const saved = localStorage.getItem(SAVE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const migrated = migrate(parsed);
            localState = buildCloudSave({
              userName: migrated.userName,
              userClass: migrated.userClass,
              quests: migrated.quests,
              ledger: migrated.ledger,
              frictionItems: migrated.frictionItems || [],
              debuffs: migrated.debuffs || [],
              triggerEvents: migrated.triggerEvents || [],
              traitGoals: migrated.traitGoals || [],
              deletedIds: migrated.deletedIds || [],
              liveClock: migrated.liveClock ?? Boolean(migrated.hasCreatedCharacter),
              debuffLocalOnly,
              currentMockDate: migrated.currentMockDate,
              hasCreatedCharacter: true,
            });
          } catch (e) {
            console.error('Error parsing local storage before merge:', e);
          }
        }
        
        const merged = mergeSaves(localState, res.saveState);
        
        // Update local React states
        setUserName(merged.userName);
        setUserClass(merged.userClass as UserClass);
        setQuests(merged.quests);
        setLedger(merged.ledger);
        setFrictionItems(merged.frictionItems || []);
        setTraitGoals(merged.traitGoals || []);
        setDeletedIds(merged.deletedIds || []);
        const mergedLive = merged.liveClock ?? Boolean(merged.hasCreatedCharacter);
        setLiveClock(mergedLive);
        if (!debuffLocalOnly) {
          setDebuffs(merged.debuffs || []);
          setTriggerEvents(merged.triggerEvents || []);
        }
        if (mergedLive) {
          setCurrentMockDate(toDateStr(new Date()));
        } else if (merged.currentMockDate) {
          setCurrentMockDate(merged.currentMockDate);
        }
        setHasCreatedCharacter(true);
        setSyncEmail(email);
        
        // Push merged state back to Supabase
        await pushSave(userId, email, merged);
        showToast('Save merged with cloud storage!');
      } else if (res.success) {
        // No remote save exists, push current local state to cloud
        let localState: SaveStateData = buildCloudSave({
          userName, userClass, quests, ledger, frictionItems, debuffs, triggerEvents,
          traitGoals, deletedIds, liveClock, debuffLocalOnly, currentMockDate, hasCreatedCharacter: true,
        });
        
        const saved = localStorage.getItem(SAVE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const migrated = migrate(parsed);
            localState = buildCloudSave({
              userName: migrated.userName,
              userClass: migrated.userClass,
              quests: migrated.quests,
              ledger: migrated.ledger,
              frictionItems: migrated.frictionItems || [],
              debuffs: migrated.debuffs || [],
              triggerEvents: migrated.triggerEvents || [],
              traitGoals: migrated.traitGoals || [],
              deletedIds: migrated.deletedIds || [],
              liveClock: migrated.liveClock ?? Boolean(migrated.hasCreatedCharacter),
              debuffLocalOnly,
              currentMockDate: migrated.currentMockDate,
              hasCreatedCharacter: true,
            });
          } catch (e) {
            console.error('Error parsing local storage before push:', e);
          }
        }
        
        await pushSave(userId, email, localState);
        setSyncEmail(email);
        showToast('Initial backup complete. Live sync active!');
      } else {
        showToast(`Sync warning: ${res.error || 'could not fetch cloud save'}`);
      }
    } catch (err) {
      console.error('Merge error:', err);
    } finally {
      setIsSyncing(false);
      setIsSyncingLanding(false);
    }
  };

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
        setFrictionItems(migrated.frictionItems || []);
        setDebuffs(migrated.debuffs || []);
        setTriggerEvents(migrated.triggerEvents || []);
        setTraitGoals(migrated.traitGoals || []);
        setDeletedIds(migrated.deletedIds || []);
        const isLive = migrated.liveClock ?? Boolean(migrated.hasCreatedCharacter);
        setLiveClock(isLive);
        if (migrated.debuffLocalOnly !== undefined) setDebuffLocalOnly(migrated.debuffLocalOnly);
        // A live-clock user's "today" is the real today, not the stored date.
        if (isLive) {
          setCurrentMockDate(toDateStr(new Date()));
        } else if (migrated.currentMockDate) {
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

  // Listen to Supabase auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSyncEmail(session.user?.email || null);
        handleInitialMerge(session.user?.id, session.user?.email || '');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSyncEmail(session.user?.email || null);
      } else {
        setSyncEmail(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Save changes to localStorage whenever core state updates
  useEffect(() => {
    if (quests.length > 0 || ledger.length > 0) {
      const stateToSave = buildLocalSave({
        userName, userClass, quests, ledger, frictionItems, debuffs, triggerEvents,
        traitGoals, deletedIds, liveClock, debuffLocalOnly, currentMockDate, hasCreatedCharacter, syncEmail,
      });
      localStorage.setItem(SAVE_KEY, JSON.stringify(stateToSave));
    }
  }, [userName, userClass, quests, ledger, frictionItems, debuffs, triggerEvents, traitGoals, deletedIds, liveClock, debuffLocalOnly, currentMockDate, hasCreatedCharacter, syncEmail]);

  // Automatic background push to Supabase on state change (if signed in).
  // Debounced: a burst of edits (toggling several quests, typing) collapses
  // into a single trailing write instead of one full-blob upsert per change.
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const triggerPush = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const stateToSave = buildCloudSave({
          userName, userClass, quests, ledger, frictionItems, debuffs, triggerEvents,
          traitGoals, deletedIds, liveClock, debuffLocalOnly, currentMockDate, hasCreatedCharacter,
        });
        await pushSave(session.user.id, session.user.email || '', stateToSave);
      }
    };

    if (quests.length > 0 || ledger.length > 0) {
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(triggerPush, 1200);
    }
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [userName, userClass, quests, ledger, frictionItems, debuffs, triggerEvents, traitGoals, deletedIds, liveClock, debuffLocalOnly, currentMockDate, hasCreatedCharacter]);


  const handleHardReset = () => {
    localStorage.removeItem(SAVE_KEY);
    setUserName('');
    setUserClass('scholar');
    setQuests([]);
    setLedger([]);
    setFrictionItems([]);
    setDebuffs([]);
    setTriggerEvents([]);
    setHasCreatedCharacter(false);
    setTraitGoals([]);
    setDeletedIds([]);
    setLiveClock(false);
    setCurrentMockDate(toDateStr(new Date()));
    showToast('Save Data Wiped. Beginning anew.');
  };

  const loadMockupState = () => {
    const mock = getMockSaveData('2026-07-18');
    setUserName(mock.userName);
    setUserClass(mock.userClass);
    setQuests(mock.quests);
    setLedger(mock.ledger);
    setFrictionItems(mock.frictionItems || []);
    setDebuffs([]);
    setTriggerEvents([]);
    setTraitGoals([]);
    setDeletedIds([]);
    // The demo's seeded history is anchored to a fixed date — freeze the clock.
    setLiveClock(false);
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
  const totalCleared = ledger.filter((e) => e.kind !== 'friction' && e.kind !== 'debuff' && e.kind !== 'trait').length;

  // App-wide active day streak (consecutive days with completions)
  const ledgerDates = ledger.map((e) => e.date);
  const appWideStreak = getAppWideStreak(ledgerDates, currentMockDate);

  // 7-day trend calculations
  const xpLast7Days = ledger
    .filter(e => e.date >= getDaysAgoStr(currentMockDate, 6) && e.date <= currentMockDate)
    .reduce((sum, e) => sum + e.xp, 0);
  
  const xpPrev7Days = ledger
    .filter(e => e.date < getDaysAgoStr(currentMockDate, 6) && e.date >= getDaysAgoStr(currentMockDate, 13))
    .reduce((sum, e) => sum + e.xp, 0);
  
  const xpTrend = xpLast7Days - xpPrev7Days;

  // Streak trend
  const streak7DaysAgo = getAppWideStreak(ledgerDates, getDaysAgoStr(currentMockDate, 7));
  const streakTrend = appWideStreak - streak7DaysAgo;

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

  // Dual ring for a quest's completion control: streak (inner, stat colour)
  // toward the 30-day checkpoint + automaticity (outer, gold) toward 100.
  const renderAutomaticityRings = (q: Quest) => {
    const auto = getAutomaticity(q, ledger, currentMockDate);
    const streak = getQuestStreak(q);
    const config = STATS[q.stat];
    const cOuter = 2 * Math.PI * 20;
    const cInner = 2 * Math.PI * 15;
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 44 44">
        <g transform="rotate(-90 22 22)">
          <circle cx="22" cy="22" r="20" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2.5" />
          <circle cx="22" cy="22" r="20" fill="none" stroke="#d4af37" strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={cOuter} strokeDashoffset={cOuter * (1 - Math.min(auto, 100) / 100)} />
          <circle cx="22" cy="22" r="15" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2.5" />
          <circle cx="22" cy="22" r="15" fill="none" stroke={config.color} strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={cInner} strokeDashoffset={cInner * (1 - Math.min(streak / 30, 1))} />
        </g>
      </svg>
    );
  };

  // State pill: Forming (<40) → Sticking (40–79) → Automatic (80+).
  const renderAutoState = (q: Quest) => {
    if (q.type === 'milestone') return null;
    const auto = getAutomaticity(q, ledger, currentMockDate);
    const state = getAutomaticityState(auto);
    const label = state === 'automatic' ? 'Automatic' : state === 'sticking' ? 'Sticking' : 'Forming';
    const cls =
      state === 'automatic'
        ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
        : state === 'sticking'
        ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
        : 'text-slate-500 border-white/10';
    return (
      <span className={`px-1.5 py-[1px] rounded-full border font-bold normal-case ${cls}`} title="Automaticity — how ingrained the habit is (0–100)">
        {label} · {auto}
      </span>
    );
  };

  // ---------------------------------------------------------
  // FRICTION LEDGER — per-quest environment changes.
  // ---------------------------------------------------------
  const addFriction = (questId: string, text: string, kind: 'reduce' | 'add' = 'reduce') => {
    const t = text.trim();
    if (!t) return;
    const item: FrictionItem = {
      id: uid('fr'),
      questId,
      text: t,
      done: false,
      kind,
    };
    setFrictionItems([...frictionItems, item]);
  };

  const toggleFriction = (item: FrictionItem) => {
    const nowDone = !item.done;
    setFrictionItems(frictionItems.map((f) => (f.id === item.id ? { ...f, done: nowDone } : f)));
    const xpId = `friction_${item.id}`;
    if (nowDone) {
      const quest = quests.find((q) => q.id === item.questId);
      const entry: LedgerEntry = {
        id: xpId,
        date: currentMockDate,
        questId: xpId,
        questTitle: `Friction: ${item.text}`,
        xp: FRICTION_XP,
        stat: quest?.stat ?? 'body',
        difficulty: 'easy',
        type: 'milestone',
        kind: 'friction',
      };
      setLedger([...ledger.filter((e) => e.id !== xpId), entry]);
      showToast(`Environment changed — +${FRICTION_XP} XP. A change beats a day of resisting.`);
    } else {
      setLedger(ledger.filter((e) => e.id !== xpId));
    }
  };

  const deleteFriction = (id: string) => {
    setFrictionItems(frictionItems.filter((f) => f.id !== id));
    setLedger(ledger.filter((e) => e.id !== `friction_${id}`));
    setDeletedIds((prev) => [...prev, id, `friction_${id}`]);
  };

  const toggleFrictionExpand = (questId: string) => {
    setExpandedFriction((prev) => {
      const next = new Set(prev);
      if (next.has(questId)) next.delete(questId);
      else next.add(questId);
      return next;
    });
  };

  // ---------------------------------------------------------
  // DEBUFF ENGINE — behaviors to remove.
  // ---------------------------------------------------------
  const grantDebuffXp = (amount: number, note: string) => {
    const entry: LedgerEntry = {
      id: uid('debuff'),
      date: currentMockDate,
      questId: 'debuff_xp',
      questTitle: note,
      xp: amount,
      stat: 'spirit',
      difficulty: 'normal',
      type: 'milestone',
      kind: 'debuff',
    };
    setLedger((l) => [...l, entry]);
  };

  const handleAddDebuff = (name: string, lapsePlan: string, needsMedical: boolean) => {
    const d: Debuff = {
      id: uid('db'),
      name,
      stage: 'mapping',
      cueRemovals: [],
      mode: 'abstinence',
      cleanSince: currentMockDate,
      totalCleanDays: 0,
      lapsePlan,
      needsMedicalNotice: needsMedical,
      createdAt: currentMockDate,
    };
    setDebuffs((prev) => [...prev, d]);
    showToast(`Mapping "${name}" — log triggers for two weeks.`);
  };

  const handleUpdateDebuff = (id: string, patch: Partial<Debuff>) => {
    setDebuffs((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const handleDeleteDebuff = (id: string) => {
    const orphanedTriggers = triggerEvents.filter((t) => t.debuffId === id).map((t) => t.id);
    setDebuffs((prev) => prev.filter((d) => d.id !== id));
    setTriggerEvents((prev) => prev.filter((t) => t.debuffId !== id));
    setDeletedIds((prev) => [...prev, id, ...orphanedTriggers]);
  };

  const handleAddTrigger = (t: Omit<TriggerEvent, 'id'>) => {
    const ev: TriggerEvent = { ...t, id: uid('te') };
    setTriggerEvents((prev) => [...prev, ev]);
  };

  // ---------------------------------------------------------
  // TRAIT ENGINE — the slow, deliberate reshaping of personality.
  // ---------------------------------------------------------
  const grantTraitXp = (amount: number, note: string) => {
    const entry: LedgerEntry = {
      id: uid('trait'),
      date: currentMockDate,
      questId: 'trait_xp',
      questTitle: note,
      xp: amount,
      stat: 'mind',
      difficulty: 'normal',
      type: 'milestone',
      kind: 'trait',
    };
    setLedger((l) => [...l, entry]);
  };

  const handleAddTraitGoal = (trait: TraitId, facet: string, role: string, questIds: string[]) => {
    const g: TraitGoal = {
      id: uid('tg'),
      trait,
      facet,
      role,
      questIds,
      checkins: [],
      createdAt: currentMockDate,
    };
    setTraitGoals((prev) => [...prev, g]);
    grantTraitXp(25, `Trait goal: ${facet}`);
    showToast(`Forging ${facet}. Rehearse it — the first check-in is six weeks out.`);
  };

  const handleUpdateTraitGoal = (id: string, patch: Partial<TraitGoal>) => {
    setTraitGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const handleDeleteTraitGoal = (id: string) => {
    setTraitGoals((prev) => prev.filter((g) => g.id !== id));
    setDeletedIds((prev) => [...prev, id]);
  };

  const handleAddTraitCheckin = (goalId: string, score: 1 | 2 | 3 | 4 | 5) => {
    const c: TraitCheckin = { id: uid('tc'), at: currentMockDate, score };
    setTraitGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, checkins: [...g.checkins, c] } : g)));
    grantTraitXp(40, 'Six-week trait check-in');
    showToast('Check-in logged. Slow change is still change. +40 XP.');
  };

  const renderFrictionSection = (q: Quest) => {
    const items = frictionItems.filter((f) => f.questId === q.id);
    const doneCount = items.filter((f) => f.done).length;
    const isOpen = expandedFriction.has(q.id);
    return (
      <div className="mt-1.5">
        <button
          type="button"
          onClick={() => toggleFrictionExpand(q.id)}
          className="font-mono text-[8px] uppercase tracking-wider text-slate-500 hover:text-[#d4af37] flex items-center gap-1 cursor-pointer transition-colors"
        >
          <Wrench className="w-2.5 h-2.5" /> Environment{items.length ? ` · ${doneCount}/${items.length}` : ''}
          {isOpen ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
        </button>
        {isOpen && (
          <div className="mt-1.5 space-y-1.5 border-l border-white/10 pl-2.5">
            {items.length === 0 && (
              <p className="font-mono text-[9px] text-slate-600 leading-snug">
                What one change to your surroundings makes this easier?
              </p>
            )}
            {items.map((f) => (
              <div key={f.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleFriction(f)}
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 cursor-pointer ${
                    f.done ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400' : 'border-white/20 text-transparent'
                  }`}
                >
                  <Check className="w-2.5 h-2.5" />
                </button>
                <span className={`text-[11px] flex-1 min-w-0 break-words ${f.done ? 'line-through text-slate-500' : 'text-slate-300'}`}>{f.text}</span>
                <span
                  className={`font-mono text-[7px] uppercase px-1 rounded border shrink-0 ${
                    f.kind === 'reduce' ? 'text-emerald-400/70 border-emerald-500/20' : 'text-rose-400/70 border-rose-500/20'
                  }`}
                >
                  {f.kind}
                </span>
                <button
                  type="button"
                  onClick={() => deleteFriction(f.id)}
                  className="text-slate-600 hover:text-rose-400 cursor-pointer shrink-0"
                  title="Remove"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <FrictionAddRow onAdd={(text, kind) => addFriction(q.id, text, kind)} />
          </div>
        )}
      </div>
    );
  };

  // Shows the quest's implementation intention (cue · location) when set.
  const renderIntention = (q: Quest) => {
    if (!q.intention?.cue) return null;
    return (
      <p className="font-mono text-[9px] text-slate-500 mt-1 flex items-start gap-1 lowercase leading-snug">
        <span className="text-[#d4af37]/70 not-italic">⟳</span>
        <span>
          {q.intention.cue}
          {q.intention.location ? ` · ${q.intention.location}` : ''}
        </span>
      </p>
    );
  };

  // Renders a quest's progress toward "unlocking" (30 consistent days / 4 weeks
  // / one milestone completion). Once unlocked, shows a Mastered badge instead.
  const renderUnlockBar = (q: Quest) => {
    const p = getUnlockProgress(q, ledger, currentMockDate);
    const config = STATS[q.stat];

    if (p.unlocked) {
      return (
        <div className="flex items-center gap-1 mt-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#d4af37]">
          <Sparkles className="w-2.5 h-2.5" />
          <span>Unlocked · Mastered</span>
        </div>
      );
    }

    return (
      <div className="mt-1.5">
        <div className="flex justify-between items-center font-mono text-[8px] text-slate-500 uppercase tracking-wider mb-0.5">
          <span>Unlock progress</span>
          <span>
            {p.current}/{p.target} {p.unit}
          </span>
        </div>
        <div className="w-full bg-[#0c0c1b] h-1 rounded overflow-hidden border border-white/5">
          <motion.div
            className="h-full rounded-r-sm"
            initial={{ width: 0 }}
            animate={{ width: `${p.percent}%` }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.8 }}
            style={{ backgroundColor: config.color }}
          />
        </div>
      </div>
    );
  };

  // Fires the mastery celebration only when a new completion pushes a quest
  // across its unlock threshold (was not unlocked before, is now).
  const maybeCelebrateMastery = (q: Quest, newEntry: LedgerEntry) => {
    const before = getUnlockProgress(q, ledger, currentMockDate).unlocked;
    const after = getUnlockProgress(q, [...ledger, newEntry], currentMockDate).unlocked;
    if (!before && after) {
      const subtitle =
        q.type === 'weekly'
          ? 'Mastered — four weeks on target.'
          : q.type === 'milestone'
          ? 'Milestone conquered.'
          : 'Mastered — thirty days of consistency.';
      setMastery({ title: q.title, subtitle });
    }
  };

  // "Max 3 active nodes" guardrail: a recurring quest only stops counting once
  // it's Automatic (80+). Milestones are one-off and don't count.
  const habitQuests = quests.filter((q) => q.active && q.type !== 'milestone');
  const automaticCount = habitQuests.filter(
    (q) => getAutomaticity(q, ledger, currentMockDate) >= 80,
  ).length;
  const buildingCount = habitQuests.length - automaticCount;

  // Titles of quests already on the board, and of those already mastered —
  // drives the skill tree's progressive reveal (a tier unlocks once a node
  // from the tier before it is mastered).
  const activeTitles = new Set(quests.filter((q) => q.active).map((q) => q.title));
  const masteredTitles = new Set(
    quests.filter((q) => getUnlockProgress(q, ledger, currentMockDate).unlocked).map((q) => q.title),
  );

  // Check achievements unlocks
  const unlockedAchievementsCount = ACHIEVEMENTS.reduce((count, ach) => {
    const isUnlocked = ach.check({
      ledger,
      quests,
      level: levelProgress.level,
      statRanks,
      getQuestStreak,
      frictionItems,
      debuffs,
      triggerEvents,
      traitGoals,
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
          id: uid('log'),
          date: currentMockDate,
          questId: q.id,
          questTitle: q.title,
          xp,
          stat: q.stat,
          difficulty: q.difficulty,
          type: q.type,
          kind: 'full',
        };
        setLedger([...ledger, newEntry]);
        maybeCelebrateMastery(q, newEntry);
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
          id: uid('log'),
          date: currentMockDate,
          questId: q.id,
          questTitle: q.title,
          xp,
          stat: q.stat,
          difficulty: q.difficulty,
          type: q.type,
          kind: 'full',
        };
        setLedger([...ledger, newEntry]);
        maybeCelebrateMastery(q, newEntry);
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
          id: uid('log'),
          date: currentMockDate,
          questId: q.id,
          questTitle: q.title,
          xp,
          stat: q.stat,
          difficulty: q.difficulty,
          type: q.type,
          kind: 'full',
        };
        setLedger([...ledger, newEntry]);
        maybeCelebrateMastery(q, newEntry);
        showToast(`Milestone Complete! Earned +${xp} XP!`);
      }
    }
  };

  // Never-zero: log the quest's minimum version instead of missing. Earns
  // reduced XP but preserves the streak, and is recorded distinctly.
  const handleLogMinimum = (q: Quest) => {
    if (q.type === 'milestone') return;
    if (isLoggedToday(q.id)) {
      showToast(`"${q.title}" is already logged today.`);
      return;
    }
    const fullXp = calculateQuestXp(q.difficulty, q.type, q.stat, userClass);
    const xp = Math.max(1, Math.round(fullXp * MIN_XP_FACTOR));
    const newEntry: LedgerEntry = {
      id: uid('log'),
      date: currentMockDate,
      questId: q.id,
      questTitle: q.title,
      xp,
      stat: q.stat,
      difficulty: q.difficulty,
      type: q.type,
      kind: 'minimum',
    };
    setLedger([...ledger, newEntry]);
    maybeCelebrateMastery(q, newEntry);
    const min = q.intention?.minVersion;
    showToast(min ? `Never zero — did the minimum: ${min}. +${xp} XP, streak kept.` : `Never zero — minimum logged. +${xp} XP, streak kept.`);

    // After two scaled-down days in a row, ask whether the quest is mis-scoped.
    const prev1 = getPreviousDateStr(currentMockDate);
    const prev2 = getPreviousDateStr(prev1);
    const wasMin = (d: string) => ledger.some((e) => e.questId === q.id && e.date === d && e.kind === 'minimum');
    if (wasMin(prev1) && wasMin(prev2)) {
      setTimeout(() => showToast(`That's three minimum days for "${q.title}" — consider making it easier.`), 1700);
    }
  };

  // Add a new quest (skips an exact-title duplicate that's already on the board)
  const handleAddQuest = (questData: Omit<Quest, 'id' | 'createdAt' | 'active'>) => {
    if (quests.some((q) => q.active && q.title === questData.title)) {
      showToast(`"${questData.title}" is already on your board.`);
      return;
    }
    const newQuest: Quest = {
      ...questData,
      id: uid('quest'),
      createdAt: currentMockDate,
      active: true,
    };
    setQuests([...quests, newQuest]);
    showToast(`Drafted new Quest: "${newQuest.title}"`);
  };

  // Load a whole season's three nodes at once (skipping any already active).
  const handleLoadSeason = (
    drafts: Omit<Quest, 'id' | 'createdAt' | 'active'>[],
    label: string,
  ) => {
    const activeTitles = new Set(quests.filter((q) => q.active).map((q) => q.title));
    const toAdd = drafts.filter((d) => !activeTitles.has(d.title));
    if (toAdd.length === 0) {
      showToast(`${label} is already on your board.`);
      return;
    }
    const newQuests: Quest[] = toAdd.map((d) => ({
      ...d,
      id: uid('quest'),
      createdAt: currentMockDate,
      active: true,
    }));
    setQuests([...quests, ...newQuests]);
    showToast(`${label} loaded — ${newQuests.length} quest${newQuests.length > 1 ? 's' : ''} added.`);
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

  // Trigger real Cloud Sync via email link (Requesting OTP / Verifying OTP)
  const handleCloudSync = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailInput.trim();
    if (!email) return;

    setIsSyncing(true);
    try {
      if (!showHeaderOtpField) {
        // Request OTP
        const res = await requestOtp(email);
        if (res.success) {
          setShowHeaderOtpField(true);
          showToast('One-time password sent to your email!');
        } else {
          showToast(`Error: ${res.error || 'Failed to send code'}`);
        }
      } else {
        // Verify OTP
        const otp = headerOtp.trim();
        if (!otp) return;
        const res = await verifyOtp(email, otp);
        if (res.success && res.session) {
          setShowHeaderOtpField(false);
          setIsSyncOpen(false);
          setHeaderOtp('');
          showToast('Verification successful! Sync active.');
          // Merge save data
          await handleInitialMerge(res.session.user.id, email);
        } else {
          showToast(`Error: ${res.error || 'Invalid code'}`);
        }
      }
    } catch (err) {
      console.error(err);
      showToast('An unexpected authentication error occurred.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle character creation submission on landing page
  const handleBeginAdventure = (e: React.FormEvent) => {
    e.preventDefault();
    const name = creationName.trim();
    if (!name) {
      showToast('Your character needs a name.');
      return;
    }
    
    const today = toDateStr(new Date());
    setUserName(name);
    setUserClass(creationClass);
    setHasCreatedCharacter(true);
    // A real character runs on the real calendar, not the demo's frozen date.
    setLiveClock(true);
    setCurrentMockDate(today);
    // Start from a clean slate — the fresh-load path seeds a demo mockup, and a
    // brand-new hero shouldn't inherit that character's quests or history.
    setQuests([]);
    setLedger([]);
    setFrictionItems([]);
    setDebuffs([]);
    setTriggerEvents([]);
    setTraitGoals([]);
    setDeletedIds([]);
    // Persist the clean slate immediately: the length-guarded autosave won't
    // fire on an empty board, so without this the mockup would reload.
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify(
        buildLocalSave({
          userName: name,
          userClass: creationClass,
          quests: [],
          ledger: [],
          frictionItems: [],
          debuffs: [],
          triggerEvents: [],
          traitGoals: [],
          deletedIds: [],
          liveClock: true,
          debuffLocalOnly,
          currentMockDate: today,
          hasCreatedCharacter: true,
          syncEmail,
        }),
      ),
    );
    showToast(`Welcome, ${name} the ${CLASSES[creationClass].name}! Your quest begins.`);
  };

  // Handle cloud sync OTP request & verify on landing page
  const handleSyncLanding = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = creationEmail.trim();
    if (!email) return;

    setIsSyncingLanding(true);
    try {
      if (!showLandingOtpField) {
        // Request OTP
        const res = await requestOtp(email);
        if (res.success) {
          setShowLandingOtpField(true);
          showToast('One-time password sent to your email!');
        } else {
          showToast(`Error: ${res.error || 'Failed to send code'}`);
        }
      } else {
        // Verify OTP
        const otp = creationOtp.trim();
        if (!otp) return;
        const res = await verifyOtp(email, otp);
        if (res.success && res.session) {
          setShowLandingOtpField(false);
          setCreationOtp('');
          showToast('Verification successful! Character synced.');
          // Merge save data and enter dashboard
          await handleInitialMerge(res.session.user.id, email);
          setHasCreatedCharacter(true);
        } else {
          showToast(`Error: ${res.error || 'Invalid code'}`);
        }
      }
    } catch (err) {
      console.error(err);
      showToast('An unexpected authentication error occurred.');
    } finally {
      setIsSyncingLanding(false);
    }
  };

  // ---------------------------------------------------------
  // MOCK SYSTEM UTILITIES (Temporals, Freebies, Resets)
  // ---------------------------------------------------------
  const handleAddFreeXp = (xp: number) => {
    // We add free XP by creating a historical dummy entry on today's date
    const dummyEntry: LedgerEntry = {
      id: uid('free'),
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
  const allActiveQuests = quests.filter((q) => q.active);
  const activeQuests = allActiveQuests.filter(q => questFilter === 'all' || q.stat === questFilter);
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

  // Compact date for small screens so the header never overflows the viewport.
  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', {
      month: 'short',
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
                    {showLandingOtpField 
                      ? "Enter the 6-digit verification code sent to your email to pull your character save."
                      : "Enter your email to request a passwordless code and synchronize your hero logs."}
                  </p>
                </div>

                {!showLandingOtpField ? (
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
                ) : (
                  <div>
                    <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-bold">
                      6-DIGIT CODE
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter 6-digit code"
                      value={creationOtp}
                      onChange={(e) => setCreationOtp(e.target.value)}
                      className="w-full bg-[#1a1a2e] border border-[#d4af37]/40 focus:border-[#d4af37]/50 rounded-lg py-3 px-4 text-sm text-[#e0e0e0] placeholder-slate-600 outline-none transition-all font-mono tracking-widest text-center"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (showLandingOtpField) {
                        setShowLandingOtpField(false);
                        setCreationOtp('');
                      } else {
                        setShowSyncInline(false);
                      }
                    }}
                    className="flex-1 border border-white/5 text-slate-400 font-mono text-[10px] uppercase tracking-wider py-2.5 rounded-md hover:bg-[#1a1a2e] transition-colors cursor-pointer"
                  >
                    {showLandingOtpField ? 'Back to Email' : 'Back to Character Creation'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSyncingLanding}
                    className="flex-1 bg-gradient-to-r from-[#aa7c11] to-[#d4af37] hover:from-[#d4af37] hover:to-[#f3e5ab] text-[#050510] font-sans font-bold text-xs uppercase tracking-widest py-2.5 rounded-md shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isSyncingLanding ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying...
                      </>
                    ) : (
                      showLandingOtpField ? 'Verify Code' : 'Request Code'
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
            onHardReset={handleHardReset}
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

      {/* Mastery celebration overlay */}
      {mastery && (
        <Suspense fallback={null}>
          <MasteryCelebration
            title={mastery.title}
            subtitle={mastery.subtitle}
            onDone={() => setMastery(null)}
          />
        </Suspense>
      )}

      {/* HEADER BAR */}
      <header className="border-b border-[#d4af37]/30 bg-[#15152a]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Habit Quest Logo" className="w-8 h-8 object-contain rounded-md drop-shadow-md glow-active" onError={(e) => {
              // Fallback to the CSS sigil if image is missing
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextElementSibling) {
                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
              }
            }} />
            <div className="w-3.5 h-3.5 bg-gradient-to-r from-[#d4af37] to-[#aa7c11] rounded-sm rotate-45 border border-[#d4af37]/30 shadow-md glow-active hidden" />
            <h1 className="font-serif text-base sm:text-lg font-bold tracking-[0.12em] sm:tracking-[0.25em] text-[#d4af37] uppercase select-none cursor-default whitespace-nowrap">
              HABITQUEST
            </h1>
          </div>

          {/* Controls & Sync */}
          <div className="flex items-center gap-1.5 sm:gap-3.5">
            {/* PWA Install */}
            <button
              onClick={handleInstallApp}
              className="p-1.5 rounded-full border border-white/10 bg-[#1a1a2e]/50 text-[#e0e0e0]/70 hover:border-[#d4af37]/40 hover:text-[#d4af37] transition-all cursor-pointer"
              title="Install App"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded-full border border-white/10 bg-[#1a1a2e]/50 text-[#e0e0e0]/70 hover:border-[#d4af37]/40 hover:text-[#d4af37] transition-all cursor-pointer"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Sync trigger button */}
            <button
              onClick={() => {
                setIsSyncOpen(!isSyncOpen);
                setEmailInput(syncEmail || '');
              }}
              className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full border text-[10px] font-mono uppercase tracking-wider cursor-pointer transition-all shrink-0 ${
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
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          const { data: { session } } = await supabase.auth.getSession();
                          if (session?.user) {
                            await handleInitialMerge(session.user.id, session.user.email || '');
                          }
                        }}
                        disabled={isSyncing}
                        className="flex-1 bg-emerald-600/20 border border-emerald-500/30 hover:border-emerald-400/50 text-emerald-400 font-mono text-[9px] uppercase tracking-wider py-1.5 rounded cursor-pointer transition-all flex items-center justify-center gap-1"
                      >
                        {isSyncing ? (
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        ) : null}
                        <span>Sync Now</span>
                      </button>
                      <button
                        onClick={async () => {
                          const { error } = await supabase.auth.signOut();
                          if (error) {
                            showToast(`Logout error: ${error.message}`);
                          } else {
                            setSyncEmail(null);
                            setShowHeaderOtpField(false);
                            setHeaderOtp('');
                            showToast('Offline mode active. Connection severed.');
                          }
                        }}
                        className="flex-1 bg-[#1a1a2e] border border-white/10 hover:border-rose-500/30 text-rose-400 font-mono text-[9px] uppercase tracking-wider py-1.5 rounded cursor-pointer transition-all"
                      >
                        Sever
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCloudSync} className="space-y-3">
                    {!showHeaderOtpField ? (
                      <>
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
                              <RefreshCw className="w-3 h-3 animate-spin" /> Sending...
                            </>
                          ) : (
                            'Request Passwordless Code'
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        <input
                          type="text"
                          required
                          placeholder="Enter 6-digit code"
                          value={headerOtp}
                          onChange={(e) => setHeaderOtp(e.target.value)}
                          className="w-full bg-[#1a1a2e] border border-[#d4af37]/40 rounded py-1.5 px-2.5 text-xs text-slate-200 outline-none tracking-widest text-center font-mono"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowHeaderOtpField(false);
                              setHeaderOtp('');
                            }}
                            className="flex-1 bg-[#1a1a2e] border border-white/10 hover:border-white/20 text-slate-400 font-mono text-[9px] py-1.5 rounded cursor-pointer"
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            disabled={isSyncing}
                            className="flex-1 bg-[#d4af37] hover:bg-[#f3e5ab] text-[#050510] font-mono text-[9px] font-bold uppercase py-1.5 rounded cursor-pointer flex items-center justify-center gap-1"
                          >
                            {isSyncing ? (
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            ) : null}
                            <span>Verify</span>
                          </button>
                        </div>
                      </>
                    )}
                  </form>
                )}
              </div>
            )}

            {/* Current Date Display */}
            <div
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 border border-white/5 bg-[#1a1a2e] rounded-md font-mono text-[10px] text-[#e0e0e0] cursor-default select-none uppercase tracking-wider shrink-0"
              title={formatDateLabel(currentMockDate)}
            >
              <Calendar className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
              <span className="hidden sm:inline">{formatDateLabel(currentMockDate)}</span>
              <span className="sm:hidden whitespace-nowrap">{formatShortDate(currentMockDate)}</span>
            </div>

          </div>
        </div>
      </header>

      {/* CORE LAYOUT */}
      <main className="max-w-7xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* =========================================================
              LEFT COLUMN (CHARACTER, LEDGER, ACHIEVEMENTS)
              order-2 on phones so it drops below the quest board.
              ========================================================= */}
          <div className="order-2 lg:order-1 lg:col-span-4 space-y-6">
            
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
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#aa7c11] to-[#d4af37] rounded-r-sm shadow-[0_0_8px_rgba(212,175,55,0.8)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (levelProgress.currentXp / levelProgress.nextLevelCost) * 100)}%` }}
                      transition={{ type: "spring", bounce: 0.25, duration: 0.8 }}
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
                          <motion.div
                            className="h-full rounded-r-sm"
                            initial={{ width: 0 }}
                            animate={{ width: `${rankProgress.percentage}%` }}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.8 }}
                            style={{
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
                <div className="bg-[#1a1a2e] border border-white/5 rounded-md p-3 relative group">
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-mono text-[22px] font-bold text-[#d4af37] block">
                      {totalXp}
                    </span>
                    {xpTrend !== 0 && (
                      <span className={`text-[10px] font-bold flex items-center ${xpTrend > 0 ? 'text-emerald-400' : 'text-rose-400'}`} title={`XP gain this week vs last week (${xpTrend > 0 ? '+' : ''}${xpTrend})`}>
                        {xpTrend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      </span>
                    )}
                  </div>
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
                    {streakTrend !== 0 && (
                      <span className={`text-[10px] font-bold flex items-center ${streakTrend > 0 ? 'text-emerald-400' : 'text-rose-400'}`} title={`Streak compared to 7 days ago (${streakTrend > 0 ? '+' : ''}${streakTrend})`}>
                        {streakTrend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      </span>
                    )}
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
                  {unlockedAchievementsCount} / {ACHIEVEMENTS.length}
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
                    frictionItems,
                    debuffs,
                    triggerEvents,
                    traitGoals,
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

            {/* DEBUFFS PANEL — addiction interruption */}
            <DebuffPanel
              debuffs={debuffs}
              triggerEvents={triggerEvents}
              currentDate={currentMockDate}
              localOnly={debuffLocalOnly}
              onToggleLocalOnly={() => setDebuffLocalOnly((v) => !v)}
              onAddDebuff={handleAddDebuff}
              onUpdateDebuff={handleUpdateDebuff}
              onDeleteDebuff={handleDeleteDebuff}
              onAddTrigger={handleAddTrigger}
              grantXp={grantDebuffXp}
              showToast={showToast}
            />

            {/* TRAITS PANEL — the slow reshaping of personality */}
            <TraitPanel
              traitGoals={traitGoals}
              quests={quests}
              currentDate={currentMockDate}
              onAddGoal={handleAddTraitGoal}
              onUpdateGoal={handleUpdateTraitGoal}
              onDeleteGoal={handleDeleteTraitGoal}
              onAddCheckin={handleAddTraitCheckin}
              showToast={showToast}
            />

          </div>

          {/* =========================================================
              RIGHT COLUMN (QUEST LOG, BALANCE, CHRONICLE)
              order-1 on phones so the quest board leads the page.
              ========================================================= */}
          <div className="order-1 lg:order-2 lg:col-span-8 space-y-6">
            
            {/* QUEST LOG CARD */}
            <div id="quest-log-card" className="bg-[#15152a] border border-[#d4af37]/20 rounded-lg p-6 shadow-[0_0_15px_rgba(212,175,55,0.05)] relative">
              <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-3">
                <div>
                  <h2 className="font-serif text-lg font-bold text-[#d4af37] uppercase tracking-widest">
                    {questViewMode === 'list' ? 'QUEST LOG' : 'TASK SKILL TREE'}
                  </h2>
                  <p className="font-mono text-[9px] text-slate-500 uppercase mt-0.5">
                    {questViewMode === 'list' ? 'Your Current Habits and Milestones' : 'Path of Progression'}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
                  {(buildingCount > 0 || automaticCount > 0) && (
                    <div
                      className={`font-mono text-[10px] py-1.5 px-3 rounded border ${
                        buildingCount > 3
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : 'bg-[#1a1a2e] border-white/5 text-slate-300'
                      }`}
                      title={
                        buildingCount > 3
                          ? 'Run no more than 3 habits at once — a habit only frees a slot once it becomes Automatic (80+).'
                          : 'Habits still forming. Once one is Automatic it stops counting against your 3.'
                      }
                    >
                      Focus <span className="font-bold">{buildingCount}</span>/3
                      {automaticCount > 0 && (
                        <span className="text-emerald-400"> · {automaticCount} automatic</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center bg-[#1a1a2e] rounded border border-white/5 p-1">
                    <button
                      onClick={() => setQuestViewMode('tree')}
                      className={`px-3 py-1 text-[10px] font-mono rounded transition-all cursor-pointer ${
                        questViewMode === 'tree' ? 'bg-white/10 text-[#d4af37]' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      TREE
                    </button>
                    <button
                      onClick={() => setQuestViewMode('list')}
                      className={`px-3 py-1 text-[10px] font-mono rounded transition-all cursor-pointer ${
                        questViewMode === 'list' ? 'bg-white/10 text-[#d4af37]' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      LIST
                    </button>
                  </div>
                  {questViewMode === 'list' && (
                    <div className="font-mono text-[10px] text-slate-300 bg-[#1a1a2e] border border-white/5 py-1.5 px-3 rounded">
                      <span className="text-[#d4af37] font-bold">{countStandingSatisfied}</span> of {activeQuests.length} standing cleared
                    </div>
                  )}
                </div>
              </div>

              {questViewMode === 'tree' ? (
                <TaskSkillTree
                  onAddQuest={handleAddQuest}
                  onLoadSeason={handleLoadSeason}
                  masteredTitles={masteredTitles}
                  activeTitles={activeTitles}
                />
              ) : (
                <>
                  {/* CATEGORY FILTER */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <button
                      onClick={() => setQuestFilter('all')}
                      className={`px-3 py-1 text-[10px] font-mono rounded-full border transition-all cursor-pointer ${
                        questFilter === 'all' 
                          ? 'bg-slate-800 text-white border-slate-600' 
                          : 'bg-transparent text-slate-500 border-white/5 hover:border-white/20 hover:text-slate-300'
                      }`}
                    >
                      ALL
                    </button>
                    {(Object.keys(STATS) as StatType[]).map((stat) => (
                      <button
                        key={stat}
                        onClick={() => setQuestFilter(stat)}
                        className={`px-3 py-1 text-[10px] font-mono rounded-full border transition-all cursor-pointer capitalize ${
                          questFilter === stat 
                            ? '' 
                            : 'bg-transparent text-slate-500 border-white/5 hover:border-white/20 hover:text-slate-300'
                        }`}
                        style={questFilter === stat ? { 
                          backgroundColor: `${STATS[stat].color}20`,
                          color: STATS[stat].color,
                          borderColor: `${STATS[stat].color}50`
                        } : {}}
                      >
                        {STATS[stat].name}
                      </button>
                    ))}
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
                      const todayIsMin = ledger.some((e) => e.questId === q.id && e.date === currentMockDate && e.kind === 'minimum');

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
                          {/* Left: complete (full) or log the minimum — ring shows streak + automaticity */}
                          <div className="flex flex-col items-center gap-1 shrink-0">
                            <div className="relative w-11 h-11 flex items-center justify-center">
                              {renderAutomaticityRings(q)}
                              <button
                                onClick={() => handleToggleCheckCircle(q)}
                                className="relative text-slate-500 hover:text-[#d4af37] transition-colors cursor-pointer"
                                title="Log a full completion"
                              >
                                {completedToday ? (
                                  <CheckCircle2 className="w-5 h-5" style={{ color: config.color }} />
                                ) : (
                                  <Circle className="w-5 h-5 hover:scale-105 transition-transform" style={{ color: config.color }} />
                                )}
                              </button>
                            </div>
                            {completedToday ? (
                              todayIsMin && <span className="font-mono text-[7px] uppercase tracking-wider text-[#d4af37]/60">min</span>
                            ) : (
                              <button
                                onClick={() => handleLogMinimum(q)}
                                className="font-mono text-[7px] uppercase tracking-wider text-slate-600 hover:text-[#d4af37] transition-colors cursor-pointer"
                                title={q.intention?.minVersion ? `Never zero: ${q.intention.minVersion} (40% XP, keeps streak)` : 'Log the minimum version — 40% XP, keeps the streak'}
                              >
                                min
                              </button>
                            )}
                          </div>

                          {/* Middle: Details */}
                          <div className="flex-1 min-w-0 text-left">
                            <h4
                              className={`font-sans text-xs font-semibold leading-snug ${
                                completedToday ? 'text-slate-400 line-through' : 'text-slate-100'
                              }`}
                            >
                              {q.title}
                            </h4>
                            {q.description && (
                              <p className="font-sans text-[10px] text-slate-500 leading-snug mt-0.5">{q.description}</p>
                            )}
                            {renderIntention(q)}
                            {renderUnlockBar(q)}
                            {renderFrictionSection(q)}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1 font-mono text-[9px] text-slate-500 uppercase">
                              {renderAutoState(q)}
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
                      const todayIsMin = ledger.some((e) => e.questId === q.id && e.date === currentMockDate && e.kind === 'minimum');

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
                          {/* Left: complete (full) or log the minimum — ring shows streak + automaticity */}
                          <div className="flex flex-col items-center gap-1 shrink-0">
                            <div className="relative w-11 h-11 flex items-center justify-center">
                              {renderAutomaticityRings(q)}
                              <button
                                onClick={() => handleToggleCheckCircle(q)}
                                className="relative text-slate-500 hover:text-[#d4af37] transition-colors cursor-pointer"
                                title="Log a full completion"
                              >
                                {loggedToday ? (
                                  <CheckCircle2 className="w-5 h-5" style={{ color: config.color }} />
                                ) : satisfiedThisWeek ? (
                                  <CheckCircle2 className="w-5 h-5 opacity-50" style={{ color: config.color }} />
                                ) : (
                                  <Circle className="w-5 h-5 hover:scale-105 transition-transform" style={{ color: config.color }} />
                                )}
                              </button>
                            </div>
                            {loggedToday ? (
                              todayIsMin && <span className="font-mono text-[7px] uppercase tracking-wider text-[#d4af37]/60">min</span>
                            ) : (
                              <button
                                onClick={() => handleLogMinimum(q)}
                                className="font-mono text-[7px] uppercase tracking-wider text-slate-600 hover:text-[#d4af37] transition-colors cursor-pointer"
                                title={q.intention?.minVersion ? `Never zero: ${q.intention.minVersion} (40% XP, keeps streak)` : 'Log the minimum version — 40% XP, keeps the streak'}
                              >
                                min
                              </button>
                            )}
                          </div>

                          {/* Middle: Info */}
                          <div className="flex-1 min-w-0 text-left">
                            <h4
                              className={`font-sans text-xs font-semibold leading-snug ${
                                satisfiedThisWeek ? 'text-slate-400 line-through' : 'text-slate-100'
                              }`}
                            >
                              {q.title}
                            </h4>
                            {q.description && (
                              <p className="font-sans text-[10px] text-slate-500 leading-snug mt-0.5">{q.description}</p>
                            )}
                            {renderIntention(q)}
                            {renderUnlockBar(q)}
                            {renderFrictionSection(q)}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1 font-mono text-[9px] text-slate-500 uppercase">
                              {renderAutoState(q)}
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
                          <div className="flex-1 min-w-0 text-left">
                            <h4
                              className={`font-sans text-xs font-semibold leading-snug ${
                                cleared ? 'text-slate-400 line-through' : 'text-slate-100'
                              }`}
                            >
                              {q.title}
                            </h4>
                            {q.description && (
                              <p className="font-sans text-[10px] text-slate-500 leading-snug mt-0.5">{q.description}</p>
                            )}
                            {renderIntention(q)}
                            {renderUnlockBar(q)}
                            {renderFrictionSection(q)}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1 font-mono text-[9px] text-slate-500 uppercase">
                              {renderAutoState(q)}
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
              </>
              )}
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
                          <motion.div
                            className="h-full rounded-r-sm"
                            initial={{ width: 0 }}
                            animate={{ width: `${val.percentage}%` }}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.8 }}
                            style={{
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

      {/* ADD QUEST OVERLAY MODAL — mounted only while open so its chunk is lazy */}
      {isAddQuestOpen && (
        <Suspense fallback={null}>
          <AddQuestModal
            isOpen={true}
            onClose={() => setIsAddQuestOpen(false)}
            onAdd={handleAddQuest}
            userClass={userClass}
          />
        </Suspense>
      )}

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

              {/* DANGER ZONE - RESET PROGRESS */}
              <div className="border-t border-white/5 pt-5 mt-4">
                <h4 className="font-mono text-[10px] text-rose-400 font-bold uppercase tracking-widest mb-1.5">
                  DANGER ZONE
                </h4>
                <p className="text-[10px] text-slate-500 font-mono mb-3.5 leading-relaxed">
                  Permanently clear your ledger, resetting your character level to 0 and all stat points back to 0. Your current quests and settings will be preserved.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Are you absolutely sure you want to reset all your levels and points? This will wipe your ledger history and start you back at Level 0 with 0 XP. This action cannot be undone.")) {
                      setLedger([]);
                      setIsEditingCharacter(false);
                      showToast("All levels, ranks, and points have been reset!");
                    }
                  }}
                  className="w-full bg-rose-950/20 hover:bg-rose-900/30 border border-rose-500/30 hover:border-rose-400/50 text-rose-400 font-mono text-[10px] uppercase tracking-wider py-2.5 rounded-md cursor-pointer transition-all text-center font-bold mb-2"
                >
                  Reset Levels & Points
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to completely wipe your save data? This will clear everything including your name, class, and quests. This cannot be undone.")) {
                      handleHardReset();
                    }
                  }}
                  className="w-full bg-red-950/20 hover:bg-red-900/30 border border-red-600/40 hover:border-red-500/60 text-red-500 font-mono text-[10px] uppercase tracking-wider py-2.5 rounded-md cursor-pointer transition-all text-center font-bold"
                >
                  Hard Reset (Start from Scratch)
                </button>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex gap-3 pt-4">
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
        onHardReset={handleHardReset}
        onAddFreeXp={handleAddFreeXp}
        onAdvanceDay={handleAdvanceDay}
        onAdvanceWeek={handleAdvanceWeek}
      />

    </div>
  );
}
