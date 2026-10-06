/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, Sparkles, MessageSquare, Database, FolderPlus, 
  HelpCircle, ChevronRight, GraduationCap, AlertCircle, Info, BarChart3
} from 'lucide-react';
import { ResearchProject, ResearchFile, ManualDataEntry, ChatMessage, ProjectAnalysis } from './types';
import { getProjects, saveProject, deleteProject, getProject } from './lib/db';
import Header from './components/Header';
import ProjectList from './components/ProjectList';
import DataManager from './components/DataManager';
import StatsViewer from './components/StatsViewer';
import AnalysisViewer from './components/AnalysisViewer';
import ChatBox from './components/ChatBox';
import { UserManual } from './components/UserManual';
import DownloadPage from './components/DownloadPage';

function ResearchApp() {
  const [darkMode, setDarkMode] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'datasets' | 'stats' | 'analysis' | 'chat'>('datasets');

  useEffect(() => {
    const hasShown = localStorage.getItem('rebo_manual_shown');
    if (!hasShown) {
      setShowManual(true);
    }
  }, []);

  const handleCloseManual = () => {
    localStorage.setItem('rebo_manual_shown', 'true');
    setShowManual(false);
  };

  // Apply dark/light theme to document element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Load projects from IndexedDB on startup
  useEffect(() => {
    async function loadInitialData() {
      try {
        const loaded = await getProjects();
        setProjects(loaded);
        if (loaded.length > 0) {
          setActiveProjectId(loaded[0].id);
        }
      } catch (err) {
        console.error('IndexedDB failed to initialize:', err);
      }
    }
    loadInitialData();
  }, []);

  // Get active project structure
  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  const handleSelectProject = (id: string) => {
    setActiveProjectId(id);
  };

  const handleCreateProject = async (name: string, description: string) => {
    const newProj: ResearchProject = {
      id: Math.random().toString(),
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      files: [],
      dataEntries: [],
      analysis: null,
      chatHistory: []
    };

    try {
      await saveProject(newProj);
      const updated = await getProjects();
      setProjects(updated);
      setActiveProjectId(newProj.id);
      setActiveTab('datasets'); // Focus datasets upload initially
    } catch (err) {
      alert('Failed to save new project.');
    }
  };

  const handleRenameProject = async (id: string, newName: string) => {
    const target = projects.find(p => p.id === id);
    if (!target) return;

    const updatedProj: ResearchProject = {
      ...target,
      name: newName,
      updatedAt: new Date().toISOString()
    };

    try {
      await saveProject(updatedProj);
      const updatedList = await getProjects();
      setProjects(updatedList);
    } catch (err) {
      alert('Failed to rename project.');
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProject(id);
      const updatedList = await getProjects();
      setProjects(updatedList);
      
      if (activeProjectId === id) {
        setActiveProjectId(updatedList[0]?.id || null);
      }
    } catch (err) {
      alert('Failed to delete project.');
    }
  };

  const handleDuplicateProject = async (id: string) => {
    const target = projects.find(p => p.id === id);
    if (!target) return;

    const duplicatedProj: ResearchProject = {
      ...target,
      id: Math.random().toString(),
      name: `${target.name} - Copy`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await saveProject(duplicatedProj);
      const updatedList = await getProjects();
      setProjects(updatedList);
      setActiveProjectId(duplicatedProj.id);
    } catch (err) {
      alert('Failed to duplicate project.');
    }
  };

  const handleExportProject = (id: string) => {
    const target = projects.find(p => p.id === id);
    if (!target) return;

    // Export entire project backup as a clean downloadable JSON file
    const jsonStr = JSON.stringify(target, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${target.name.replace(/\s+/g, '_')}_backup.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportProject = async (project: ResearchProject) => {
    // Generate new unique ID for safety
    const importedProj: ResearchProject = {
      ...project,
      id: Math.random().toString(),
      name: `${project.name} (Imported)`,
      updatedAt: new Date().toISOString()
    };

    try {
      await saveProject(importedProj);
      const updatedList = await getProjects();
      setProjects(updatedList);
      setActiveProjectId(importedProj.id);
    } catch (err) {
      alert('Failed to import backup project file.');
    }
  };

  // Active Project Mutators
  const handleAddFile = async (fileData: Omit<ResearchFile, 'id' | 'uploadedAt'>): Promise<ResearchFile | undefined> => {
    if (!activeProject) return undefined;

    const newFile: ResearchFile = {
      ...fileData,
      id: Math.random().toString(),
      uploadedAt: new Date().toISOString()
    };

    const updatedProj: ResearchProject = {
      ...activeProject,
      files: [...activeProject.files, newFile],
      updatedAt: new Date().toISOString()
    };

    await saveProject(updatedProj);
    const updatedList = await getProjects();
    setProjects(updatedList);
    return newFile;
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!activeProject) return;

    const updatedProj: ResearchProject = {
      ...activeProject,
      files: activeProject.files.filter(f => f.id !== fileId),
      updatedAt: new Date().toISOString()
    };

    await saveProject(updatedProj);
    const updatedList = await getProjects();
    setProjects(updatedList);
  };

  const handleAddManualEntry = async (entryData: Omit<ManualDataEntry, 'id' | 'timestamp'>) => {
    if (!activeProject) return;

    const newEntry: ManualDataEntry = {
      ...entryData,
      id: Math.random().toString(),
      timestamp: new Date().toISOString()
    };

    const updatedProj: ResearchProject = {
      ...activeProject,
      dataEntries: [...activeProject.dataEntries, newEntry],
      updatedAt: new Date().toISOString()
    };

    await saveProject(updatedProj);
    const updatedList = await getProjects();
    setProjects(updatedList);
  };

  const handleDeleteManualEntry = async (entryId: string) => {
    if (!activeProject) return;

    const updatedProj: ResearchProject = {
      ...activeProject,
      dataEntries: activeProject.dataEntries.filter(e => e.id !== entryId),
      updatedAt: new Date().toISOString()
    };

    await saveProject(updatedProj);
    const updatedList = await getProjects();
    setProjects(updatedList);
  };

  const handleSaveAnalysis = async (analysis: ProjectAnalysis) => {
    if (!activeProject) return;

    const updatedProj: ResearchProject = {
      ...activeProject,
      analysis,
      updatedAt: new Date().toISOString()
    };

    await saveProject(updatedProj);
    const updatedList = await getProjects();
    setProjects(updatedList);
  };

  const handleSendMessage = async (chatHistory: ChatMessage[]) => {
    if (!activeProject) return;

    const updatedProj: ResearchProject = {
      ...activeProject,
      chatHistory,
      updatedAt: new Date().toISOString()
    };

    await saveProject(updatedProj);
    const updatedList = await getProjects();
    setProjects(updatedList);
  };

  const handleClearChat = async () => {
    if (!activeProject) return;

    const updatedProj: ResearchProject = {
      ...activeProject,
      chatHistory: [],
      updatedAt: new Date().toISOString()
    };

    await saveProject(updatedProj);
    const updatedList = await getProjects();
    setProjects(updatedList);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-sans flex flex-col transition-colors duration-300">
      
      {/* Header bar */}
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        activeProject={activeProject} 
        totalProjects={projects.length}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left projects bar */}
        <div className="lg:col-span-3">
          <ProjectList 
            projects={projects}
            activeProjectId={activeProjectId}
            onSelectProject={handleSelectProject}
            onCreateProject={handleCreateProject}
            onRenameProject={handleRenameProject}
            onDeleteProject={handleDeleteProject}
            onDuplicateProject={handleDuplicateProject}
            onExportProject={handleExportProject}
            onImportProject={handleImportProject}
          />
        </div>

        {/* Main active workspace panel */}
        <main className="lg:col-span-9 flex flex-col space-y-5">
          {activeProject ? (
            <div className="space-y-5">
              
              {/* Project banner card */}
              <div className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <GraduationCap className="w-5.5 h-5.5 text-indigo-500" />
                      Active Workspace: {activeProject.name}
                    </h1>
                    {activeProject.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                        {activeProject.description}
                      </p>
                    )}
                  </div>
                  
                  {/* Tab switch controls */}
                  <div className="flex flex-wrap gap-1.5 bg-slate-100/80 dark:bg-slate-950/40 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/30">
                    <button
                      onClick={() => setActiveTab('datasets')}
                      id="datasets-tab"
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === 'datasets' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                    >
                      <Database className="w-3.5 h-3.5" />
                      Datasets
                    </button>
                    <button
                      onClick={() => setActiveTab('stats')}
                      id="stats-tab"
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === 'stats' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      Descriptive Stats
                    </button>
                    <button
                      onClick={() => setActiveTab('analysis')}
                      id="analysis-tab"
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === 'analysis' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Research Synthesis
                    </button>
                    <button
                      onClick={() => setActiveTab('chat')}
                      id="chat-tab"
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === 'chat' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Q&A Chat
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic workspace body content */}
              <div className="transition-all duration-300">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeTab === 'datasets' && (
                      <DataManager 
                        activeProject={activeProject}
                        onAddFile={handleAddFile}
                        onDeleteFile={handleDeleteFile}
                        onAddManualEntry={handleAddManualEntry}
                        onDeleteManualEntry={handleDeleteManualEntry}
                      />
                    )}
                    {activeTab === 'stats' && (
                      <StatsViewer activeProject={activeProject} />
                    )}
                    {activeTab === 'analysis' && (
                      <AnalysisViewer 
                        activeProject={activeProject} 
                        onSaveAnalysis={handleSaveAnalysis}
                      />
                    )}
                    {activeTab === 'chat' && (
                      <ChatBox 
                        activeProject={activeProject}
                        onSendMessage={handleSendMessage}
                        onClearChat={handleClearChat}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

            </div>
          ) : (
            /* Dashboard initial empty state, shown when zero projects exist */
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-900/20 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-8">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-5 shadow-xl shadow-indigo-500/10">
                <FolderPlus className="w-8 h-8 animate-pulse" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                rebo
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm leading-relaxed">
                Welcome to your offline-first AI research advisor. Create a project workspace on the left sidebar, or upload a project backup file to load existing datasets.
              </p>
            </div>
          )}
        </main>

      </div>

      {/* Footer banner */}
      <footer className="w-full border-t border-slate-200/80 dark:border-slate-800/60 py-5 bg-white/40 dark:bg-slate-900/10 backdrop-blur-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 dark:text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} <span className="font-semibold text-slate-600 dark:text-slate-400">rebo</span>. All rights reserved.
            <button onClick={() => setShowManual(true)} className="ml-4 text-indigo-600 dark:text-indigo-400 hover:underline">View Manual</button>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <span className="flex items-center gap-1.5">
              <span>Made by</span>
              <span className="font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-md">Abdullah Zarif</span>
            </span>
            <div className="text-slate-300 dark:text-slate-700 hidden sm:block">|</div>
            <a href="tel:001862443237" className="hover:text-indigo-600 dark:hover:text-indigo-400">001862443237</a>
            <div className="text-slate-300 dark:text-slate-700 hidden sm:block">|</div>
            <a href="https://www.facebook.com/abdullah.zarif.050" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 dark:hover:text-indigo-400">Facebook</a>
          </div>
        </div>
      </footer>
      {showManual && <UserManual onClose={handleCloseManual} />}
    </div>
  );
}

// The research workspace opens in any browser at /app, and inside the Windows (.exe,
// Electron) and Android (.apk, WebView) apps. The packaged apps load the site with
// ?native=1, and the user agent confirms it is really the packaged app.
function isPackagedApp() {
  const ua = navigator.userAgent;
  const isElectron = /\bElectron\//i.test(ua);
  const isAndroidWebView = /Android/i.test(ua) && /\bwv\b/.test(ua);
  const isReboShell = /\bReboApp\b/.test(ua);
  if (!isElectron && !isAndroidWebView && !isReboShell) return false;

  const flagged = new URLSearchParams(window.location.search).get('native') === '1';
  try {
    if (flagged) sessionStorage.setItem('rebo-native', '1');
    return flagged || sessionStorage.getItem('rebo-native') === '1';
  } catch {
    return flagged;
  }
}

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (path === '/app' || isPackagedApp()) return <ResearchApp />;
  if (window.location.pathname !== '/') window.history.replaceState(null, '', '/');
  return <DownloadPage />;
}
