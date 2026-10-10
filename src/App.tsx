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
  ShieldCheck,
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
  Upload,
  TrendingUp,
  TrendingDown,
  Bell,
  MoreHorizontal,
  UserRound,
  Swords,
  Sprout,
  FlaskConical,
  Lock
} from 'lucide-react';

import { Quest, LedgerEntry, UserClass, StatType, STATS, CLASSES, FrictionItem, Debuff, TriggerEvent, TraitGoal, CustomPath, TraitId, TraitCheckin } from './types';
import Sigil from './components/Sigil';
import RadarChart from './components/RadarChart';
import Chronicle from './components/Chronicle';
import TaskSkillTree from './components/TaskSkillTree';
import PathsView from './components/PathsView';
import { NODES } from './data/lifeTree';
import { lifeNodeId, nodeSetsFromQuests, MAX_PATHS } from './utils/paths';
import DiagnosticsPanel from './components/DiagnosticsPanel';
import DebuffPanel from './components/DebuffPanel';
import TraitPanel from './components/TraitPanel';
import DawnRitual from './components/DawnRitual';
import Campfire from './components/Campfire';
import RemindersModal from './components/RemindersModal';
import {
  loadReminders,
  saveReminders,
  loadFired,
  markFired,
  dueReminders,
  REMINDER_META,
  ReminderSettings,
} from './utils/reminders';
import { ACHIEVEMENTS } from './utils/achievements';

// Split out of the initial bundle — a modal and a one-off overlay that only
// mount on demand, so their code (and confetti) loads when first needed.
const AddQuestModal = lazy(() => import('./components/AddQuestModal'));
const ForgePathModal = lazy(() => import('./components/ForgePathModal'));
const MasteryCelebration = lazy(() => import('./components/MasteryCelebration'));

// Real-world Supabase Sync client and service
import { supabase } from './utils/supabase';
import { registerCharacter, signInCharacter, idFromUser, pullSave, pushSave, mergeSaves, SaveStateData } from './utils/syncService';
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
  getAutomaticityState,
  getDayPhase,
  REFLECTION_XP,
} from './utils/logic';
import {
  buildCompletionEntry,
  removeDayCompletions,
  removeOneCompletion,
  removeAllCompletions,
  updateQuestInList,
} from './utils/questActions';

