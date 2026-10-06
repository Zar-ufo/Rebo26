/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ColumnStats {
  columnName: string;
  type: 'numeric' | 'categorical' | 'mixed';
  mean?: number;
  median?: number;
  min?: number;
  max?: number;
  percentages?: Record<string, number>; // For categorical/numeric discrete values
  frequency?: Record<string, number>;   // Value frequency map
  missingCount: number;
  missingPercentage: number;
}

export interface TableStructure {
  columns: string[];
  rowCount: number;
  missingValues: Record<string, number>;
  columnStats: ColumnStats[];
}

export interface ParsedFileData {
  headers?: string[];
  rows?: Array<Record<string, any>>;
  tableStructure?: TableStructure;
  textContent?: string;
  summary?: string;
  detectedTables?: Array<{
    title: string;
    headers: string[];
    rows: string[][];
  }>;
}

export interface ResearchFile {
  id: string;
  name: string;
  type: 'excel' | 'csv' | 'pdf' | 'docx' | 'txt';
  fileSize: number; // in bytes
  uploadedAt: string;
  content: string;  // Base64 for binary or raw text for plain files
  parsedData: ParsedFileData | null;
}

export interface ManualDataEntry {
  id: string;
  title: string;
  content: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface ProjectAnalysis {
  trends: string[];
  statsSummary: string;
  academicExplanation: string;
  findings: string;
  conclusions: string;
  recommendations: string;
  analyzedAt: string;
}

export interface ResearchProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  files: ResearchFile[];
  dataEntries: ManualDataEntry[];
  analysis: ProjectAnalysis | null;
  chatHistory: ChatMessage[];
}
