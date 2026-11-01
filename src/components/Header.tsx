import React from 'react';
import { Sparkles, Sun, Moon, Play, Zap } from 'lucide-react';

interface HeaderProps {
  activeTab: 'workbench' | 'learner' | 'recipes' | 'integrations';
  setActiveTab: (tab: 'workbench' | 'learner' | 'recipes' | 'integrations') => void;
  darkMode: boolean;
  setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  onOpenBatchDrawer: () => void;
  todayProcessedCount: number;
  timeSavedMinutes: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  onOpenBatchDrawer,
  todayProcessedCount,
  timeSavedMinutes,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('workbench')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm transition-transform group-hover:scale-105">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap block">
                AutoEntry AI
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-normal block whitespace-nowrap">
                Adaptive Data Automation
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('workbench')}
            className={`px-3.5 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'workbench'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            Data Workbench
          </button>
          <button
            onClick={() => setActiveTab('learner')}
            className={`px-3.5 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'learner'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Pattern Learner
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`px-3.5 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'recipes'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            Recipes &amp; Memory
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`px-3.5 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'integrations'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            Integrations
          </button>
        </nav>

        {/* Zone 3: Primary Action & Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Daily Metric badge */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700/60 font-mono tabular-nums">
            <span>{todayProcessedCount} entries</span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">~{timeSavedMinutes}m saved</span>
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(prev => !prev)}
            aria-label="Toggle theme"
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Primary CTA */}
          <button
            onClick={onOpenBatchDrawer}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Process Batch
          </button>
        </div>
      </div>
    </header>
  );
};