const SAVE_KEY = 'habitquest:save:v1';

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
  const [customPaths, setCustomPaths] = useState<CustomPath[]>([]);
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

  // UI states
  const [questViewMode, setQuestViewMode] = useState<'list' | 'tree' | 'paths'>('tree');
  // Forge a Path modal: open with no path = forge new; with a path = reforge it.
  const [isForgeOpen, setIsForgeOpen] = useState(false);
  const [editingPath, setEditingPath] = useState<CustomPath | null>(null);
  const [mainTab, setMainTab] = useState<'quests' | 'character' | 'growth'>('character');
  const [questFilter, setQuestFilter] = useState<'all' | StatType>('all');
  const [isAddQuestOpen, setIsAddQuestOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);
  // Phone header: secondary actions live in a ⋯ menu; diagnostics opens as a sheet.
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isDiagOpen, setIsDiagOpen] = useState(false);
  // Phones list unlocked achievements and fold the locked ones behind a toggle.
  const [showLockedAch, setShowLockedAch] = useState(false);
  const [reminders, setReminders] = useState<ReminderSettings>(() => loadReminders());
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
  // Character ID + password sync (shared by the header and onboarding forms).
  const [syncPw, setSyncPw] = useState('');
  const [syncMode, setSyncMode] = useState<'signin' | 'create'>('signin');

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
    // Export the complete, current-schema save (the old version-1 export dropped
    // friction, debuffs, traits, tombstones and dates — a lossy backup).
    const data = buildLocalSave({
      userName, userClass, quests, ledger, frictionItems, debuffs, triggerEvents,
      traitGoals, customPaths, deletedIds, liveClock, debuffLocalOnly, currentMockDate, hasCreatedCharacter, syncEmail,
    });
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

  // Import a previously-exported save: parse → validate → migrate → apply.
  // Overwrites the current character, so it confirms first and never crashes
  // on a bad file.
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reset = () => { if (importInputRef.current) importInputRef.current.value = ''; };
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.quests) || !Array.isArray(parsed.ledger)) {
          showToast("That file doesn't look like a Habit-Life-Quest save.");
          reset();
          return;
        }
        if (!window.confirm('Importing replaces your current character and all progress on this device. Continue?')) {
          reset();
          return;
        }
        const migrated = migrate(parsed);
        const isLive = migrated.liveClock ?? Boolean(migrated.hasCreatedCharacter);
        const today = toDateStr(new Date());
        const fields = {
          userName: migrated.userName || 'Adventurer',
          userClass: migrated.userClass || 'scholar',
          quests: migrated.quests || [],
          ledger: migrated.ledger || [],
          frictionItems: migrated.frictionItems || [],
          debuffs: migrated.debuffs || [],
          triggerEvents: migrated.triggerEvents || [],
          traitGoals: migrated.traitGoals || [],
          customPaths: migrated.customPaths || [],
          deletedIds: migrated.deletedIds || [],
          liveClock: isLive,
          debuffLocalOnly: migrated.debuffLocalOnly ?? debuffLocalOnly,
          currentMockDate: isLive ? today : (migrated.currentMockDate || today),
          hasCreatedCharacter: true,
          syncEmail,
        };
        setUserName(fields.userName);
        setUserClass(fields.userClass as UserClass);
        setQuests(fields.quests);
        setLedger(fields.ledger);
        setFrictionItems(fields.frictionItems);
        setDebuffs(fields.debuffs);
        setTriggerEvents(fields.triggerEvents);
        setTraitGoals(fields.traitGoals);
        setCustomPaths(fields.customPaths);
        setDeletedIds(fields.deletedIds);
        setLiveClock(fields.liveClock);
        setDebuffLocalOnly(fields.debuffLocalOnly);
        setCurrentMockDate(fields.currentMockDate);
        setHasCreatedCharacter(true);
        localStorage.setItem(SAVE_KEY, JSON.stringify(buildLocalSave(fields)));
        showToast(`Save imported — welcome back, ${fields.userName}.`);
      } catch {
        showToast("Couldn't read that file — is it a valid save export?");
      } finally {
        reset();
      }
    };
    reader.onerror = () => { showToast('Failed to read the file.'); reset(); };
    reader.readAsText(file);
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

  // Day/night cycle — driven by the wall clock, re-checked each minute so the
  // page shifts phase (and the Campfire theme) without a reload.
  const [nowHour, setNowHour] = useState<number>(() => new Date().getHours());
  useEffect(() => {
    const tick = () => setNowHour(new Date().getHours());
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);
  const dayPhase = getDayPhase(nowHour);

  // Which top-level cards show, by tab. Splitting the one long page into
  // Quests / Character / Growth is the main lever against visual overload.
  const show = (tab: 'quests' | 'character' | 'growth') => (mainTab === tab ? '' : 'hidden');

  // After 8 PM the ambient warms toward firelight (only once a real character
  // exists, so onboarding isn't tinted).
  useEffect(() => {
    document.documentElement.classList.toggle(
      'campfire',
      dayPhase === 'campfire' && hasCreatedCharacter,
    );
  }, [dayPhase, hasCreatedCharacter]);

  // Persist reminder settings.
  useEffect(() => {
    saveReminders(reminders);
  }, [reminders]);

  // Fire due reminders while the app is open/backgrounded. Local only — real
  // closed-app push needs a server. Checked on mount and every 30s.
  useEffect(() => {
    if (!reminders.enabled) return;
    const fire = async (key: 'dawn' | 'campfire' | 'daily') => {
      const meta = REMINDER_META[key];
      const opts: NotificationOptions = {
        body: meta.body,
        tag: `hlq-${key}`,
        icon: '/logo-192.png',
        badge: '/logo-192.png',
        data: { url: '/' },
      };
      try {
        const reg = await navigator.serviceWorker?.ready;
        if (reg && 'showNotification' in reg) {
          await reg.showNotification(meta.title, opts);
        } else if (typeof Notification !== 'undefined') {
          new Notification(meta.title, opts);
        }
      } catch {
        /* ignore */
      }
    };
    const check = () => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      const now = new Date();
      const todayStr = toDateStr(now);
      dueReminders(reminders, now, loadFired(), todayStr).forEach((key) => {
        markFired(key, todayStr);
        fire(key);
      });
    };
    check();
    const t = setInterval(check, 30_000);
    return () => clearInterval(t);
  }, [reminders]);


  // Helper to pull remote save state, merge with local state, and push back
  const handleInitialMerge = async (userId: string, email: string) => {
    setIsSyncing(true);
    setIsSyncingLanding(true);
    try {
      const res = await pullSave(userId);
      if (res.success && res.saveState) {
        let localState: SaveStateData = buildCloudSave({
          userName, userClass, quests, ledger, frictionItems, debuffs, triggerEvents,
          traitGoals, customPaths, deletedIds, liveClock, debuffLocalOnly, currentMockDate, hasCreatedCharacter: true,
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
          customPaths: migrated.customPaths || [],
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
        setCustomPaths(merged.customPaths || []);
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
          traitGoals, customPaths, deletedIds, liveClock, debuffLocalOnly, currentMockDate, hasCreatedCharacter: true,
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
          customPaths: migrated.customPaths || [],
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
        setCustomPaths(migrated.customPaths || []);
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
        setSyncEmail(idFromUser(session.user));
        handleInitialMerge(session.user?.id, idFromUser(session.user));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSyncEmail(idFromUser(session.user));
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
    if (quests.length > 0 || ledger.length > 0 || customPaths.length > 0) {
      const stateToSave = buildLocalSave({
        userName, userClass, quests, ledger, frictionItems, debuffs, triggerEvents,
        traitGoals, customPaths, deletedIds, liveClock, debuffLocalOnly, currentMockDate, hasCreatedCharacter, syncEmail,
      });
      localStorage.setItem(SAVE_KEY, JSON.stringify(stateToSave));
    }
  }, [userName, userClass, quests, ledger, frictionItems, debuffs, triggerEvents, traitGoals, customPaths, deletedIds, liveClock, debuffLocalOnly, currentMockDate, hasCreatedCharacter, syncEmail]);

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
          traitGoals, customPaths, deletedIds, liveClock, debuffLocalOnly, currentMockDate, hasCreatedCharacter,
        });
        await pushSave(session.user.id, session.user.email || '', stateToSave);
      }
    };

    if (quests.length > 0 || ledger.length > 0 || customPaths.length > 0) {
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(triggerPush, 1200);
    }
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [userName, userClass, quests, ledger, frictionItems, debuffs, triggerEvents, traitGoals, customPaths, deletedIds, liveClock, debuffLocalOnly, currentMockDate, hasCreatedCharacter]);


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
    setCustomPaths([]);
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
    setCustomPaths([]);
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

  // Cues resisted — surfaced on the dashboard so the win is visible without
  // opening the debuff panel. A resisted cue is any trigger not acted on.
  const cuesResistedToday = triggerEvents.filter((t) => t.acted === false && t.at === currentMockDate).length;
  const resistStreak = getAppWideStreak(
    Array.from(new Set(triggerEvents.filter((t) => t.acted === false).map((t) => t.at))),
    currentMockDate,
  );

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
  const unlockedQuestIds = new Set(
    quests.filter((q) => getUnlockProgress(q, ledger, currentMockDate).unlocked).map((q) => q.id),
  );
  const activeTitles = new Set(quests.filter((q) => q.active).map((q) => q.title));
  const masteredTitles = new Set(quests.filter((q) => unlockedQuestIds.has(q.id)).map((q) => q.title));
  // Stable node-id links (built-in tree + custom Paths). A renamed quest still
  // counts for the node it came from.
  const { masteredNodeIds, activeNodeIds } = nodeSetsFromQuests(quests, (q) => unlockedQuestIds.has(q.id));
  for (const n of NODES) {
    const id = lifeNodeId(n);
    if (masteredNodeIds.has(id)) masteredTitles.add(n.title);
    if (activeNodeIds.has(id)) activeTitles.add(n.title);
  }

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
      resistStreak,
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

    const logComplete = (toast: (xp: number) => string) => {
      const entry = buildCompletionEntry({
        quest: q,
        quests,
        ledger,
        userClass,
        date: currentMockDate,
        id: uid('log'),
      });
      setLedger([...ledger, entry]);
      maybeCelebrateMastery(q, entry);
      showToast(toast(entry.xp));
    };

    if (q.type === 'daily') {
      if (alreadyLoggedToday) {
        setLedger(removeDayCompletions(ledger, q.id, currentMockDate));
        showToast(`Removed today's log for "${q.title}"`);
      } else {
        logComplete((xp) => `Earned +${xp} XP! "${q.title}" logged`);
      }
    } else if (q.type === 'weekly') {
      // Weekly quests can be logged several times a week; clicking again undoes
      // one of today's logs.
      if (alreadyLoggedToday) {
        setLedger(removeOneCompletion(ledger, q.id, currentMockDate));
        showToast(`Undone today's log for "${q.title}"`);
      } else {
        logComplete((xp) => `Earned +${xp} XP! "${q.title}" logged today`);
      }
    } else if (q.type === 'milestone') {
      // Milestones are done once and cleared forever.
      if (isMilestoneSatisfied(q.id)) {
        setLedger(removeAllCompletions(ledger, q.id));
        showToast(`Reset milestone "${q.title}" to unfinished`);
      } else {
        logComplete((xp) => `Milestone Complete! Earned +${xp} XP!`);
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
    const entry = buildCompletionEntry({
      quest: q,
      quests,
      ledger,
      userClass,
      date: currentMockDate,
      id: uid('log'),
      kind: 'minimum',
    });
    setLedger([...ledger, entry]);
    maybeCelebrateMastery(q, entry);
    const min = q.intention?.minVersion;
    showToast(min ? `Never zero — did the minimum: ${min}. +${entry.xp} XP, streak kept.` : `Never zero — minimum logged. +${entry.xp} XP, streak kept.`);

    // After two scaled-down days in a row, ask whether the quest is mis-scoped.
    const prev1 = getPreviousDateStr(currentMockDate);
    const prev2 = getPreviousDateStr(prev1);
    const wasMin = (d: string) => ledger.some((e) => e.questId === q.id && e.date === d && e.kind === 'minimum');
    if (wasMin(prev1) && wasMin(prev2)) {
      setTimeout(() => showToast(`That's three minimum days for "${q.title}" — consider making it easier.`), 1700);
    }
  };

  // Campfire micro-reflection — banks the day by logging one win into Spirit or
  // Mind. One per day: submitting replaces it, empty text clears it. Modelled as
  // a ledger entry so it persists and syncs like any other XP.
  const handleReflect = (text: string, stat: 'spirit' | 'mind') => {
    const id = `reflection_${currentMockDate}`;
    const t = text.trim();
    if (!t) {
      setLedger(ledger.filter((e) => e.id !== id));
      return;
    }
    const entry: LedgerEntry = {
      id,
      date: currentMockDate,
      questId: id,
      questTitle: `Campfire: ${t}`,
      xp: REFLECTION_XP,
      stat,
      difficulty: 'easy',
      type: 'milestone',
      kind: 'reflection',
    };
    setLedger([...ledger.filter((e) => e.id !== id), entry]);
    showToast(`Day banked — +${REFLECTION_XP} ${STATS[stat].name} XP. Rest well.`);
  };

  // Add a new quest (skips an exact-title duplicate that's already on the board)
  const handleAddQuest = (questData: Omit<Quest, 'id' | 'createdAt' | 'active'>) => {
    if (quests.some((q) => q.active && (q.title === questData.title || (questData.nodeId && q.nodeId === questData.nodeId)))) {
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

  // Edit an existing quest in place — keeps its id, createdAt, active flag,
  // phase and ledger history, so its streak/automaticity/unlock progress
  // survive a title/difficulty/stat change.
  const handleUpdateQuest = (id: string, data: Omit<Quest, 'id' | 'createdAt' | 'active'>) => {
    if (quests.some((q) => q.active && q.id !== id && q.title === data.title)) {
      showToast(`"${data.title}" is already on your board.`);
      return;
    }
    setQuests(updateQuestInList(quests, id, data));
    showToast(`Updated "${data.title}".`);
    setEditingQuest(null);
  };

  // Quick-add a ritual step — a low-friction daily quest tagged to a phase.
  // One step makes a single "routine" checkbox; several make a checklist. This
  // is what lets the user choose how granular their Dawn/Campfire ritual is.
  const handleAddRitualStep = (phase: 'dawn' | 'campfire', title: string) => {
    const t = title.trim();
    if (!t) return;
    if (quests.some((q) => q.active && q.title === t)) {
      showToast(`"${t}" is already on your board.`);
      return;
    }
    const stat: StatType = phase === 'dawn' ? 'body' : 'spirit';
    const newQuest: Quest = {
      id: uid('quest'),
      title: t,
      stat,
      difficulty: 'easy',
      type: 'daily',
      target: 1,
      active: true,
      createdAt: currentMockDate,
      phase,
    };
    setQuests([...quests, newQuest]);
    showToast(`Added to your ${phase === 'dawn' ? 'Dawn Ritual' : 'Campfire'}.`);
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

  // Custom Paths — save (create or reforge) and abandon. Abandoning a path
  // tombstones it so a sync can't bring it back; its quests and XP stay.
  const handleSavePath = (path: CustomPath) => {
    const exists = customPaths.some((p) => p.id === path.id);
    if (!exists && customPaths.length >= MAX_PATHS) {
      showToast(`You can walk at most ${MAX_PATHS} paths at once.`);
      return;
    }
    setCustomPaths(exists ? customPaths.map((p) => (p.id === path.id ? path : p)) : [...customPaths, path]);
    setIsForgeOpen(false);
    setEditingPath(null);
    showToast(exists ? `"${path.name}" reforged.` : `"${path.name}" forged — its first tier is open.`);
  };

  // Paths read from an import file — already validated, renamed-safe and
  // capped by importPaths(); just append them.
  const handleImportPaths = (imported: CustomPath[]) => {
    setCustomPaths((prev) => [...prev, ...imported]);
  };

  const handleDeletePath = (id: string) => {
    const name = customPaths.find((p) => p.id === id)?.name ?? 'Path';
    setCustomPaths(customPaths.filter((p) => p.id !== id));
    setDeletedIds((prev) => [...prev, id]);
    setIsForgeOpen(false);
    setEditingPath(null);
    showToast(`"${name}" abandoned. Its quests and XP remain.`);
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

  // Cloud sync via Character ID + password (header popover).
  const handleCloudSync = async (e: React.FormEvent) => {
    e.preventDefault();
    const field = emailInput.trim();
    // Create: derive the ID from the character's name (the field overrides it).
    // Sign in: the field is the typed Character ID and is required.
    if (!syncPw || (syncMode === 'signin' && !field)) return;

    setIsSyncing(true);
    try {
      const res = syncMode === 'create'
        ? await registerCharacter(field || userName || 'Hero', syncPw)
        : await signInCharacter(field, syncPw);
      if (res.success && res.session) {
        const label = idFromUser(res.session.user);
        setIsSyncOpen(false);
        setSyncPw('');
        showToast(
          syncMode === 'create'
            ? `Your Character ID is ${res.assignedId || label} — save it to sign in on other devices.`
            : `Signed in as "${label}". Sync active.`,
        );
        await handleInitialMerge(res.session.user.id, label);
      } else {
        showToast(res.error || 'Sign-in failed.');
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
    setCustomPaths([]);
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
          customPaths: [],
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

  // Cloud sync via Character ID + password (onboarding screen).
  const handleSyncLanding = async (e: React.FormEvent) => {
    e.preventDefault();
    const field = creationEmail.trim();
    // Create: the field is the new character's name (ID is auto-assigned).
    // Sign in: the field is the typed Character ID and is required.
    if (!syncPw || (syncMode === 'signin' && !field)) return;

    setIsSyncingLanding(true);
    try {
      const name = field || creationName.trim() || userName || 'Hero';
      const res = syncMode === 'create'
        ? await registerCharacter(name, syncPw)
        : await signInCharacter(field, syncPw);
      if (res.success && res.session) {
        const label = idFromUser(res.session.user);
        setSyncPw('');
        if (syncMode === 'create') setUserName(name);
        showToast(
          syncMode === 'create'
            ? `Your Character ID is ${res.assignedId || label} — save it to sign in on other devices.`
            : `Signed in as "${label}". Character synced.`,
        );
        await handleInitialMerge(res.session.user.id, label);
        setHasCreatedCharacter(true);
      } else {
        showToast(res.error || 'Sign-in failed.');
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

  // Day/night ritual groupings. Dawn/Campfire quests live in their own panels
  // (not the stat filter) and are pulled out of the ordinary daily list so they
  // don't show twice. `daytimeDailies` is what the main Daily section renders.
  const dawnQuests = allActiveQuests.filter((q) => q.type === 'daily' && q.phase === 'dawn');
  const campfireQuests = allActiveQuests.filter((q) => q.type === 'daily' && q.phase === 'campfire');
  const daytimeDailies = activeDailies.filter((q) => !q.phase);
  const countDaytimeClearedToday = daytimeDailies.filter((q) => isLoggedToday(q.id)).length;
  const todaysReflection = ledger.find((e) => e.id === `reflection_${currentMockDate}`);

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
          <div className="w-full max-w-xl bg-[#15152a] border border-[#d4af37]/20 rounded-2xl p-5 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.08)]">
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
                      className={`sm:col-span-2 p-4 rounded-lg border transition-all cursor-pointer bg-[#101020]/60 text-left sm:text-center ${
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
              /* SIGN IN TO SYNC FORM — Character ID + password */
              <form onSubmit={handleSyncLanding} className="space-y-5">
                <div className="text-center mb-6">
                  <h2 className="font-serif text-lg font-bold text-[#d4af37] uppercase tracking-widest">
                    {syncMode === 'create' ? 'CREATE A CHARACTER' : 'SIGN IN TO SYNC'}
                  </h2>
                  <p className="font-sans text-xs text-slate-400 mt-1.5 leading-normal">
                    {syncMode === 'create'
                      ? "Name your character and pick a password — we'll assign you an ID like shadowknight#4821. Use it to carry your hero to any device. No email needed."
                      : 'Enter your Character ID (like shadowknight#4821) and password to pull this hero onto this device.'}
                  </p>
                </div>

                {/* Mode toggle */}
                <div className="flex bg-[#1a1a2e] border border-white/5 rounded-lg p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setSyncMode('signin')}
                    className={`flex-1 font-mono text-[10px] uppercase tracking-wider py-2 rounded-md transition-all cursor-pointer ${syncMode === 'signin' ? 'bg-[#d4af37] text-[#050510] font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyncMode('create')}
                    className={`flex-1 font-mono text-[10px] uppercase tracking-wider py-2 rounded-md transition-all cursor-pointer ${syncMode === 'create' ? 'bg-[#d4af37] text-[#050510] font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Create New
                  </button>
                </div>

                <div>
                  <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-bold">
                    {syncMode === 'create' ? 'CHARACTER NAME' : 'CHARACTER ID'}
                  </label>
                  <input
                    type="text"
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder={syncMode === 'create' ? 'e.g. Shadow Knight' : 'e.g. shadowknight#4821'}
                    value={creationEmail}
                    onChange={(e) => setCreationEmail(e.target.value)}
                    className={`w-full bg-[#1a1a2e] border border-white/5 focus:border-[#d4af37]/50 rounded-lg py-3 px-4 text-sm text-[#e0e0e0] placeholder-slate-600 outline-none transition-all font-mono ${syncMode === 'create' ? '' : 'lowercase placeholder:normal-case'}`}
                  />
                  {syncMode === 'create' && (
                    <p className="font-sans text-[10px] text-slate-500 mt-1.5">Your ID is assigned automatically, e.g. <span className="text-slate-400 font-mono">shadowknight#4821</span>.</p>
                  )}
                </div>

                <div>
                  <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-bold">
                    PASSWORD
                  </label>
                  <input
                    type="password"
                    required
                    placeholder={syncMode === 'create' ? 'At least 6 characters' : 'Enter your password'}
                    value={syncPw}
                    onChange={(e) => setSyncPw(e.target.value)}
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
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {syncMode === 'create' ? 'Creating...' : 'Signing in...'}
                      </>
                    ) : (
                      syncMode === 'create' ? 'Create & Sync' : 'Sign In'
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

        {/* Diagnostics Panel under landing screen — top-right on phones so it
            doesn't sit on the class cards, bottom-right from sm up. */}
        <div className="fixed top-[calc(env(safe-area-inset-top)+0.75rem)] right-3 sm:top-auto sm:bottom-4 sm:right-4 z-50">
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
    <div className="min-h-screen bg-[#050510] text-[#e0e0e0] font-sans pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-24 antialiased selection:bg-[#d4af37]/30 selection:text-white">
      
      {/* Toast Alert popups */}
      {toastMessage && (
        <div role="status" className="fixed top-[calc(env(safe-area-inset-top)+0.75rem)] left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] sm:w-auto max-w-md bg-[#15152a] border border-[#d4af37]/30 text-[#d4af37] px-4 sm:px-5 py-3 rounded-lg shadow-2xl font-mono text-xs flex items-center gap-2.5 animate-fade-in">
          <Sparkles className="w-4 h-4 text-[#d4af37] shrink-0" />
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
      <header className="border-b border-[#d4af37]/30 bg-[#15152a]/90 backdrop-blur-md sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
        <div className="relative max-w-7xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
          
          {/* Logo */}
          <div className="flex items-center gap-2 min-w-0">
            <img src="/logo.png" alt="Habit Quest Logo" className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 object-contain rounded-md drop-shadow-md glow-active" onError={(e) => {
              // Fallback to the CSS sigil if image is missing
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextElementSibling) {
                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
              }
            }} />
            <div className="w-3.5 h-3.5 bg-gradient-to-r from-[#d4af37] to-[#aa7c11] rounded-sm rotate-45 border border-[#d4af37]/30 shadow-md glow-active hidden" />
            <h1 className="max-[359px]:sr-only font-serif text-[15px] sm:text-lg font-bold tracking-[0.1em] sm:tracking-[0.25em] text-[#d4af37] uppercase select-none cursor-default whitespace-nowrap">
              HABITQUEST
            </h1>
          </div>

          {/* Controls & Sync */}
          <div className="flex items-center gap-1.5 sm:gap-3.5 shrink-0">
            {/* PWA Install */}
            <button
              onClick={handleInstallApp}
              className="hidden sm:block p-1.5 rounded-full border border-white/10 bg-[#1a1a2e]/50 text-[#e0e0e0]/70 hover:border-[#d4af37]/40 hover:text-[#d4af37] transition-all cursor-pointer"
              title="Install App"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Reminders */}
            <button
              onClick={() => setIsRemindersOpen(true)}
              className={`hidden sm:block p-1.5 rounded-full border bg-[#1a1a2e]/50 transition-all cursor-pointer ${
                reminders.enabled
                  ? 'border-[#d4af37]/40 text-[#d4af37]'
                  : 'border-white/10 text-[#e0e0e0]/70 hover:border-[#d4af37]/40 hover:text-[#d4af37]'
              }`}
              title="Reminders"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="hidden sm:block p-1.5 rounded-full border border-white/10 bg-[#1a1a2e]/50 text-[#e0e0e0]/70 hover:border-[#d4af37]/40 hover:text-[#d4af37] transition-all cursor-pointer"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Sync trigger button */}
            <button
              onClick={() => {
                setIsSyncOpen(!isSyncOpen);
                setIsMoreOpen(false);
                setEmailInput(syncEmail || '');
              }}
              title={syncEmail ? `Sync active — ${syncEmail}` : 'Cloud sync'}
              aria-label={syncEmail ? 'Sync active' : 'Cloud sync'}
              className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full border text-[10px] font-mono uppercase tracking-wider cursor-pointer transition-all shrink-0 ${
                syncEmail
                  ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                  : 'border-white/10 bg-[#1a1a2e]/50 text-[#e0e0e0]/70 hover:border-[#d4af37]/40 hover:text-white'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${syncEmail ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
              <Cloud className="w-3.5 h-3.5 sm:hidden" aria-hidden />
              <span className="hidden sm:inline">{syncEmail ? 'SYNC ACTIVE' : 'SYNC'}</span>
            </button>

            {/* Sync dropdown popover */}
            {isSyncOpen && (
              <div className="absolute top-full mt-2 left-3 right-3 sm:left-auto sm:right-20 sm:w-72 bg-[#15152a] border border-[#d4af37]/30 rounded-xl sm:rounded-lg p-4 shadow-2xl z-40 animate-fade-in">
                <h4 className="font-serif text-xs font-bold text-[#d4af37] uppercase mb-1">
                  Optional Cloud Sync
                </h4>
                <p className="font-sans text-[10px] text-slate-400 leading-normal mb-3">
                  Back up and mirror your habits across devices with a Character ID and password. Works fully offline by merging logs.
                </p>

                {syncEmail ? (
                  <div className="space-y-3">
                    <div className="bg-[#1a1a2e] border border-white/5 p-2.5 rounded text-left">
                      <span className="font-mono text-[8px] text-slate-500 uppercase block">Character ID:</span>
                      <span className="font-mono text-xs text-emerald-400 font-bold block overflow-ellipsis overflow-hidden">{syncEmail}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          const { data: { session } } = await supabase.auth.getSession();
                          if (session?.user) {
                            await handleInitialMerge(session.user.id, idFromUser(session.user));
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
                            setSyncPw('');
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
                    <div className="flex bg-[#1a1a2e] border border-white/5 rounded p-0.5 gap-0.5">
                      <button
                        type="button"
                        onClick={() => { setSyncMode('signin'); setEmailInput(''); }}
                        className={`flex-1 font-mono text-[9px] uppercase tracking-wider py-1.5 rounded transition-all cursor-pointer ${syncMode === 'signin' ? 'bg-[#d4af37] text-[#050510] font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSyncMode('create'); setEmailInput(userName || ''); }}
                        className={`flex-1 font-mono text-[9px] uppercase tracking-wider py-1.5 rounded transition-all cursor-pointer ${syncMode === 'create' ? 'bg-[#d4af37] text-[#050510] font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        Create New
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder={syncMode === 'create' ? 'Character name' : 'Character ID (e.g. hero#4821)'}
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className={`w-full bg-[#1a1a2e] border border-white/10 focus:border-[#d4af37]/40 rounded py-1.5 px-2.5 text-xs text-slate-200 outline-none font-mono ${syncMode === 'create' ? '' : 'lowercase placeholder:normal-case'}`}
                    />
                    {syncMode === 'create' && (
                      <p className="font-sans text-[9px] text-slate-500 -mt-1">You'll be assigned an ID like <span className="font-mono text-slate-400">name#4821</span>.</p>
                    )}
                    <input
                      type="password"
                      required
                      placeholder={syncMode === 'create' ? 'Password (min 6 chars)' : 'Password'}
                      value={syncPw}
                      onChange={(e) => setSyncPw(e.target.value)}
                      className="w-full bg-[#1a1a2e] border border-white/10 focus:border-[#d4af37]/40 rounded py-1.5 px-2.5 text-xs text-slate-200 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isSyncing}
                      className="w-full bg-[#d4af37] hover:bg-[#f3e5ab] text-[#050510] font-mono text-[9px] font-bold uppercase py-1.5 rounded cursor-pointer transition-all flex items-center justify-center gap-1.5"
                    >
                      {isSyncing ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" /> {syncMode === 'create' ? 'Creating...' : 'Signing in...'}
                        </>
                      ) : (
                        syncMode === 'create' ? 'Create & Sync' : 'Sign In'
                      )}
                    </button>
                  </form>
                )}

                {/* Local backup — works with or without cloud sync */}
                <div className="mt-3 pt-3 border-t border-white/5">
                  <span className="font-mono text-[8px] text-slate-500 uppercase tracking-widest block mb-1.5">
                    Local backup
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExportData}
                      className="flex-1 bg-[#1a1a2e] border border-white/10 hover:border-[#d4af37]/40 text-slate-300 hover:text-[#d4af37] font-mono text-[9px] uppercase tracking-wider py-1.5 rounded cursor-pointer transition-all flex items-center justify-center gap-1"
                    >
                      <Download className="w-2.5 h-2.5" /> Export
                    </button>
                    <button
                      onClick={() => importInputRef.current?.click()}
                      className="flex-1 bg-[#1a1a2e] border border-white/10 hover:border-[#d4af37]/40 text-slate-300 hover:text-[#d4af37] font-mono text-[9px] uppercase tracking-wider py-1.5 rounded cursor-pointer transition-all flex items-center justify-center gap-1"
                    >
                      <Upload className="w-2.5 h-2.5" /> Import
                    </button>
                  </div>
                  <p className="font-mono text-[8px] text-slate-600 mt-1.5 leading-relaxed">
                    Download a JSON backup, or restore one on a new device. Import replaces this device's data.
                  </p>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={handleImportData}
                  />
                </div>
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

            {/* ⋯ More — phones only: install, reminders, theme, diagnostics */}
            <button
              onClick={() => { setIsMoreOpen((o) => !o); setIsSyncOpen(false); }}
              className={`sm:hidden p-1.5 rounded-full border bg-[#1a1a2e]/50 transition-all cursor-pointer ${
                isMoreOpen ? 'border-[#d4af37]/50 text-[#d4af37]' : 'border-white/10 text-[#e0e0e0]/70'
              }`}
              title="More"
              aria-label="More options"
              aria-expanded={isMoreOpen}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {isMoreOpen && (
              <>
                <div className="sm:hidden fixed inset-0 z-30" onClick={() => setIsMoreOpen(false)} aria-hidden />
                <div className="sm:hidden absolute top-full mt-2 right-3 w-56 bg-[#15152a] border border-[#d4af37]/30 rounded-xl shadow-2xl z-40 overflow-hidden animate-fade-in" role="menu">
                  {[
                    { icon: Download, label: 'Install app', onClick: handleInstallApp },
                    { icon: Bell, label: reminders.enabled ? 'Reminders · on' : 'Reminders', onClick: () => setIsRemindersOpen(true), active: reminders.enabled },
                    { icon: theme === 'dark' ? Sun : Moon, label: theme === 'dark' ? 'Light theme' : 'Dark theme', onClick: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
                    { icon: FlaskConical, label: 'Diagnostics', onClick: () => setIsDiagOpen(true) },
                  ].map(({ icon: Icon, label, onClick, active }) => (
                    <button
                      key={label}
                      role="menuitem"
                      onClick={() => { setIsMoreOpen(false); onClick(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left font-sans text-sm text-slate-200 hover:bg-white/5 active:bg-white/10 border-b border-white/5 last:border-b-0 cursor-pointer"
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-[#d4af37]' : 'text-slate-400'}`} />
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}

          </div>
        </div>
      </header>

      {/* CORE LAYOUT */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 mt-4 sm:mt-6">
        {/* Primary navigation — keeps each screen focused instead of stacking
            everything into one long scroll. */}
        <div className="mb-6 hidden lg:flex justify-center">
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[#15152a] p-1">
            {([
              { key: 'character', label: 'Character' },
              { key: 'quests', label: 'Quests' },
              { key: 'growth', label: 'Growth' },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setMainTab(t.key)}
                className={`rounded-full px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-all sm:px-6 sm:text-[11px] ${
                  mainTab === t.key
                    ? 'bg-[#d4af37] text-[#050510]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* =========================================================
              LEFT COLUMN (CHARACTER, LEDGER, ACHIEVEMENTS)
              order-2 on phones so it drops below the quest board.
              ========================================================= */}
          <div className={`contents lg:block lg:order-1 lg:space-y-6 ${mainTab === 'growth' ? 'lg:col-span-12' : 'lg:col-span-4'}`}>

            {/* CHARACTER CARD */}
            <div id="character-panel" className={`order-1 lg:order-none bg-[#15152a] border border-[#d4af37]/20 rounded-xl p-4 sm:p-5 shadow-[0_0_15px_rgba(212,175,55,0.05)] relative overflow-hidden ${show('character')}`}>
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
            <div id="ledger-stats-panel" className={`order-4 lg:order-none bg-[#15152a] border border-[#d4af37]/20 rounded-xl p-4 sm:p-5 shadow-[0_0_15px_rgba(212,175,55,0.05)] ${show('quests')}`}>
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

              {/* Cues resisted — only when the debuff module is in use */}
              {debuffs.length > 0 && (
                <div className="mt-2.5 flex items-center justify-between bg-[#1a1a2e] border border-emerald-500/15 rounded-md px-3 py-2">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-mono text-[16px] font-bold text-emerald-400 tabular-nums">{cuesResistedToday}</span>
                    <span className="font-mono text-[8px] text-slate-500 uppercase tracking-wider">cues resisted today</span>
                  </span>
                  {resistStreak > 0 && (
                    <span className="flex items-center gap-1 font-mono text-[10px] text-[#d4af37] shrink-0" title={`${resistStreak}-day resist streak`}>
                      <Flame className="w-3.5 h-3.5" /> {resistStreak}d
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* ACHIEVEMENTS CARD */}
            <div id="achievements-panel" className={`order-5 lg:order-none bg-[#15152a] border border-[#d4af37]/20 rounded-xl p-4 sm:p-5 shadow-[0_0_15px_rgba(212,175,55,0.05)] relative ${show('character')}`}>
              <div className="flex justify-between items-center mb-4">
                <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
                  ACHIEVEMENTS
                </span>
                <span className="font-mono text-[10px] text-[#d4af37] font-bold uppercase">
                  {unlockedAchievementsCount} / {ACHIEVEMENTS.length}
                </span>
              </div>
              <div className="h-1 bg-[#1a1a2e] rounded-full overflow-hidden mb-4 -mt-2">
                <div
                  className="h-full bg-gradient-to-r from-[#aa7c11] to-[#d4af37] rounded-full transition-all"
                  style={{ width: `${Math.round((unlockedAchievementsCount / ACHIEVEMENTS.length) * 100)}%` }}
                />
              </div>

              {/* Achievements dynamic grid list */}
              <div className="space-y-2.5 lg:space-y-3.5">
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
                    resistStreak,
                  });

                  return (
                    <div
                      key={ach.id}
                      className={`relative items-center gap-3 p-2 rounded border group ${
                        isUnlocked ? 'flex bg-[#1a1a2e]/60 border-white/5' : `${showLockedAch ? 'flex' : 'hidden lg:flex'} bg-[#0c0c1b]/40 border-white/[0.03]`
                      }`}
                    >
                      {/* Roman Numeral / Custom Icon Circle */}
                      <div
                        className={`w-7 h-7 rounded-full border flex items-center justify-center font-mono text-[9px] font-bold shadow-md transition-all ${
                          isUnlocked
                            ? 'border-[#d4af37]/50 bg-[#d4af37]/10 text-[#d4af37]'
                            : 'border-white/5 bg-[#050510]/50 text-slate-600'
                        }`}
                      >
                        {isUnlocked ? ach.numIcon || 'I' : <Lock className="w-3 h-3" aria-label="Locked" />}
                      </div>

                      {/* Title & Criteria */}
                      <div className="flex-1 text-left">
                        <h4
                          className={`font-sans text-[11px] font-semibold transition-colors duration-200 ${
                            isUnlocked ? 'text-slate-200' : 'text-slate-500'
                          }`}
                        >
                          {ach.title}
                        </h4>
                        <p className={`font-sans text-[9px] leading-normal ${isUnlocked ? 'text-slate-500' : 'text-slate-600'}`}>
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
              {unlockedAchievementsCount < ACHIEVEMENTS.length && (
                <button
                  type="button"
                  onClick={() => setShowLockedAch((v) => !v)}
                  className="lg:hidden mt-3 w-full border border-white/5 hover:border-[#d4af37]/30 rounded-lg py-2.5 font-mono text-[9px] uppercase tracking-wider text-slate-400 hover:text-[#d4af37] transition-colors cursor-pointer"
                >
                  {showLockedAch ? 'Hide locked' : `Show ${ACHIEVEMENTS.length - unlockedAchievementsCount} locked`}
                </button>
              )}
            </div>

            {/* DEBUFFS PANEL — addiction interruption */}
            <div className={`order-6 lg:order-none ${show('growth')}`}>
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
            </div>

            {/* TRAITS PANEL — the slow reshaping of personality */}
            <div className={`order-7 lg:order-none ${show('growth')}`}>
              <TraitPanel
                traitGoals={traitGoals}
                quests={quests}
                currentDate={currentMockDate}
                onAddGoal={handleAddTraitGoal}
                onUpdateGoal={handleUpdateTraitGoal}
                onDeleteGoal={handleDeleteTraitGoal}
                onAddCheckin={handleAddTraitCheckin}
                onAddQuest={handleAddQuest}
                showToast={showToast}
              />
            </div>

          </div>

          {/* =========================================================
              RIGHT COLUMN (QUEST LOG, BALANCE, CHRONICLE)
              order-1 on phones so the quest board leads the page.
              ========================================================= */}
          <div className={`${mainTab === 'growth' ? 'hidden' : 'contents lg:block'} lg:order-2 lg:col-span-8 lg:space-y-6`}>

            {/* QUEST LOG CARD */}
            <div id="quest-log-card" className={`${dayPhase === 'day' ? 'order-3' : 'order-first'} lg:order-none bg-[#15152a] border border-[#d4af37]/20 rounded-xl p-4 sm:p-6 shadow-[0_0_15px_rgba(212,175,55,0.05)] relative ${show('quests')}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-5 sm:mb-6 border-b border-white/5 pb-3">
                <div className="min-w-0">
                  <h2 className="font-serif text-base sm:text-lg font-bold text-[#d4af37] uppercase tracking-widest whitespace-nowrap">
                    {questViewMode === 'list' ? 'QUEST LOG' : questViewMode === 'paths' ? 'MY PATHS' : 'TASK SKILL TREE'}
                  </h2>
                  <p className="font-mono text-[9px] text-slate-500 uppercase mt-0.5">
                    {questViewMode === 'list' ? 'Your Current Habits and Milestones' : questViewMode === 'paths' ? 'Skill Trees Forged by Your Hand' : 'Path of Progression'}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:justify-end">
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
                  {/* View switch — full-width segmented control on phones */}
                  <div role="tablist" aria-label="Quest view" className="order-first sm:order-none w-full sm:w-auto grid grid-cols-3 sm:flex items-center bg-[#1a1a2e] rounded-lg sm:rounded border border-white/5 p-1">
                    <button
                      role="tab"
                      aria-selected={questViewMode === 'tree'}
                      onClick={() => setQuestViewMode('tree')}
                      className={`px-3 py-1.5 sm:py-1 text-[10px] font-mono rounded transition-all cursor-pointer ${
                        questViewMode === 'tree' ? 'bg-white/10 text-[#d4af37]' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      TREE
                    </button>
                    <button
                      role="tab"
                      aria-selected={questViewMode === 'paths'}
                      onClick={() => setQuestViewMode('paths')}
                      className={`px-3 py-1.5 sm:py-1 text-[10px] font-mono rounded transition-all cursor-pointer ${
                        questViewMode === 'paths' ? 'bg-white/10 text-[#d4af37]' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      PATHS
                    </button>
                    <button
                      role="tab"
                      aria-selected={questViewMode === 'list'}
                      onClick={() => setQuestViewMode('list')}
                      className={`px-3 py-1.5 sm:py-1 text-[10px] font-mono rounded transition-all cursor-pointer ${
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

              {/* DAY / NIGHT RITUALS — shown above both views so the active
                  ritual is front-and-center: Dawn before 9 AM, Campfire after 8 PM. */}
              {(() => {
                const dawn = (
                  <DawnRitual key="dawn" quests={dawnQuests} ledger={ledger} currentDate={currentMockDate} phase={dayPhase} userClass={userClass} isLoggedToday={isLoggedToday} onToggle={handleToggleCheckCircle} onAddStep={(t) => handleAddRitualStep('dawn', t)} onDeleteStep={handleDeleteQuest} />
                );
                const camp = (
                  <Campfire key="campfire" quests={campfireQuests} currentDate={currentMockDate} phase={dayPhase} userClass={userClass} isLoggedToday={isLoggedToday} onToggle={handleToggleCheckCircle} todaysReflection={todaysReflection} onReflect={handleReflect} onAddStep={(t) => handleAddRitualStep('campfire', t)} onDeleteStep={handleDeleteQuest} />
                );
                return dayPhase === 'campfire' ? [camp, dawn] : [dawn, camp];
              })()}

              {questViewMode === 'tree' ? (
                <TaskSkillTree
                  onAddQuest={handleAddQuest}
                  onLoadSeason={handleLoadSeason}
                  masteredTitles={masteredTitles}
                  activeTitles={activeTitles}
                />
              ) : questViewMode === 'paths' ? (
                <PathsView
                  paths={customPaths}
                  masteredNodeIds={masteredNodeIds}
                  activeNodeIds={activeNodeIds}
                  onAddQuest={handleAddQuest}
                  onForge={() => { setEditingPath(null); setIsForgeOpen(true); }}
                  onEdit={(p) => { setEditingPath(p); setIsForgeOpen(true); }}
                  onImportPaths={handleImportPaths}
                  userClass={userClass}
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

              {/* DAILY QUESTS CONTAINER — dimmed at the Campfire so the day's
                  unfinished quests recede while you wind down. */}
              <div className={`space-y-4 mb-8 transition-opacity duration-500 ${dayPhase === 'campfire' ? 'opacity-50' : ''}`}>
                <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                  <h3 className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    DAILY QUESTS
                  </h3>
                  <span className="font-mono text-[9px] text-slate-500 uppercase">
                    {countDaytimeClearedToday} of {daytimeDailies.length} cleared today
                  </span>
                </div>

                {daytimeDailies.length === 0 ? (
                  <p className="font-mono text-[10px] text-slate-600 py-2">No standing daily quests. Click "+ Add a Quest" to establish one!</p>
                ) : (
                  <div className="space-y-3">
                    {daytimeDailies.map((q) => {
                      const completedToday = isLoggedToday(q.id);
                      const config = STATS[q.stat];
                      const streak = getQuestStreak(q);
                      const baseChanceXp = calculateQuestXp(q.difficulty, q.type, q.stat, userClass);
                      const todayIsMin = ledger.some((e) => e.questId === q.id && e.date === currentMockDate && e.kind === 'minimum');

                      return (
                        <div
                          key={q.id}
                          className={`flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border transition-all ${
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
                            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-1 font-mono text-[9px] text-slate-500 uppercase">
                              {renderAutoState(q)}
                              <span className="font-bold" style={{ color: config.color }}>{config.name}</span>
                              <span className="meta-sep">{baseChanceXp} XP</span>
                              <span className="meta-sep">{q.difficulty}</span>
                              {streak > 0 && (
                                <>
                                  <span className="meta-sep text-[#d4af37]/90 flex items-center gap-0.5 lowercase font-bold">
                                    <Flame className="w-2.5 h-2.5" /> {streak} {streak === 1 ? 'day' : 'days'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Right: edit + delete actions — stacked on phones to give the text room */}
                          <div className="flex flex-col sm:flex-row items-center -mr-1 sm:mr-0 shrink-0">
                            <button
                              onClick={() => setEditingQuest(q)}
                              className="p-1.5 text-slate-600 hover:text-[#d4af37] transition-colors cursor-pointer"
                              title="Edit Quest"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteQuest(q.id)}
                              className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Abandon Quest"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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
                          className={`flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border transition-all ${
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
                            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-1 font-mono text-[9px] text-slate-500 uppercase">
                              {renderAutoState(q)}
                              <span className="font-bold" style={{ color: config.color }}>{config.name}</span>
                              <span className="meta-sep">{baseChanceXp} XP</span>
                              <span className="meta-sep">{q.difficulty}</span>
                              <span className={`meta-sep ${currentWeekCount >= q.target ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                                {currentWeekCount} of {q.target} this week
                              </span>
                              {streak > 0 && (
                                <>
                                  <span className="meta-sep text-[#d4af37]/90 flex items-center gap-0.5 lowercase font-bold">
                                    <Flame className="w-2.5 h-2.5" /> {streak} {streak === 1 ? 'week' : 'weeks'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Right: edit + delete actions — stacked on phones to give the text room */}
                          <div className="flex flex-col sm:flex-row items-center -mr-1 sm:mr-0 shrink-0">
                            <button
                              onClick={() => setEditingQuest(q)}
                              className="p-1.5 text-slate-600 hover:text-[#d4af37] transition-colors cursor-pointer"
                              title="Edit Quest"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteQuest(q.id)}
                              className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Abandon Quest"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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
                          className={`flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border transition-all ${
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
                            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-1 font-mono text-[9px] text-slate-500 uppercase">
                              {renderAutoState(q)}
                              <span className="font-bold" style={{ color: config.color }}>{config.name}</span>
                              <span className="meta-sep">{baseChanceXp} XP</span>
                              <span className="meta-sep">{q.difficulty}</span>
                              {cleared && (
                                <>
                                  <span className="meta-sep text-[#d4af37]/80 font-bold lowercase">
                                    ◆ cleared
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Right: edit + delete actions — stacked on phones to give the text room */}
                          <div className="flex flex-col sm:flex-row items-center -mr-1 sm:mr-0 shrink-0">
                            <button
                              onClick={() => setEditingQuest(q)}
                              className="p-1.5 text-slate-600 hover:text-[#d4af37] transition-colors cursor-pointer"
                              title="Edit Quest"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteQuest(q.id)}
                              className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Abandon Quest"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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
            <div id="balance-panel" className={`order-2 lg:order-none bg-[#15152a] border border-[#d4af37]/20 rounded-xl p-4 sm:p-6 shadow-[0_0_15px_rgba(212,175,55,0.05)] ${show('character')}`}>
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
            <div className={`order-8 lg:order-none ${show('character')}`}>
              <Chronicle ledger={ledger} todayStr={currentMockDate} />
            </div>

          </div>
        </div>
      </main>

      {/* FOOTER CODA */}
      <footer className="mt-16 text-center border-t border-white/5 pt-6 font-mono text-[9px] text-slate-600 uppercase select-none">
        <p>Every shaded day holds the memory of your discipline.</p>
        <p className="mt-1 text-[8px] text-slate-700">Habit Quest © 2026 · Local-First RPG Ledger System</p>
      </footer>

      {/* ADD QUEST OVERLAY MODAL — mounted only while open so its chunk is lazy */}
      {(isAddQuestOpen || editingQuest) && (
        <Suspense fallback={null}>
          <AddQuestModal
            isOpen={true}
            editQuest={editingQuest ?? undefined}
            onClose={() => {
              setIsAddQuestOpen(false);
              setEditingQuest(null);
            }}
            onAdd={handleAddQuest}
            onUpdate={handleUpdateQuest}
            userClass={userClass}
          />
        </Suspense>
      )}

      {isForgeOpen && (
        <Suspense fallback={null}>
          <ForgePathModal
            editing={editingPath ?? undefined}
            masteredNodeIds={masteredNodeIds}
            defaultStat={CLASSES[userClass].bonusStat}
            onSave={handleSavePath}
            onDelete={handleDeletePath}
            onClose={() => { setIsForgeOpen(false); setEditingPath(null); }}
          />
        </Suspense>
      )}

      <RemindersModal
        isOpen={isRemindersOpen}
        onClose={() => setIsRemindersOpen(false)}
        settings={reminders}
        onChange={setReminders}
      />

      {/* EDIT CHARACTER OVERLAY MODAL */}
      {isEditingCharacter && (
        <div className="fixed inset-0 bg-[#050510]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* MAIN CARD */}
          <div className="w-full max-w-xl bg-[#15152a] border border-[#d4af37]/20 rounded-2xl p-5 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.08)] animate-fade-in">
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
                    className={`sm:col-span-2 p-4 rounded-lg border transition-all cursor-pointer bg-[#101020]/60 text-left sm:text-center ${
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

      {/* DEVELOPER SANCTUM DIAGNOSTICS & CONTROL PANEL — desktop: the flask
          button as before; phones: opened from the ⋯ menu as a sheet so no
          floating button sits on top of content. */}
      <div className="hidden lg:block">
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
      {isDiagOpen && (
        <div className="lg:hidden fixed right-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50">
          <DiagnosticsPanel
            open
            onOpenChange={setIsDiagOpen}
            hideTrigger
            currentMockDate={currentMockDate}
            onSetMockDate={(d) => setCurrentMockDate(d)}
            onResetToMockup={loadMockupState}
            onHardReset={handleHardReset}
            onAddFreeXp={handleAddFreeXp}
            onAdvanceDay={handleAdvanceDay}
            onAdvanceWeek={handleAdvanceWeek}
          />
        </div>
      )}

      {/* PHONE TAB BAR — native-style primary navigation, thumb-reachable and
          always visible. The desktop keeps the pill at the top of the page. */}
      <nav
        aria-label="Primary"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#d4af37]/20 bg-[#0d0d1f]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-3 max-w-md mx-auto">
          {([
            { key: 'character', label: 'Character', icon: UserRound },
            { key: 'quests', label: 'Quests', icon: Swords },
            { key: 'growth', label: 'Growth', icon: Sprout },
          ] as const).map(({ key, label, icon: Icon }) => {
            const active = mainTab === key;
            return (
              <button
                key={key}
                onClick={() => {
                  if (active) window.scrollTo({ top: 0, behavior: 'smooth' });
                  else { setMainTab(key); window.scrollTo({ top: 0 }); }
                }}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 pt-2.5 pb-2 min-h-[56px] transition-colors cursor-pointer ${
                  active ? 'text-[#d4af37]' : 'text-slate-500 active:text-slate-300'
                }`}
              >
                <span className={`absolute top-0 h-0.5 w-10 rounded-full transition-all ${active ? 'bg-[#d4af37]' : 'bg-transparent'}`} />
                <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.8} />
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
