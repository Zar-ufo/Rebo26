/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, FileSpreadsheet, FileText, Plus, Trash2, BookOpen, AlertCircle, 
  HelpCircle, ChevronLeft, ChevronRight, CheckCircle2, RefreshCw
} from 'lucide-react';
import { ResearchFile, ManualDataEntry, ResearchProject } from '../types';

interface DataManagerProps {
  activeProject: ResearchProject;
  onAddFile: (file: Omit<ResearchFile, 'id' | 'uploadedAt'>) => Promise<ResearchFile | undefined>;
  onDeleteFile: (fileId: string) => void;
  onAddManualEntry: (entry: Omit<ManualDataEntry, 'id' | 'timestamp'>) => void;
  onDeleteManualEntry: (entryId: string) => void;
}

export default function DataManager({
  activeProject,
  onAddFile,
  onDeleteFile,
  onAddManualEntry,
  onDeleteManualEntry
}: DataManagerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<'idle' | 'reading' | 'uploading' | 'analyzing' | 'saving' | 'success'>('idle');
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Manual entry states
  const [showManualForm, setShowManualForm] = useState(false);
  const [entryTitle, setEntryTitle] = useState('');
  const [entryContent, setEntryContent] = useState('');

  // Selected file for grid preview
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const previewPageSize = 10;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processUploadedFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processUploadedFile(files[0]);
    }
  };

  const processUploadedFile = async (file: File) => {
    setUploadError(null);
    setUploadState('reading');
    setUploadProgress('Reading local file bytes & validating size...');

    const name = file.name;
    const extension = name.split('.').pop()?.toLowerCase();
    let type: ResearchFile['type'] | null = null;

    if (extension === 'csv') type = 'csv';
    else if (['xlsx', 'xls'].includes(extension || '')) type = 'excel';
    else if (extension === 'pdf') type = 'pdf';
    else if (['docx', 'doc'].includes(extension || '')) type = 'docx';
    else if (extension === 'txt') type = 'txt';

    if (!type) {
      setUploadError(`Unsupported file extension: .${extension}. Please upload CSV, Excel, PDF, DOCX, or TXT.`);
      setUploadState('idle');
      return;
    }

    // Limit files to 3.5MB to stay within Vercel's 4.5MB serverless payload limit
    if (file.size > 3.5 * 1024 * 1024) {
      setUploadError(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Please upload files smaller than 3.5MB to ensure fast processing.`);
      setUploadState('idle');
      return;
    }

    const readFileAsBase64 = (fileObj: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read local file bytes.'));
        reader.readAsDataURL(fileObj);
      });
    };

    try {
      const base64String = await readFileAsBase64(file);
      
      setUploadState('uploading');
      setUploadProgress('Uploading payload to secure parser server...');

      // Let's perform a small delay for premium feels and smooth UI transitions
      await new Promise(resolve => setTimeout(resolve, 600));

      setUploadState('analyzing');
      setUploadProgress(type === 'pdf' || type === 'docx' || type === 'txt' 
        ? 'Parsing document layout with Google Gemini 3.5 Flash...'
        : 'Analyzing rows, columns, and layout parameters...'
      );

      const response = await fetch('/api/analyze-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          content: base64String
        })
      });

      if (!response.ok) {
        let errorMessage = 'Server error during extraction';
        try {
          const errText = await response.text();
          try {
            const errData = JSON.parse(errText);
            errorMessage = errData.error || errorMessage;
          } catch (e) {
            errorMessage = errText || errorMessage;
          }
        } catch (e2) {}
        throw new Error(errorMessage);
      }

      const parsedData = await response.json();

      setUploadState('saving');
      setUploadProgress('Saving structured dataset context and metadata...');
      await new Promise(resolve => setTimeout(resolve, 400));

      // Save file to active project and capture returned ResearchFile
      const newFile = await onAddFile({
        name,
        type: type!,
        fileSize: file.size,
        content: base64String,
        parsedData
      });

      setUploadState('success');
      setUploadProgress('Dataset parsed and integrated successfully!');

      if (newFile) {
        setSelectedFileId(newFile.id);
        setPreviewPage(1);
      }

      // Revert to idle after a brief success delay
      setTimeout(() => {
        setUploadState('idle');
      }, 1500);

    } catch (err: any) {
      console.error('File process error:', err);
      setUploadError(err.message || 'Failed to process file. Please try again.');
      setUploadState('idle');
    }
  };

  const handleManualEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryTitle.trim() || !entryContent.trim()) return;

    onAddManualEntry({
      title: entryTitle.trim(),
      content: entryContent.trim()
    });

    setEntryTitle('');
    setEntryContent('');
    setShowManualForm(false);
  };

  const activeFile = activeProject.files.find(f => f.id === selectedFileId) || activeProject.files[0];

  return (
    <div className="space-y-6">
      
      {/* 2-Column Upload and Observation Block */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* File Drag and Drop zone */}
        <div className="lg:col-span-7 flex flex-col">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 min-h-[200px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all ${
              isDragging 
                ? 'border-indigo-500 bg-indigo-50/40 dark:border-indigo-400 dark:bg-indigo-950/10' 
                : 'border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/10 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white/60 dark:hover:bg-slate-900/20'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".csv,.xlsx,.xls,.pdf,.docx,.doc,.txt"
              className="hidden"
            />

            {uploadState !== 'idle' ? (
              <div className="flex flex-col items-center space-y-4 py-4 w-full max-w-sm">
                {uploadState === 'success' ? (
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                ) : (
                  <div className="relative flex items-center justify-center">
                    <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin" />
                    <span className="absolute text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                      {uploadState === 'reading' && 'RD'}
                      {uploadState === 'uploading' && 'UP'}
                      {uploadState === 'analyzing' && 'AI'}
                      {uploadState === 'saving' && 'SV'}
                    </span>
                  </div>
                )}
                
                <div className="space-y-1.5 text-center">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize">
                    {uploadState === 'success' ? 'Extraction Successful' : 'Processing Dataset...'}
                  </h4>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-medium animate-pulse">
                    {uploadProgress}
                  </p>
                </div>

                {/* Micro step tracker bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ease-out ${
                      uploadState === 'success' ? 'bg-emerald-500 w-full' : 'bg-indigo-500'
                    }`}
                    style={{
                      width: 
                        uploadState === 'reading' ? '15%' :
                        uploadState === 'uploading' ? '40%' :
                        uploadState === 'analyzing' ? '75%' :
                        uploadState === 'saving' ? '90%' :
                        uploadState === 'success' ? '100%' : '0%'
                    }}
                  />
                </div>
                
                {/* Descriptive sub-message */}
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-sans max-w-xs px-2">
                  {uploadState === 'reading' && 'Validating file extension, size boundaries, and integrity.'}
                  {uploadState === 'uploading' && 'Transmitting Base64 payload package safely to backend services.'}
                  {uploadState === 'analyzing' && 'Running high-fidelity parsing, parsing headers, and invoking AI context.'}
                  {uploadState === 'saving' && 'Generating persistent metadata and local indices.'}
                  {uploadState === 'success' && 'Your document has been fully analyzed and is ready to explore.'}
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Upload Dataset or Documents
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Drag and drop your file here, or click to browse.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">CSV</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">EXCEL</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">PDF</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">DOCX</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">TXT</span>
                </div>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl flex items-start space-x-2 text-rose-700 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>

        {/* Manual entry / researcher log */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="flex-1 bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-emerald-500" />
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Manual Researcher Notes
                </h4>
              </div>
              {!showManualForm && (
                <button
                  onClick={() => setShowManualForm(true)}
                  className="text-xs px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                  id="add-note-btn"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Note
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {showManualForm ? (
                <motion.form
                  key="manual-form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleManualEntrySubmit}
                  className="flex-1 flex flex-col space-y-3"
                >
                  <input
                    type="text"
                    required
                    placeholder="Note Title (e.g., Focus Group 1 observations)"
                    value={entryTitle}
                    onChange={(e) => setEntryTitle(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <textarea
                    required
                    placeholder="Record transcripts, qualitative data, or customized research notes here..."
                    value={entryContent}
                    onChange={(e) => setEntryContent(e.target.value)}
                    rows={4}
                    className="w-full flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowManualForm(false)}
                      className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium cursor-pointer"
                    >
                      Save Observation
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.div
                  key="manual-placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex flex-col justify-center items-center text-center p-4"
                >
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                    Supplement your file datasets with manual observation notes, field interviews, or qualitative surveys. They will be included directly in the AI research analysis context.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* Datasets & Manual Entries Index */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Uploaded Datasets column */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
            File Datasets ({activeProject.files.length})
          </h4>
          {activeProject.files.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-slate-500 dark:text-slate-400">No data files uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              {activeProject.files.map((file) => {
                const isSelected = file.id === (selectedFileId || activeProject.files[0]?.id);
                return (
                  <div
                    key={file.id}
                    onClick={() => {
                      setSelectedFileId(file.id);
                      setPreviewPage(1);
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20' 
                        : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {['excel', 'csv'].includes(file.type) ? (
                        <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <FileText className="w-4.5 h-4.5 text-blue-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                          {file.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {file.type.toUpperCase()} • {(file.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFile(file.id);
                        if (selectedFileId === file.id) {
                          setSelectedFileId(null);
                        }
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Manual notes list */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            Field Logs & Surveys ({activeProject.dataEntries.length})
          </h4>
          {activeProject.dataEntries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-slate-500 dark:text-slate-400">No qualitative notes added yet.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              {activeProject.dataEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                      {entry.title}
                    </p>
                    <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                      {entry.content}
                    </p>
                  </div>
                  <button
                    onClick={() => onDeleteManualEntry(entry.id)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Dataset / Document Interactive Sheet Grid Explorer */}
      {activeFile && (
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                {['excel', 'csv'].includes(activeFile.type) ? <FileSpreadsheet className="w-4 text-emerald-500" /> : <FileText className="w-4 text-indigo-500" />}
                Interactive Explorer: {activeFile.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {['excel', 'csv'].includes(activeFile.type) 
                  ? `Rows 1 - ${Math.min(activeFile.parsedData?.tableStructure?.rowCount || 0, previewPage * previewPageSize)} of ${activeFile.parsedData?.tableStructure?.rowCount || 0} total columns`
                  : 'Extracted Academic PDF/Document content outline'}
              </p>
            </div>

            {/* Pagination controls */}
            {['excel', 'csv'].includes(activeFile.type) && activeFile.parsedData?.rows && (
              <div className="flex items-center space-x-1">
                <button
                  disabled={previewPage === 1}
                  onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium px-2.5">
                  Page {previewPage} of {Math.ceil((activeFile.parsedData.tableStructure?.rowCount || 0) / previewPageSize)}
                </span>
                <button
                  disabled={previewPage >= Math.ceil((activeFile.parsedData.tableStructure?.rowCount || 0) / previewPageSize)}
                  onClick={() => setPreviewPage(p => p + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Render spreadsheet grid */}
          {['excel', 'csv'].includes(activeFile.type) && activeFile.parsedData?.rows ? (
            <div className="overflow-x-auto border border-slate-200/60 dark:border-slate-800/60 rounded-xl">
              <table className="min-w-full divide-y divide-slate-200/80 dark:divide-slate-800/80 text-left text-xs text-slate-700 dark:text-slate-300 font-sans">
                <thead className="bg-slate-50 dark:bg-slate-950 font-medium text-slate-600 dark:text-slate-400">
                  <tr>
                    {activeFile.parsedData.headers?.map((header) => {
                      const missingCount = activeFile.parsedData?.tableStructure?.missingValues[header] || 0;
                      return (
                        <th key={header} className="px-4 py-3 border-r border-slate-200/60 dark:border-slate-800/60 min-w-[120px]">
                          <div className="flex flex-col space-y-0.5">
                            <span className="truncate" title={header}>{header}</span>
                            {missingCount > 0 && (
                              <span className="text-[9px] font-mono font-normal text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-1 py-0.5 rounded w-max">
                                {missingCount} missing
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white/40 dark:bg-slate-900/10">
                  {activeFile.parsedData.rows
                    .slice((previewPage - 1) * previewPageSize, previewPage * previewPageSize)
                    .map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20">
                        {activeFile.parsedData?.headers?.map((header) => {
                          const cellValue = row[header];
                          const isMissing = cellValue === null || cellValue === undefined || String(cellValue).trim() === '';
                          return (
                            <td
                              key={header}
                              className={`px-4 py-2.5 border-r border-slate-100 dark:border-slate-800/40 truncate max-w-[200px] ${
                                isMissing ? 'bg-amber-50/40 dark:bg-amber-950/10 text-amber-600/80 italic font-mono' : ''
                              }`}
                            >
                              {isMissing ? 'Missing' : String(cellValue)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Document Summary and extracted narrative layout */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              
              {/* Detailed Summary */}
              <div className="md:col-span-5 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                    Document Academic Summary
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {activeFile.parsedData?.summary}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 text-[10px] mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/50">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Fully indexed for project-specific Q&A context.</span>
                </div>
              </div>

              {/* Text content explorer or detected tables */}
              <div className="md:col-span-7 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 flex flex-col h-[280px]">
                <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2.5">
                  {activeFile.parsedData?.detectedTables && activeFile.parsedData.detectedTables.length > 0 
                    ? 'Tables Extracted via Gemini' 
                    : 'Extracted Plain-text Sections'}
                </h5>
                
                <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                  {activeFile.parsedData?.detectedTables && activeFile.parsedData.detectedTables.length > 0 ? (
                    activeFile.parsedData.detectedTables.map((t, tIdx) => (
                      <div key={tIdx} className="space-y-1.5 border border-slate-200/60 dark:border-slate-800/60 rounded-lg p-2.5 bg-white dark:bg-slate-950/40">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                          {t.title || `Table #${tIdx + 1}`}
                        </span>
                        <div className="overflow-x-auto rounded border border-slate-100 dark:border-slate-900">
                          <table className="min-w-full text-[10px] divide-y divide-slate-100 dark:divide-slate-900">
                            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-medium text-left">
                              <tr>
                                {t.headers.map((h, idx) => (
                                  <th key={idx} className="px-2 py-1.5 border-r border-slate-100 dark:border-slate-800">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                              {t.rows.map((row, rIdx) => (
                                <tr key={rIdx}>
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="px-2 py-1 border-r border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-line font-mono bg-white dark:bg-slate-950/30 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800/40 leading-relaxed">
                      {activeFile.parsedData?.textContent || 'No text content available.'}
                    </p>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
}
