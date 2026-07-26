/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface Props {
  children: React.ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Catches render-time crashes so a single bad component can't white-screen the
 * whole PWA. Offers a reload and a way to export or wipe a possibly-corrupt
 * save, since bad persisted data is the most likely cause in an offline-first
 * app.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep a breadcrumb for debugging; there's no remote logger wired up.
    console.error('Uncaught render error:', error, info.componentStack);
  }

  private exportSave = () => {
    try {
      const raw = localStorage.getItem('habitquest:save:v1');
      if (!raw) return;
      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `habitquest-save-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore — best-effort backup */
    }
  };

  private wipeAndReload = () => {
    try {
      localStorage.removeItem('habitquest:save:v1');
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-[#050510] text-slate-200 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#15152a] border border-rose-500/25 rounded-xl p-6 text-center">
          <h1 className="font-serif text-xl font-bold text-[#d4af37] mb-2">Something broke</h1>
          <p className="font-sans text-sm text-slate-400 leading-relaxed mb-4">
            The app hit an error it couldn't recover from. Your progress is saved locally — you can back it up before
            trying anything, and a reload usually fixes it.
          </p>
          <p className="font-mono text-[10px] text-rose-300/80 bg-[#0c0c1b] border border-white/5 rounded p-2 mb-4 break-words text-left">
            {this.state.error.message || 'Unknown error'}
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full bg-gradient-to-r from-[#aa7c11] to-[#d4af37] text-[#050510] font-mono text-[10px] font-bold uppercase tracking-wider py-2 rounded"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={this.exportSave}
              className="w-full border border-white/10 hover:border-[#d4af37]/40 text-slate-300 hover:text-[#d4af37] font-mono text-[10px] uppercase tracking-wider py-2 rounded transition-all"
            >
              Back up my save
            </button>
            <button
              type="button"
              onClick={this.wipeAndReload}
              className="w-full border border-white/10 hover:border-rose-500/40 text-slate-500 hover:text-rose-400 font-mono text-[10px] uppercase tracking-wider py-2 rounded transition-all"
            >
              Wipe save &amp; restart
            </button>
          </div>
        </div>
      </div>
    );
  }
}
