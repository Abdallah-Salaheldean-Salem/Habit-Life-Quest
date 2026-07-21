/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Terminal, Settings, RefreshCw, Plus, Clock, Sparkles, Check, AlertTriangle, ChevronRight, HelpCircle } from 'lucide-react';
import { runDiagnostics, TestResult } from '../utils/logic';

interface DiagnosticsPanelProps {
  currentMockDate: string;
  onSetMockDate: (date: string) => void;
  onResetToMockup: () => void;
  onHardReset: () => void;
  onAddFreeXp: (xp: number) => void;
  onAdvanceDay: () => void;
  onAdvanceWeek: () => void;
}

export default function DiagnosticsPanel({
  currentMockDate,
  onSetMockDate,
  onResetToMockup,
  onHardReset,
  onAddFreeXp,
  onAdvanceDay,
  onAdvanceWeek,
}: DiagnosticsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [activeTab, setActiveTab] = useState<'tools' | 'tests'>('tools');

  const handleRunTests = () => {
    const results = runDiagnostics();
    setTestResults(results);
  };

  const numPassed = testResults ? testResults.filter((r) => r.passed).length : 0;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#15152a] border border-[#d4af37]/30 hover:border-[#d4af37]/60 hover:text-[#d4af37] text-slate-300 p-2.5 rounded-full shadow-2xl flex items-center gap-2 cursor-pointer transition-all"
        title="Adventure Diagnostics"
      >
        <Terminal className="w-5 h-5" />
        <span className="font-mono text-xs font-semibold uppercase pr-1.5 hidden sm:inline">
          Developer Sanctum
        </span>
        {testResults && (
          <span className={`w-2.5 h-2.5 rounded-full ${numPassed === 24 ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
        )}
      </button>

      {/* Panel overlay */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-[#15152a] border-l border-[#d4af37]/20 shadow-2xl flex flex-col z-50 animate-slide-in">
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#1a1a2e]">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-[#d4af37]" />
              <h3 className="font-serif text-xs font-bold text-[#d4af37] uppercase tracking-widest">
                Developer Sanctum
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 font-mono text-[10px] uppercase border border-white/10 hover:border-[#d4af37]/30 rounded py-1 px-2 cursor-pointer"
            >
              Close
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/5 bg-[#101020]">
            <button
              onClick={() => setActiveTab('tools')}
              className={`flex-1 py-2 font-mono text-[10px] uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                activeTab === 'tools'
                  ? 'border-[#d4af37] text-[#d4af37] bg-[#1a1a2e]'
                  : 'border-transparent text-slate-500 hover:text-slate-400'
              }`}
            >
              Temporal Tools
            </button>
            <button
              onClick={() => setActiveTab('tests')}
              className={`flex-1 py-2 font-mono text-[10px] uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                activeTab === 'tests'
                  ? 'border-[#d4af37] text-[#d4af37] bg-[#1a1a2e]'
                  : 'border-transparent text-slate-500 hover:text-slate-400'
              }`}
            >
              Test Suite ({testResults ? `${numPassed}/24` : 'Run'})
            </button>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {activeTab === 'tools' ? (
              <div className="space-y-5">
                {/* Section 1: Mock Date Control */}
                <div className="space-y-2 bg-[#1a1a2e] border border-white/5 rounded-lg p-3.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-4 h-4 text-[#d4af37]" />
                    <h4 className="font-mono text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                      Chronos (Temporal Control)
                    </h4>
                  </div>
                  <p className="font-sans text-[10px] text-slate-400 leading-relaxed">
                    Time travel forward to test how streaks survive or break once a day or week rollovers!
                  </p>

                  <div className="space-y-2.5 pt-1.5">
                    <div>
                      <span className="font-mono text-[9px] text-slate-500 uppercase block mb-1">
                        Current Mock Date
                      </span>
                      <input
                        type="date"
                        value={currentMockDate}
                        onChange={(e) => onSetMockDate(e.target.value)}
                        className="w-full bg-[#15152a] border border-white/5 focus:border-[#d4af37]/40 rounded-md py-1.5 px-3 text-xs font-mono text-slate-200 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={onAdvanceDay}
                        className="bg-[#101020] border border-white/5 hover:border-[#d4af37]/30 text-slate-300 font-mono text-[9px] uppercase tracking-wider py-1.5 rounded cursor-pointer transition-all text-center"
                      >
                        +1 Day Forward
                      </button>
                      <button
                        onClick={onAdvanceWeek}
                        className="bg-[#101020] border border-white/5 hover:border-[#d4af37]/30 text-slate-300 font-mono text-[9px] uppercase tracking-wider py-1.5 rounded cursor-pointer transition-all text-center"
                      >
                        +1 Week Forward
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 2: XP Injector */}
                <div className="space-y-2 bg-[#1a1a2e] border border-white/5 rounded-lg p-3.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-mono text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                      Astral XP Infusion
                    </h4>
                  </div>
                  <p className="font-sans text-[10px] text-slate-400 leading-relaxed">
                    Instantly grant free XP to test level thresholds, ranks, and see titles adapt!
                  </p>
                  <div className="grid grid-cols-3 gap-2 pt-1.5">
                    <button
                      onClick={() => onAddFreeXp(50)}
                      className="bg-[#15152a] border border-white/5 hover:border-emerald-500/30 text-emerald-400 font-mono text-[9px] py-1.5 rounded cursor-pointer transition-all"
                    >
                      +50 XP
                    </button>
                    <button
                      onClick={() => onAddFreeXp(250)}
                      className="bg-[#15152a] border border-white/5 hover:border-emerald-500/30 text-emerald-400 font-mono text-[9px] py-1.5 rounded cursor-pointer transition-all"
                    >
                      +250 XP
                    </button>
                    <button
                      onClick={() => onAddFreeXp(1000)}
                      className="bg-[#15152a] border border-white/5 hover:border-emerald-500/30 text-emerald-400 font-mono text-[9px] py-1.5 rounded cursor-pointer transition-all"
                    >
                      +1k XP
                    </button>
                  </div>
                </div>

                {/* Section 3: Reset options */}
                <div className="space-y-2 bg-[#1a1a2e] border border-white/5 rounded-lg p-3.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <RefreshCw className="w-4 h-4 text-[#d4af37]" />
                    <h4 className="font-mono text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                      Fate Reset & Mockup
                    </h4>
                  </div>
                  <p className="font-sans text-[10px] text-slate-400 leading-relaxed mb-2">
                    Restore the state exactly as shown in the original Habit Quest design mockup!
                  </p>
                  <button
                    onClick={onResetToMockup}
                    className="w-full bg-[#d4af37]/10 border border-[#d4af37]/30 hover:bg-[#d4af37]/20 text-[#d4af37] font-serif text-[10px] uppercase tracking-wider py-2 rounded cursor-pointer transition-all mb-2"
                  >
                    Restore Original Mockup State
                  </button>

                  <div className="w-full h-px bg-white/10 my-2" />

                  <p className="font-sans text-[10px] text-slate-400 leading-relaxed mb-2">
                    Completely wipe all save data and start from scratch.
                  </p>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to completely wipe your save data? This cannot be undone.')) {
                        onHardReset();
                      }
                    }}
                    className="w-full bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 font-serif text-[10px] uppercase tracking-wider py-2 rounded cursor-pointer transition-all"
                  >
                    Wipe Save Data (Hard Reset)
                  </button>
                </div>
              </div>
            ) : (
              // Test Results Tab
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-[#1a1a2e] p-3 rounded-lg border border-white/5">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 uppercase">
                      Automated Tests
                    </span>
                    <h4 className="font-serif text-xs font-bold text-slate-200 uppercase tracking-wide mt-0.5">
                      Pure Logic Diagnostics
                    </h4>
                  </div>
                  <button
                    onClick={handleRunTests}
                    className="bg-[#d4af37] hover:bg-[#f3e5ab] text-slate-950 font-mono text-[10px] font-bold uppercase py-1.5 px-3 rounded cursor-pointer transition-all"
                  >
                    Execute Tests
                  </button>
                </div>

                {testResults ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2.5 bg-[#101020] rounded border border-white/5">
                      <span className="font-mono text-[9px] text-slate-400 uppercase">
                        Diagnostics Verdict:
                      </span>
                      <span className={`font-mono text-[10px] font-bold uppercase ${numPassed === 24 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {numPassed === 24 ? 'PASS - 24/24 GREEN' : `${numPassed}/24 PASSED`}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {testResults.map((result) => (
                        <div
                          key={result.id}
                          className="flex items-start justify-between p-2 bg-[#1a1a2e]/60 rounded border border-white/5 font-mono text-[9px] leading-relaxed"
                        >
                          <div className="space-y-0.5">
                            <span className="text-slate-500 block text-[8px] uppercase">
                              {result.category}
                            </span>
                            <span className="text-slate-200 font-medium">
                              {result.name}
                            </span>
                            {result.error && (
                              <span className="text-rose-400 block text-[8px] mt-0.5 font-sans leading-normal bg-rose-900/10 p-1 rounded">
                                Error: {result.error}
                              </span>
                            )}
                          </div>
                          <div>
                            {result.passed ? (
                              <span className="text-emerald-400 bg-emerald-500/10 p-0.5 px-1 rounded flex items-center gap-0.5 font-bold text-[8px]">
                                <Check className="w-2.5 h-2.5" /> OK
                              </span>
                            ) : (
                              <span className="text-rose-400 bg-rose-500/10 p-0.5 px-1 rounded flex items-center gap-0.5 font-bold text-[8px]">
                                <AlertTriangle className="w-2.5 h-2.5 animate-pulse" /> FAIL
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 bg-[#1a1a2e]/40 border border-dashed border-white/5 rounded-lg">
                    <HelpCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-mono text-[10px] text-slate-500 uppercase">
                      No logs compiled. Click Execute to query the test chamber.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-3.5 bg-[#101020] border-t border-white/5 text-center">
            <span className="font-mono text-[8px] text-slate-600 uppercase">
              Habit Quest VM v4.0.2 · 24 assertions
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
