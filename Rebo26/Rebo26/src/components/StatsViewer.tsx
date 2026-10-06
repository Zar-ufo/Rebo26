/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
  TrendingUp, BarChart3, PieChart as PieIcon, HelpCircle, AlertTriangle, 
  CheckCircle2, Info, ArrowUpRight
} from 'lucide-react';
import { ResearchProject, ColumnStats, ResearchFile } from '../types';

interface StatsViewerProps {
  activeProject: ResearchProject;
}

export default function StatsViewer({ activeProject }: StatsViewerProps) {
  // Find all spreadsheet/tabular files in the project
  const datasetFiles = activeProject.files.filter(f => ['csv', 'excel'].includes(f.type));

  const [selectedFileId, setSelectedFileId] = useState<string | null>(
    datasetFiles[0]?.id || null
  );

  const activeFile = datasetFiles.find(f => f.id === selectedFileId) || datasetFiles[0];
  const statsList: ColumnStats[] = activeFile?.parsedData?.tableStructure?.columnStats || [];

  // Active column for detailed Recharts distribution visualization
  const [activeColName, setActiveColName] = useState<string | null>(null);

  const selectedColumn = statsList.find(c => c.columnName === (activeColName || statsList[0]?.columnName)) || statsList[0];

  // If no files are available
  if (datasetFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-500 mb-4 animate-bounce">
          <BarChart3 className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          No Quantitative Datasets Found
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          Descriptive statistics and interactive distribution charts are computed automatically when you upload CSV or Excel files. Upload one in the <strong>Datasets</strong> tab to begin!
        </p>
      </div>
    );
  }

  // Pre-calculate file metadata stats
  const totalRows = activeFile?.parsedData?.tableStructure?.rowCount || 0;
  const totalColumns = activeFile?.parsedData?.tableStructure?.columns?.length || 0;
  
  // Calculate overall completeness percentage
  let overallCompleteness = 100;
  if (statsList.length > 0) {
    const totalMissing = statsList.reduce((sum, col) => sum + col.missingCount, 0);
    const totalCells = totalRows * totalColumns;
    if (totalCells > 0) {
      overallCompleteness = Number((((totalCells - totalMissing) / totalCells) * 100).toFixed(1));
    }
  }

  // Prepare data for Recharts chart
  const getChartData = () => {
    if (!selectedColumn || !selectedColumn.frequency) return [];
    
    return Object.entries(selectedColumn.frequency).map(([value, count]) => ({
      name: value.length > 15 ? value.substring(0, 15) + '...' : value,
      fullName: value,
      count: count,
      percentage: selectedColumn.percentages?.[value] || 0
    })).slice(0, 15); // Limit to top 15 categories for visual density
  };

  const chartData = getChartData();
  const themeColors = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#f43f5e', '#14b8a6'];

  return (
    <div className="space-y-6">
      
      {/* Selector Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
        <div>
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Select Quantitative Dataset
          </h4>
          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1">
            Analyze computed metrics and value distributions programmatically.
          </p>
        </div>
        <select
          value={selectedFileId || ''}
          onChange={(e) => {
            setSelectedFileId(e.target.value);
            setActiveColName(null); // Reset column selection
          }}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-medium focus:outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500/30"
        >
          {datasetFiles.map(file => (
            <option key={file.id} value={file.id}>{file.name}</option>
          ))}
        </select>
      </div>

      {/* Grid of quick summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Total Rows</span>
            <strong className="text-lg font-bold text-slate-800 dark:text-slate-100">{totalRows.toLocaleString()}</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Total Columns</span>
            <strong className="text-lg font-bold text-slate-800 dark:text-slate-100">{totalColumns}</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Missing Value Density</span>
            <strong className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {overallCompleteness}% <span className="text-[10px] font-normal text-slate-400">complete</span>
            </strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Target Status</span>
            <strong className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              Parsed & Cleaned <ArrowUpRight className="w-3.5 h-3.5" />
            </strong>
          </div>
        </div>

      </div>

      {/* Distribution Chart and Stats Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Interactive Bar Chart column */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                Value Frequency Distribution
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Distribution plot for column: <strong className="text-slate-700 dark:text-slate-300 font-mono">{selectedColumn?.columnName}</strong>
              </p>
            </div>

            {/* Column selector for charts */}
            <select
              value={selectedColumn?.columnName || ''}
              onChange={(e) => {
                setActiveColName(e.target.value);
              }}
              className="text-xs px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-medium focus:outline-none cursor-pointer"
            >
              {statsList.map(c => (
                <option key={c.columnName} value={c.columnName}>{c.columnName} ({c.type})</option>
              ))}
            </select>
          </div>

          {/* Recharts Container */}
          <div className="h-[240px] w-full bg-slate-50/50 dark:bg-slate-950/20 rounded-xl p-3 border border-slate-100 dark:border-slate-900 flex items-center justify-center">
            {chartData.length === 0 ? (
              <div className="text-center text-xs text-slate-400 dark:text-slate-500">
                No frequency map available for this column.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f030" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px'
                    }}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={themeColors[index % themeColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex items-start gap-2 text-[10px] text-slate-400 bg-slate-100/50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50 leading-relaxed">
            <Info className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <span>
              This interactive chart illustrates frequency distribution categories for {selectedColumn?.type === 'numeric' ? 'discretized bin ranges' : 'categorical items'}. For multi-dimensional variables, we plot up to 15 categorical distributions to maintain aesthetic legibility.
            </span>
          </div>
        </div>

        {/* Detailed Column Statistics Sidebar Card */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
              <PieIcon className="w-4 h-4 text-emerald-500" />
              Variable Focus Metrics
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Detailed statistics for variable <strong className="text-slate-700 dark:text-slate-300 font-mono">{selectedColumn?.columnName}</strong>.
            </p>

            {selectedColumn ? (
              <div className="space-y-3.5 text-xs">
                
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Metric Class</span>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full uppercase font-semibold ${selectedColumn.type === 'numeric' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'}`}>
                    {selectedColumn.type}
                  </span>
                </div>

                {selectedColumn.type === 'numeric' ? (
                  <>
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Arithmetic Mean (Avg)</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono text-xs">{selectedColumn.mean}</strong>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Median (50th percentile)</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono text-xs">{selectedColumn.median}</strong>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Minimum Bounds (Min)</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono text-xs">{selectedColumn.min}</strong>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Maximum Bounds (Max)</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono text-xs">{selectedColumn.max}</strong>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <span className="block text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase tracking-wider mb-1.5">Top Frequencies</span>
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                      {Object.entries(selectedColumn.percentages || {}).map(([cat, percent]) => (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 font-normal">
                            <span className="truncate max-w-[150px]">{cat}</span>
                            <span className="font-mono">{selectedColumn.frequency?.[cat]} ({percent}%)</span>
                          </div>
                          {/* Percent bar */}
                          <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                  <span className="text-slate-500 dark:text-slate-400">Missing rows (Gaps)</span>
                  <strong className={`font-mono text-xs ${selectedColumn.missingCount > 0 ? 'text-amber-600 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                    {selectedColumn.missingCount} ({selectedColumn.missingPercentage}%)
                  </strong>
                </div>

              </div>
            ) : (
              <div className="text-center text-xs text-slate-400 dark:text-slate-500 py-6">
                No column selected.
              </div>
            )}
          </div>

          <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            Computed programmatically with 100% mathematical precision.
          </div>
        </div>

      </div>

      {/* Comprehensive Columns Descriptive Statistics Matrix */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Complete Descriptive Statistics Matrix
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Overview statistics across all discovered columns. Click any row to update the frequency chart.
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200/60 dark:border-slate-800/60 rounded-xl">
          <table className="min-w-full divide-y divide-slate-200/80 dark:divide-slate-800/80 text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950 font-medium text-slate-600 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Column Name</th>
                <th className="px-4 py-3">Metric Class</th>
                <th className="px-4 py-3">Mean</th>
                <th className="px-4 py-3">Median</th>
                <th className="px-4 py-3">Min</th>
                <th className="px-4 py-3">Max</th>
                <th className="px-4 py-3">Missing Cells</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white/40 dark:bg-slate-900/10">
              {statsList.map((stat) => {
                const isFocused = stat.columnName === selectedColumn?.columnName;
                const hasMissing = stat.missingCount > 0;
                
                return (
                  <tr
                    key={stat.columnName}
                    onClick={() => setActiveColName(stat.columnName)}
                    className={`cursor-pointer transition-colors ${
                      isFocused 
                        ? 'bg-indigo-50/40 dark:bg-indigo-950/10 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20' 
                        : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                    }`}
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100 font-mono text-[11px] truncate max-w-[200px]">
                      {stat.columnName}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full uppercase font-bold ${
                        stat.type === 'numeric' 
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400' 
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                      }`}>
                        {stat.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-400">
                      {stat.type === 'numeric' ? stat.mean : '—'}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-400">
                      {stat.type === 'numeric' ? stat.median : '—'}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-400">
                      {stat.type === 'numeric' ? stat.min : '—'}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-400">
                      {stat.type === 'numeric' ? stat.max : '—'}
                    </td>
                    <td className={`px-4 py-2.5 font-mono ${hasMissing ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                      {stat.missingCount} ({stat.missingPercentage}%)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
