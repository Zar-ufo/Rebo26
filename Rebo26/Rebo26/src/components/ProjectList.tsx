/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Folder, Plus, Trash2, Copy, Download, Upload, Edit3, Check, X,
  Calendar, FileText, ChevronRight, AlertCircle, RefreshCw
} from 'lucide-react';
import { ResearchProject } from '../types';

interface ProjectListProps {
  projects: ResearchProject[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string, description: string) => void;
  onRenameProject: (id: string, newName: string) => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (id: string) => void;
  onExportProject: (id: string) => void;
  onImportProject: (project: ResearchProject) => void;
}

export default function ProjectList({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onDuplicateProject,
  onExportProject,
  onImportProject
}: ProjectListProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    onCreateProject(newProjectName.trim(), newProjectDesc.trim());
    setNewProjectName('');
    setNewProjectDesc('');
    setShowCreateForm(false);
  };

  const handleStartRename = (project: ResearchProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditName(project.name);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editName.trim()) return;
    onRenameProject(id, editName.trim());
    setEditingProjectId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(null);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const projectData = JSON.parse(event.target?.result as string);
        if (projectData && projectData.id && projectData.name) {
          // Perform basic schema alignment/fallback
          const aligned: ResearchProject = {
            ...projectData,
            files: projectData.files || [],
            dataEntries: projectData.dataEntries || [],
            chatHistory: projectData.chatHistory || [],
            analysis: projectData.analysis || null,
            createdAt: projectData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          onImportProject(aligned);
        } else {
          alert('Invalid project file structure. Must contain at least project ID and name.');
        }
      } catch (err) {
        alert('Failed to parse file as valid JSON project backup.');
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (e.target) {
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/40 border-r border-slate-200 dark:border-slate-800/80 transition-colors duration-300">
      
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h2 className="text-sm font-sans font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Research Projects ({projects.length})
        </h2>
        
        <div className="flex space-x-2">
          {/* Import Project */}
          <button
            onClick={handleImportClick}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-all border border-slate-200 dark:border-slate-800"
            title="Import Project JSON"
            id="import-project-btn"
          >
            <Upload className="w-4 h-4" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            accept=".json"
            className="hidden"
          />

          {/* Create Project Button */}
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm cursor-pointer transition-all flex items-center justify-center"
            title="Create New Project"
            id="create-project-trigger"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Creation Form (collapsible) */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmitCreate}
            className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 space-y-3 shadow-inner overflow-hidden"
          >
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Project Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Health Outcomes 2026"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full text-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Description</label>
              <textarea
                placeholder="Brief description of research scope"
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                rows={2}
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-1 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer transition-all font-medium"
              >
                Create Project
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Projects List Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 dark:text-slate-600 mb-3">
              <Folder className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No projects yet</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-[200px]">
              Click the plus button above or import a backup file to get started.
            </p>
          </div>
        ) : (
          projects.map((project) => {
            const isActive = project.id === activeProjectId;
            const isEditing = project.id === editingProjectId;
            const formattedDate = new Date(project.updatedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <div
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className={`group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col ${
                  isActive 
                    ? 'bg-white dark:bg-slate-800 border-indigo-500/70 shadow-md shadow-indigo-500/5' 
                    : 'bg-transparent border-transparent hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700/50'
                }`}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-500 rounded-r-md" />
                )}

                {/* Card Title & Rename Row */}
                <div className="flex items-start justify-between w-full">
                  <div className="flex-1 min-w-0 pr-2">
                    {isEditing ? (
                      <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full text-sm px-2 py-0.5 rounded border border-indigo-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(project.id, e as any);
                            if (e.key === 'Escape') handleCancelRename(e as any);
                          }}
                        />
                        <button
                          onClick={(e) => handleSaveRename(project.id, e)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={handleCancelRename}
                          className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <h3 className="text-sm font-sans font-medium text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
                        <Folder className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-500' : 'text-slate-400 group-hover:text-slate-500'}`} />
                        {project.name}
                      </h3>
                    )}
                  </div>

                  {/* Actions Column */}
                  {!isEditing && (
                    <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      {/* Rename */}
                      <button
                        onClick={(e) => handleStartRename(project, e)}
                        className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer"
                        title="Rename Project"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      {/* Duplicate */}
                      <button
                        onClick={() => onDuplicateProject(project.id)}
                        className="p-1 rounded text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer"
                        title="Duplicate Project"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      {/* Export */}
                      <button
                        onClick={() => onExportProject(project.id)}
                        className="p-1 rounded text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer"
                        title="Export Backup (.json)"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${project.name}"? This cannot be undone.`)) {
                            onDeleteProject(project.id);
                          }
                        }}
                        className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Project Description Snippet */}
                {project.description && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                    {project.description}
                  </p>
                )}

                {/* Footer Metadata */}
                <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/40 text-[10px] text-slate-400 dark:text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formattedDate}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <FileText className="w-3 h-3" />
                    {project.files.length} dataset{project.files.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* App Info Footer */}
      <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/60 flex flex-col space-y-1.5">
        <div className="flex items-center space-x-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-sans font-medium">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Local Safe Database</span>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          All documents and analyses are fully stored inside your browser's IndexedDB. Your data never leaves your device except for secure analysis queries.
        </p>
      </div>

    </div>
  );
}
