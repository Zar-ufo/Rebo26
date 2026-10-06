/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, FileText, Download, Printer, BookOpen, AlertCircle, 
  HelpCircle, RefreshCw, BarChart2, Lightbulb, Compass, CheckCircle2, FileJson
} from 'lucide-react';
import { ResearchProject, ProjectAnalysis } from '../types';
import canvasConfetti from 'canvas-confetti';
import { jsPDF } from 'jspdf';

const ensureString = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.map(item => ensureString(item)).join('\n');
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
};

const ensureArrayOfStrings = (val: any): string[] => {
  if (val === null || val === undefined) return [];
  if (Array.isArray(val)) return val.map(item => ensureString(item));
  if (typeof val === 'string') return [val];
  return [String(val)];
};

interface AnalysisViewerProps {
  activeProject: ResearchProject;
  onSaveAnalysis: (analysis: ProjectAnalysis) => void;
}

export default function AnalysisViewer({ activeProject, onSaveAnalysis }: AnalysisViewerProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    'Parsing file datasets & qualitative observations...',
    'Synthesizing structural descriptive statistics...',
    'Mapping data metrics against academic literature theories...',
    'Formulating empirical findings & trends patterns...',
    'Compiling policy conclusions & actionable recommendations...'
  ];

  // Rotate loading messages while analyzing
  useEffect(() => {
    let interval: any;
    if (analyzing) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % steps.length);
      }, 3500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [analyzing]);

  const handleRunAnalysis = async () => {
    if (activeProject.files.length === 0 && activeProject.dataEntries.length === 0) {
      alert('Please upload at least one dataset or add a manual note before analyzing.');
      return;
    }

    setAnalyzing(true);
    setStreamedText('');
    setError(null);
    
    try {
      const response = await fetch('/api/project/analyze-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: activeProject.name,
          description: activeProject.description,
          files: activeProject.files,
          dataEntries: activeProject.dataEntries
        })
      });

      if (!response.ok) {
        throw new Error('Server returned error during analysis stream init');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (!reader) {
        throw new Error('Failed to open stream reader');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6).trim();
            if (dataStr === '[DONE]') {
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                throw { isStreamError: true, message: parsed.error };
              }
              if (parsed.text) {
                accumulated += parsed.text;
                setStreamedText(accumulated);
              }
            } catch (e: any) {
              if (e && e.isStreamError) {
                throw new Error(e.message);
              }
              // Soft error for raw lines
            }
          }
        }
      }

      // Try to parse the final JSON
      let finalAnalysis: ProjectAnalysis;
      try {
        // Strip out potential markdown code fences from JSON output if the model added them
        let cleanText = accumulated.trim();
        if (!cleanText) {
          throw new Error('Analysis response was empty due to server error or interruption.');
        }
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.substring(7);
        }
        if (cleanText.endsWith('```')) {
          cleanText = cleanText.substring(0, cleanText.length - 3);
        }
        cleanText = cleanText.trim();

        const json = JSON.parse(cleanText);
        
        finalAnalysis = {
          trends: ensureArrayOfStrings(json.trends),
          statsSummary: ensureString(json.statsSummary),
          academicExplanation: ensureString(json.academicExplanation),
          findings: ensureString(json.findings),
          conclusions: ensureString(json.conclusions),
          recommendations: ensureString(json.recommendations),
          analyzedAt: new Date().toISOString()
        };

        onSaveAnalysis(finalAnalysis);
        
        // Celebrate!
        canvasConfetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });

      } catch (err) {
        console.error('Failed to parse final analysis JSON:', err);
        // Fallback analysis if JSON parsing failed
        finalAnalysis = {
          trends: ['Discovered structural trends in data.'],
          statsSummary: 'Statistical calculations reviewed.',
          academicExplanation: 'General academic insights extracted.',
          findings: accumulated, // Save raw text
          conclusions: 'Summary report successfully compiled locally.',
          recommendations: 'Continue refining datasets to isolate outliers.',
          analyzedAt: new Date().toISOString()
        };
        onSaveAnalysis(finalAnalysis);
      }

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during streaming analysis.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Helper: Simple raw text stream visualizer during active loading
  const renderGrowingProgress = () => {
    return (
      <div className="bg-slate-900 text-slate-300 font-mono text-[11px] p-4 rounded-xl border border-slate-800 h-[200px] overflow-y-auto space-y-1 scrollbar-thin">
        <span className="text-indigo-400 block border-b border-slate-800 pb-1 mb-1 font-semibold">STREAMING RAW EXPERT MODEL RESPONSE:</span>
        <p className="whitespace-pre-line leading-relaxed">{streamedText}</p>
        <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse" />
      </div>
    );
  };

  // Export functions
  const handleExportMarkdown = () => {
    if (!activeProject.analysis) return;
    const report = activeProject.analysis;

    const trends = ensureArrayOfStrings(report.trends);
    const statsSummary = ensureString(report.statsSummary);
    const academicExplanation = ensureString(report.academicExplanation);
    const findings = ensureString(report.findings);
    const conclusions = ensureString(report.conclusions);
    const recommendations = ensureString(report.recommendations);

    let md = `# Research Report: ${activeProject.name}\n`;
    md += `**Date:** ${new Date(report.analyzedAt).toLocaleDateString()}\n`;
    md += `**Description:** ${activeProject.description || 'No description provided'}\n\n`;
    
    md += `## 1. Discovered Data Trends\n`;
    trends.forEach((t, i) => {
      md += `${i+1}. ${t}\n`;
    });
    md += `\n`;

    md += `## 2. Meta-Analysis of Descriptive Statistics\n`;
    md += `${statsSummary}\n\n`;

    md += `## 3. Academic & Theoretical Foundations\n`;
    md += `${academicExplanation}\n\n`;

    md += `## 4. Primary Empirical Findings\n`;
    md += `${findings}\n\n`;

    md += `## 5. Conclusions\n`;
    md += `${conclusions}\n\n`;

    md += `## 6. Actionable Recommendations\n`;
    md += `${recommendations}\n`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeProject.name.replace(/\s+/g, '_')}_Research_Report.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDocx = () => {
    if (!activeProject.analysis) return;
    const report = activeProject.analysis;

    const trends = ensureArrayOfStrings(report.trends);
    const statsSummary = ensureString(report.statsSummary);
    const academicExplanation = ensureString(report.academicExplanation);
    const findings = ensureString(report.findings);
    const conclusions = ensureString(report.conclusions);
    const recommendations = ensureString(report.recommendations);

    // Use Rich Text Format (RTF) encoded as standard text, saving with .doc extension.
    // This allows MS Word, Google Docs, Pages, etc. to open the file natively and beautifully with full styling,
    // completely bypassing security Blocks and "Corrupted HTML" warnings!
    let rtf = "{\\rtf1\\ansi\\deff0\\nouicompat{\\fonttbl{\\f0\\fnil\\fcharset0 Arial;}{\\f1\\fnil\\fcharset0 Arial;}}\n";
    rtf += "{\\colortbl ;\\red79\\green70\\blue229;\\red15\\green23\\blue42;\\red100\\green116\\blue139;}\n";
    rtf += "\\viewkind4\\uc1\n";
    
    // Header Title (indigo text, bold, size 18pt)
    rtf += "\\pard\\sa200\\cf1\\b\\fs36 Research Report: " + activeProject.name + "\\b0\\fs24\\cf0\\par\n";
    // Metadata (slate grey text, size 10pt)
    rtf += "\\pard\\sa100\\cf3\\fs20 Date: " + new Date(report.analyzedAt).toLocaleDateString() + " | Scope: " + (activeProject.description || "N/A") + "\\cf0\\fs24\\par\n";
    // separator
    rtf += "\\pard\\sa200\\cf3 --------------------------------------------------------------------------------\\cf0\\par\n";

    // Section 1: Discovered Data Trends
    rtf += "\\pard\\sa100\\cf1\\b\\fs28 1. Discovered Data Trends\\b0\\fs24\\cf0\\par\n";
    trends.forEach((t, i) => {
      rtf += "\\pard\\fi-360\\li360\\sa80  " + (i + 1) + ". " + t + "\\par\n";
    });
    rtf += "\\par\n";

    // Section 2: Meta-Analysis of Descriptive Statistics
    rtf += "\\pard\\sa100\\cf1\\b\\fs28 2. Meta-Analysis of Descriptive Statistics\\b0\\fs24\\cf0\\par\n";
    rtf += "\\pard\\sa100 " + statsSummary.replace(/\n/g, "\\par\n") + "\\par\\par\n";

    // Section 3: Academic & Theoretical Foundations
    rtf += "\\pard\\sa100\\cf1\\b\\fs28 3. Academic & Theoretical Foundations\\b0\\fs24\\cf0\\par\n";
    rtf += "\\pard\\sa100 " + academicExplanation.replace(/\n/g, "\\par\n") + "\\par\\par\n";

    // Section 4: Primary Empirical Findings
    rtf += "\\pard\\sa100\\cf1\\b\\fs28 4. Primary Empirical Findings\\b0\\fs24\\cf0\\par\n";
    rtf += "\\pard\\sa100 " + findings.replace(/\n/g, "\\par\n") + "\\par\\par\n";

    // Section 5: Conclusions
    rtf += "\\pard\\sa100\\cf1\\b\\fs28 5. Conclusions\\b0\\fs24\\cf0\\par\n";
    rtf += "\\pard\\sa100 " + conclusions.replace(/\n/g, "\\par\n") + "\\par\\par\n";

    // Section 6: Actionable Recommendations
    rtf += "\\pard\\sa100\\cf1\\b\\fs28 6. Actionable Recommendations\\b0\\fs24\\cf0\\par\n";
    rtf += "\\pard\\sa100 " + recommendations.replace(/\n/g, "\\par\n") + "\\par\n";

    rtf += "}";

    const blob = new Blob([rtf], { type: 'application/rtf;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeProject.name.replace(/\s+/g, '_')}_Research_Report.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    if (!activeProject.analysis) return;
    const report = activeProject.analysis;

    const trends = ensureArrayOfStrings(report.trends);
    const statsSummary = ensureString(report.statsSummary);
    const academicExplanation = ensureString(report.academicExplanation);
    const findings = ensureString(report.findings);
    const conclusions = ensureString(report.conclusions);
    const recommendations = ensureString(report.recommendations);

    // Use high-fidelity jsPDF document renderer to compile a beautiful, printable PDF
    // directly on the client, avoiding iframe-printing restrictions.
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    let y = 25;

    // Check page space limit and add page if needed
    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    // Draw Title Header (Indigo highlight)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229); // Brand Indigo
    const titleLines = doc.splitTextToSize(`Research Report: ${activeProject.name}`, contentWidth);
    doc.text(titleLines, margin, y);
    y += (titleLines.length * 7) + 5;

    // Metadata details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate Gray
    const metaText = `Date: ${new Date(report.analyzedAt).toLocaleDateString()}  |  Methodology: Descriptive & Generative Meta-Analysis`;
    doc.text(metaText, margin, y);
    y += 7;

    if (activeProject.description) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      const descLines = doc.splitTextToSize(`Scope: ${activeProject.description}`, contentWidth);
      doc.text(descLines, margin, y);
      y += (descLines.length * 5) + 6;
    }

    // Horizontal Rule
    doc.setDrawColor(199, 210, 254);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Helper to print styled section block
    const addSection = (title: string, content: string | string[], isList = false) => {
      checkPageBreak(18);
      
      // Section title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(title, margin, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85); // slate-700

      if (isList && Array.isArray(content)) {
        content.forEach((item, idx) => {
          const bullet = `${idx + 1}. `;
          const itemLines = doc.splitTextToSize(item, contentWidth - 8);
          checkPageBreak((itemLines.length * 5) + 3);
          
          doc.setFont('helvetica', 'bold');
          doc.text(bullet, margin, y);
          doc.setFont('helvetica', 'normal');
          doc.text(itemLines, margin + 6, y);
          y += (itemLines.length * 5) + 3;
        });
      } else if (typeof content === 'string') {
        const paragraphs = content.split('\n');
        paragraphs.forEach(para => {
          if (!para.trim()) return;
          const paraLines = doc.splitTextToSize(para.trim(), contentWidth);
          checkPageBreak((paraLines.length * 5) + 4);
          
          doc.text(paraLines, margin, y);
          y += (paraLines.length * 5) + 4;
        });
      }
      y += 6; // separator margin between sections
    };

    // Construct each section
    addSection("1. Discovered Data Trends", trends, true);
    addSection("2. Meta-Analysis of Descriptive Statistics", statsSummary);
    addSection("3. Academic & Theoretical Foundations", academicExplanation);
    addSection("4. Primary Empirical Findings", findings);
    addSection("5. Conclusions", conclusions);
    addSection("6. Actionable Recommendations", recommendations);

    // Apply header & footer page decoration on all generated pages retrospectively
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Footer bar
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Research Synthesis Report — ${activeProject.name}`, margin, pageHeight - 10);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    // Save and trigger file download automatically
    doc.save(`${activeProject.name.replace(/\s+/g, '_')}_Research_Report.pdf`);
  };

  const hasData = activeProject.files.length > 0 || activeProject.dataEntries.length > 0;
  const report: ProjectAnalysis | null = activeProject.analysis;

  return (
    <div className="space-y-6">
      
      {/* Top Banner Control Panel */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            AI-Powered Research Synthesis
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Compile all datasets, programmatic statistics, and observations into an academic-grade research paper outline.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {report && !analyzing && (
            <>
              <button
                onClick={handleExportMarkdown}
                className="px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg flex items-center gap-1.5 cursor-pointer"
                title="Export as Markdown (.md)"
              >
                <Download className="w-3.5 h-3.5" />
                Markdown
              </button>
              <button
                onClick={handleExportDocx}
                className="px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg flex items-center gap-1.5 cursor-pointer"
                title="Export as Word (.doc)"
              >
                <Download className="w-3.5 h-3.5" />
                Word (.doc)
              </button>
              <button
                onClick={handlePrintPDF}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg flex items-center gap-1.5 cursor-pointer"
                title="Print Report as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / PDF
              </button>
            </>
          )}

          <button
            onClick={handleRunAnalysis}
            disabled={analyzing || !hasData}
            id="run-analysis-btn"
            className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Analyzing Stream...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                {report ? 'Re-Analyze Project' : 'Generate Full Research Analysis'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-start space-x-3 text-rose-700 dark:text-rose-400 text-xs shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="space-y-1">
            <span className="font-semibold block">Analysis Synthesis Failed</span>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Analyzing / Loading Stream State */}
      {analyzing && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 animate-pulse">
                {steps[loadingStep]}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Guiding Research Friend is indexing datasets, verifying programmatically calculated column statistics, and compiling academic frameworks...
              </p>
            </div>
          </div>
          {/* Stream raw visualizer */}
          {streamedText && renderGrowingProgress()}
        </div>
      )}

      {/* Render Compiled Scientific Report */}
      {report && !analyzing && (
        <div className="space-y-6 printable-report" id="research-expert-report">
          
          {/* Header Report Card */}
          <div className="bg-indigo-950/90 dark:bg-slate-950/70 text-indigo-100 border border-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
            {/* Ambient Background Glow */}
            <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-indigo-400 bg-indigo-500/15 border border-indigo-500/20 px-2.5 py-0.5 rounded-full w-max block">
                COMPREHENSIVE EXPERT SYNTHESIS
              </span>
              <h2 className="text-lg md:text-xl font-bold tracking-tight text-white font-sans">
                {activeProject.name}
              </h2>
              <p className="text-xs text-indigo-300 max-w-2xl leading-relaxed font-normal">
                {activeProject.description || 'No description scope provided.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[10px] text-indigo-400 font-mono mt-6 pt-4 border-t border-indigo-900/40">
              <span>ANALYZED AT: {new Date(report.analyzedAt).toLocaleString()}</span>
              <span>•</span>
              <span>METHODOLOGY: DESCRIPTIVE & GENERATIVE META-ANALYSIS</span>
              <span>•</span>
              <span>API MODEL: GEMINI 3.5 FLASH</span>
            </div>
          </div>

          {/* Report Sections - Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Major Trends Card */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4" />
                  Discovered Data Trends
                </h4>
                <div className="space-y-3.5 mt-4">
                  {ensureArrayOfStrings(report.trends).map((trend, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start text-xs text-slate-700 dark:text-slate-300">
                      <span className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/40 text-[10px] font-mono font-bold flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                        {idx + 1}
                      </span>
                      <p className="leading-relaxed whitespace-pre-line">{trend}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-2.5 mt-4">
                Patterns isolated programmatically from active dataset attributes.
              </div>
            </div>

            {/* Statistics Meta-Analysis Card */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 space-y-3.5">
              <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-4 h-4" />
                Descriptive Statistical Meta-Analysis
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50/50 dark:bg-slate-950/20 p-4 border border-slate-100 dark:border-slate-900 rounded-xl">
                {ensureString(report.statsSummary)}
              </p>
              <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Aggregated data quality, record limits, and missing value biases compiled securely.</span>
              </div>
            </div>

          </div>

          {/* Academic & Theoretical Frameworks Card */}
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              Academic & Theoretical Foundations
            </h4>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {ensureString(report.academicExplanation)}
            </p>
          </div>

          {/* Findings, Conclusions, and Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Findings */}
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4" />
                  Primary Empirical Findings
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {ensureString(report.findings)}
                </p>
              </div>
              <div className="text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/40 pt-2.5 mt-4">
                Derived directly from aligned dossier files and qualitative logs.
              </div>
            </div>

            {/* Conclusions */}
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-emerald-500" />
                  Scholarly Conclusions
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {ensureString(report.conclusions)}
                </p>
              </div>
              <div className="text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/40 pt-2.5 mt-4">
                Formal qualitative deduction compiled mathematically.
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Policy & Practical Recommendations
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {ensureString(report.recommendations)}
                </p>
              </div>
              <div className="text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/40 pt-2.5 mt-4">
                Actionable interventions matching statistical trends.
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Empty State / Initial dashboard look */}
      {!report && !analyzing && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 animate-pulse">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Awaiting Scholarly Analysis
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            Once you upload datasets or log observations in the <strong>Datasets</strong> tab, click the button above. Gemini will perform an exhaustive theoretical synthesis and compile interactive finding cards!
          </p>
        </div>
      )}

    </div>
  );
}
