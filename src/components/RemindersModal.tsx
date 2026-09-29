/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Bell, BellOff } from 'lucide-react';
import {
  ReminderSettings,
  ReminderKey,
  REMINDER_KEYS,
  REMINDER_META,
} from '../utils/reminders';

interface RemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReminderSettings;
  onChange: (next: ReminderSettings) => void;
}

type Permission = 'default' | 'granted' | 'denied' | 'unsupported';

function currentPermission(): Permission {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission as Permission;
}

export default function RemindersModal({ isOpen, onClose, settings, onChange }: RemindersModalProps) {
  const [permission, setPermission] = useState<Permission>(currentPermission());

  if (!isOpen) return null;

  const setKey = (key: ReminderKey, patch: Partial<ReminderSettings[ReminderKey]>) => {
    onChange({ ...settings, [key]: { ...settings[key], ...patch } });
  };

  const enable = async () => {
    if (permission === 'unsupported') return;
    let perm: Permission = permission;
    if (perm === 'default') {
      perm = (await Notification.requestPermission()) as Permission;
      setPermission(perm);
    }
    if (perm === 'granted') {
      onChange({ ...settings, enabled: true });
    }
  };

  const disable = () => onChange({ ...settings, enabled: false });

  const on = settings.enabled && permission === 'granted';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#050510]/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#d4af37]/20 bg-[#15152a] p-6 shadow-[0_0_50px_rgba(212,175,55,0.08)] animate-fade-in sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-serif text-lg font-bold uppercase tracking-widest text-[#d4af37]">
            <Bell className="h-4 w-4" /> Reminders
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-500 transition-colors hover:text-[#d4af37]" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Master switch / permission */}
        {permission === 'unsupported' ? (
          <p className="rounded-lg border border-white/5 bg-[#1a1a2e] p-3 font-mono text-[11px] leading-relaxed text-slate-400">
            This browser doesn't support notifications.
          </p>
        ) : permission === 'denied' ? (
          <p className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 font-mono text-[11px] leading-relaxed text-rose-300">
            Notifications are blocked for this site. Enable them in your browser's site settings, then reopen this panel.
          </p>
        ) : !on ? (
          <button
            onClick={enable}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#aa7c11] to-[#d4af37] px-4 py-3 font-sans text-xs font-bold uppercase tracking-widest text-[#050510] shadow-lg transition-all hover:from-[#d4af37] hover:to-[#f3e5ab]"
          >
            <Bell className="h-3.5 w-3.5" /> Turn on reminders
          </button>
        ) : (
          <button
            onClick={disable}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#1a1a2e] px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-300 transition-all hover:border-rose-500/30 hover:text-rose-300"
          >
            <BellOff className="h-3.5 w-3.5" /> Turn reminders off
          </button>
        )}

        {/* Per-reminder rows */}
        <div className={`mt-5 space-y-3 transition-opacity ${on ? '' : 'pointer-events-none opacity-40'}`}>
          {REMINDER_KEYS.map((key) => {
            const cfg = settings[key];
            const meta = REMINDER_META[key];
            return (
              <div key={key} className="rounded-lg border border-white/5 bg-[#1a1a2e] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#e0e0e0]">
                      {meta.label}
                    </p>
                    <p className="mt-0.5 font-mono text-[9px] leading-relaxed text-slate-500">{meta.hint}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <input
                      type="time"
                      value={cfg.time}
                      onChange={(e) => setKey(key, { time: e.target.value })}
                      disabled={!cfg.on}
                      className="rounded-md border border-white/10 bg-[#050510] px-2 py-1 font-mono text-xs text-slate-200 outline-none focus:border-[#d4af37]/40 disabled:opacity-40"
                    />
                    <button
                      onClick={() => setKey(key, { on: !cfg.on })}
                      role="switch"
                      aria-checked={cfg.on}
                      aria-label={`Toggle ${meta.label}`}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                        cfg.on ? 'bg-[#d4af37]' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-[#050510] transition-all ${
                          cfg.on ? 'left-[18px]' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-4 font-mono text-[9px] leading-relaxed text-slate-500">
          Reminders fire while Habit Quest is open or running in the background. For alerts when the app is
          fully closed, install it to your home screen — and full closed-app push is a planned follow-up.
        </p>
      </div>
    </div>
  );
}
