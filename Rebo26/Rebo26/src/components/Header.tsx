/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Sun, Moon, Database, FileText, BarChart3, GraduationCap } from 'lucide-react';
import { ResearchProject } from '../types';

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  activeProject: ResearchProject | null;
  totalProjects: number;
}

export default function Header({ darkMode, setDarkMode, activeProject, totalProjects }: HeaderProps) {
  // Count total files and manual entries in all projects (or just active one)
  const fileCount = activeProject?.files.length || 0;
  const entryCount = activeProject?.dataEntries.length || 0;

  return (
    <header className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo and Brand */}
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="font-display font-bold tracking-tight text-base text-slate-700 dark:text-slate-100 flex items-center gap-1.5">
              rebo
              <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-300 dark:border-slate-700">
                v1.2
              </span>
            </span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
              Your Premium AI-Powered Scholarly Advisor
            </p>
          </div>
        </div>

        {/* Dashboard quick stats for the active project */}
        {activeProject && (
          <div className="hidden md:flex items-center space-x-6 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span>
                Datasets: <strong className="text-slate-800 dark:text-slate-200">{fileCount}</strong>
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Database className="w-4 h-4 text-emerald-500" />
              <span>
                Manual Notes: <strong className="text-slate-800 dark:text-slate-200">{entryCount}</strong>
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <span>
                Status:{' '}
                <strong className={`px-2 py-0.5 rounded-full text-[10px] ${activeProject.analysis ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'}`}>
                  {activeProject.analysis ? 'Analyzed' : 'Awaiting Data'}
                </strong>
              </span>
            </div>
          </div>
        )}

        {/* Theme and Actions */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            id="theme-toggle-btn"
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer border border-slate-200/40 dark:border-slate-800/40"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
          </button>
        </div>

      </div>
    </header>
  );
}
