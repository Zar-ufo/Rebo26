/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for larger files (DOCX, PDF, Excel, etc.) with Vercel compatibility
app.use((req, res, next) => {
  const method = req.method;
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }
  if (req.body && typeof req.body === 'object') {
    next();
  } else {
    express.json({ limit: '100mb' })(req, res, next);
  }
});

app.use((req, res, next) => {
  const method = req.method;
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }
  if (req.body && typeof req.body === 'object') {
    next();
  } else {
    express.urlencoded({ limit: '100mb', extended: true })(req, res, next);
  }
});

// Initialize Gemini SDK lazily with telemetry header
let aiClient: GoogleGenAI | null = null;

function getGoogleGenAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required but was not found.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

function isGeminiAuthError(error: any): boolean {
  const status = Number(error?.status ?? error?.statusCode);
  const message = String(error?.message || error);
  return status === 401 || status === 403 || /UNAUTHENTICATED|ACCESS_TOKEN_TYPE_UNSUPPORTED/.test(message);
}

function getGeminiAuthError(): Error {
  return new Error('Gemini authentication failed. Set GEMINI_API_KEY to a valid Google AI Studio API key; OAuth access tokens are not accepted.');
}

// Helper: Robust generation with retry and automatic fallback from gemini-3.5-flash to gemini-3.1-flash-lite
async function generateContentWithRetry(params: any, maxRetries = 3, delayMs = 1000): Promise<any> {
  let attempt = 0;
  let currentModel = params.model || 'gemini-3.5-flash';
  
  while (attempt < maxRetries) {
    try {
      const runParams = { ...params, model: currentModel };
      const ai = getGoogleGenAI();
      return await ai.models.generateContent(runParams);
    } catch (error: any) {
      if (isGeminiAuthError(error)) {
        throw getGeminiAuthError();
      }
      attempt++;
      console.warn(`[Attempt ${attempt}/${maxRetries}] Gemini generateContent failed for model ${currentModel}:`, error.message || error);
      
      if (attempt >= maxRetries) {
        throw error;
      }
      
      const errorMsg = String(error.message || error);
      const isUnavailable = error.status === 503 || error.status === 429 || 
                            errorMsg.includes('503') || errorMsg.includes('UNAVAILABLE') || 
                            errorMsg.includes('demand') || errorMsg.includes('Resource has been exhausted');
                            
      if (currentModel === 'gemini-3.5-flash' && isUnavailable) {
        console.warn(`Falling back from gemini-3.5-flash to gemini-3.1-flash-lite due to service unavailability...`);
        currentModel = 'gemini-3.1-flash-lite';
      }
      
      const backoff = delayMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }
}

async function generateContentStreamWithRetry(params: any, maxRetries = 3, delayMs = 1000): Promise<any> {
  let attempt = 0;
  let currentModel = params.model || 'gemini-3.5-flash';
  
  while (attempt < maxRetries) {
    try {
      const runParams = { ...params, model: currentModel };
      const ai = getGoogleGenAI();
      return await ai.models.generateContentStream(runParams);
    } catch (error: any) {
      if (isGeminiAuthError(error)) {
        throw getGeminiAuthError();
      }
      attempt++;
      console.warn(`[Attempt ${attempt}/${maxRetries}] Gemini generateContentStream failed for model ${currentModel}:`, error.message || error);
      
      if (attempt >= maxRetries) {
        throw error;
      }
      
      const errorMsg = String(error.message || error);
      const isUnavailable = error.status === 503 || error.status === 429 || 
                            errorMsg.includes('503') || errorMsg.includes('UNAVAILABLE') || 
                            errorMsg.includes('demand') || errorMsg.includes('Resource has been exhausted');
                            
      if (currentModel === 'gemini-3.5-flash' && isUnavailable) {
        console.warn(`Falling back from gemini-3.5-flash to gemini-3.1-flash-lite due to service unavailability...`);
        currentModel = 'gemini-3.1-flash-lite';
      }
      
      const backoff = delayMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }
}

// Helper: Programmatic calculation of Column Statistics for CSV/Excel data
function calculateColumnStats(rows: Array<Record<string, any>>): any[] {
  if (!rows || rows.length === 0) return [];

  const columns = Object.keys(rows[0]);
  const rowCount = rows.length;
  const columnStats: any[] = [];

  for (const col of columns) {
    const rawValues = rows.map(r => r[col]);
    const totalCount = rawValues.length;

    // Detect missing values
    const missingValues = rawValues.filter(val => {
      if (val === null || val === undefined) return true;
      const str = String(val).trim().toLowerCase();
      return str === '' || str === 'null' || str === 'n/a' || str === 'na' || str === 'none' || str === '-';
    });
    const missingCount = missingValues.length;
    const missingPercentage = Number(((missingCount / totalCount) * 100).toFixed(2));

    // Filter valid (non-missing) values
    const validValues = rawValues.filter(val => {
      if (val === null || val === undefined) return false;
      const str = String(val).trim().toLowerCase();
      return str !== '' && str !== 'null' && str !== 'n/a' && str !== 'na' && str !== 'none' && str !== '-';
    });

    // Detect numeric vs categorical
    const numericValues: number[] = [];
    const categoryCounts: Record<string, number> = {};

    for (const val of validValues) {
      const num = Number(val);
      if (!isNaN(num) && typeof val !== 'boolean') {
        numericValues.push(num);
      } else {
        const catStr = String(val).trim();
        categoryCounts[catStr] = (categoryCounts[catStr] || 0) + 1;
      }
    }

    const validCount = validValues.length;
    const numericPercentage = validCount > 0 ? (numericValues.length / validCount) * 100 : 0;
    const isNumeric = numericPercentage > 50; // Simple threshold

    if (isNumeric && numericValues.length > 0) {
      // Sort for median
      numericValues.sort((a, b) => a - b);
      const min = numericValues[0];
      const max = numericValues[numericValues.length - 1];
      const sum = numericValues.reduce((acc, curr) => acc + curr, 0);
      const mean = Number((sum / numericValues.length).toFixed(4));
      
      let median = 0;
      const half = Math.floor(numericValues.length / 2);
      if (numericValues.length % 2 !== 0) {
        median = numericValues[half];
      } else {
        median = (numericValues[half - 1] + numericValues[half]) / 2.0;
      }
      median = Number(median.toFixed(4));

      // Categorize distributions for numbers to show value ranges
      const ranges: Record<string, number> = {};
      numericValues.forEach(n => {
        const bin = Math.floor(n / (max - min || 1) * 5) * (max - min || 1) / 5 + min;
        const binStr = bin.toFixed(2);
        ranges[binStr] = (ranges[binStr] || 0) + 1;
      });

      // Calculate percentages for frequencies
      const percentages: Record<string, number> = {};
      Object.entries(ranges).forEach(([k, v]) => {
        percentages[k] = Number(((v / numericValues.length) * 100).toFixed(2));
      });

      columnStats.push({
        columnName: col,
        type: 'numeric',
        mean,
        median,
        min,
        max,
        percentages,
        frequency: ranges,
        missingCount,
        missingPercentage
      });
    } else {
      // Categorical column
      const freqMap: Record<string, number> = {};
      validValues.forEach(val => {
        const str = String(val).trim();
        freqMap[str] = (freqMap[str] || 0) + 1;
      });

      // Sort categories by frequency descending
      const sortedCategories = Object.entries(freqMap).sort((a, b) => b[1] - a[1]);
      const topCategories = sortedCategories.slice(0, 15);
      const otherCount = sortedCategories.slice(15).reduce((sum, curr) => sum + curr[1], 0);

      const finalFreq: Record<string, number> = {};
      const percentages: Record<string, number> = {};

      topCategories.forEach(([cat, count]) => {
        finalFreq[cat] = count;
        percentages[cat] = Number(((count / validCount) * 100).toFixed(2));
      });

      if (otherCount > 0) {
        finalFreq['Other'] = otherCount;
        percentages['Other'] = Number(((otherCount / validCount) * 100).toFixed(2));
      }

      columnStats.push({
        columnName: col,
        type: 'categorical',
        percentages,
        frequency: finalFreq,
        missingCount,
        missingPercentage
      });
    }
  }

  return columnStats;
}

// ==================== API ROUTES ====================

// Simple Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), platform: process.env.VERCEL ? 'vercel' : 'local' });
});

// Endpoint 1: Parse and clean data / files
app.post('/api/analyze-file', async (req, res) => {
  try {
    const { name, type, content } = req.body || {};

    if (!name || !type || !content) {
      return res.status(400).json({ error: 'Missing name, type, or content' });
    }

    let parsedData: any = {};

    if (type === 'csv' || type === 'excel') {
      const buffer = Buffer.from(content, 'base64');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: null });
      
      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
      const columnStats = calculateColumnStats(rows);

      // Detect overall missing values
      const missingValues: Record<string, number> = {};
      columnStats.forEach((stat: any) => {
        missingValues[stat.columnName] = stat.missingCount;
      });

      parsedData = {
        headers,
        rows: rows.slice(0, 1000), // Limit payload size to avoid blowing up DB/IndexedDB
        tableStructure: {
          columns: headers,
          rowCount: rows.length,
          missingValues,
          columnStats
        }
      };
    } else if (type === 'pdf') {
      // PDF base64 is sent directly to Gemini 3.5 Flash for advanced table and text extraction
      const imagePart = {
        inlineData: {
          mimeType: 'application/pdf',
          data: content
        }
      };

      const prompt = `You are a high-fidelity document extractor for researchers. 
Please analyze this PDF file and extract:
1. A concise, professional academic summary of the contents.
2. Any major tables or structured data. Format them as JSON with a Title, Headers, and Rows arrays.
3. Identify potential missing values or limitations mentioned.

Your output MUST be a strict JSON object matches this schema exactly:
{
  "summary": "detailed summary string",
  "detectedTables": [
    {
      "title": "Table Title",
      "headers": ["Col1", "Col2"],
      "rows": [["Val1", "Val2"], ["Val3", "Val4"]]
    }
  ],
  "textContent": "Full extracted plain-text or deep structured outline of key text sections"
}`;

      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: [imagePart, prompt],
        config: {
          responseMimeType: 'application/json',
          systemInstruction: 'You are an elite research extraction tool. Always output valid JSON strictly matching the requested structure.'
        }
      });

      const text = response.text || '{}';
      try {
        parsedData = JSON.parse(text);
      } catch (err) {
        parsedData = {
          textContent: text,
          summary: "Successfully parsed document.",
          detectedTables: []
        };
      }
    } else if (type === 'docx') {
      const buffer = Buffer.from(content, 'base64');
      const docResult = await mammoth.extractRawText({ buffer });
      const textContent = docResult.value;

      // Ask Gemini to summarize and extract tables from the DOCX plain text
      const prompt = `You are a text analyzer. Below is the raw text extracted from a DOCX file.
Analyze this text and extract:
1. A detailed academic summary.
2. Any key tables of data structured as clean JSON tables (headers and rows).
3. Identify missing elements, tables, or key metrics.

DOCX Text Content:
---
${textContent}
---

Your output MUST be a strict JSON object matches this schema exactly:
{
  "summary": "detailed academic summary string",
  "detectedTables": [
    {
      "title": "Table Title",
      "headers": ["Header 1", "Header 2"],
      "rows": [["Cell 1", "Cell 2"]]
    }
  ],
  "textContent": "The full or slightly cleaned plain-text of the document"
}`;

      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          systemInstruction: 'You are an elite research extraction tool. Always output valid JSON strictly matching the requested structure.'
        }
      });

      const text = response.text || '{}';
      try {
        parsedData = JSON.parse(text);
        if (!parsedData.textContent) {
          parsedData.textContent = textContent;
        }
      } catch (err) {
        parsedData = {
          textContent,
          summary: "Successfully extracted text content.",
          detectedTables: []
        };
      }
    } else if (type === 'txt') {
      const textContent = Buffer.from(content, 'base64').toString('utf-8');

      // Ask Gemini to summarize and clean the TXT content
      const prompt = `Analyze this TXT research file and extract:
1. A concise academic summary.
2. Any tables, matrices, or structured lists formatted as JSON tables (headers and rows).
3. Potential gaps, missing values, or contradictions.

TXT Content:
---
${textContent}
---

Your output MUST be a strict JSON object matches this schema exactly:
{
  "summary": "detailed academic summary string",
  "detectedTables": [
    {
      "title": "Table Title",
      "headers": ["Header 1", "Header 2"],
      "rows": [["Cell 1", "Cell 2"]]
    }
  ],
  "textContent": "The cleaned raw text of the document"
}`;

      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          systemInstruction: 'You are an elite research extraction tool. Always output valid JSON strictly matching the requested structure.'
        }
      });

      const text = response.text || '{}';
      try {
        parsedData = JSON.parse(text);
        if (!parsedData.textContent) {
          parsedData.textContent = textContent;
        }
      } catch (err) {
        parsedData = {
          textContent,
          summary: "Successfully extracted text content.",
          detectedTables: []
        };
      }
    }

    res.json(parsedData);
  } catch (error: any) {
    console.error('File parsing error:', error);
    res.status(500).json({ error: error.message || 'Error parsing file.' });
  }
});

// Endpoint 2: Full Research Analysis (Streaming via SSE)
app.post('/api/project/analyze-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { name, description, files, dataEntries } = req.body || {};
    // Build an exhaustive research prompt with programmatic context
    let projectContext = `Project Name: ${name}\n`;
    projectContext += `Description: ${description || 'No description provided.'}\n\n`;

    if (files && files.length > 0) {
      projectContext += `### ATTACHED FILES AND DATASETS:\n`;
      files.forEach((file: any, idx: number) => {
        projectContext += `File #${idx + 1}: ${file.name} (Type: ${file.type})\n`;
        if (file.type === 'csv' || file.type === 'excel') {
          const struct = file.parsedData?.tableStructure;
          if (struct) {
            projectContext += `- Total Rows: ${struct.rowCount}\n`;
            projectContext += `- Columns Detected: ${struct.columns.join(', ')}\n`;
            projectContext += `- Missing Values Per Column:\n`;
            Object.entries(struct.missingValues || {}).forEach(([k, v]) => {
              projectContext += `  * ${k}: ${v} missing rows\n`;
            });
            projectContext += `- Programmatic Descriptive Statistics:\n`;
            (struct.columnStats || []).forEach((stat: any) => {
              projectContext += `  * Column "${stat.columnName}" (${stat.type}):\n`;
              if (stat.type === 'numeric') {
                projectContext += `    - Mean: ${stat.mean}, Median: ${stat.median}, Min: ${stat.min}, Max: ${stat.max}\n`;
              } else {
                projectContext += `    - Top Categories: ${Object.entries(stat.frequency || {}).slice(0, 5).map(([cat, freq]) => `${cat} (${freq})`).join(', ')}\n`;
              }
            });
          }
        } else {
          projectContext += `- Summary: ${file.parsedData?.summary || 'No summary available'}\n`;
          const detected = file.parsedData?.detectedTables;
          if (detected && detected.length > 0) {
            projectContext += `- Detected Tables:\n`;
            detected.forEach((t: any) => {
              projectContext += `  * Table: ${t.title}\n  * Headers: ${t.headers.join(' | ')}\n`;
              projectContext += `  * Top Rows Sample:\n` + t.rows.slice(0, 3).map((r: any) => `    - ${r.join(' | ')}`).join('\n') + '\n';
            });
          }
          projectContext += `- Key Extracted Text/Metadata (snippet): ${String(file.parsedData?.textContent || '').substring(0, 1000)}...\n`;
        }
        projectContext += `\n`;
      });
    }

    if (dataEntries && dataEntries.length > 0) {
      projectContext += `### MANUALLY ENTERED NOTES/OBSERVATIONS:\n`;
      dataEntries.forEach((entry: any, idx: number) => {
        projectContext += `Entry #${idx + 1}: ${entry.title}\nContent:\n${entry.content}\n\n`;
      });
    }

    const systemPrompt = `You are "Guiding Research Friend", an elite AI academic researcher, statistician, and scholarly advisor.
You are given a comprehensive dossier of data files, pre-computed descriptive statistics, extracted tables, and researcher logs.

Your task is to perform an exhaustive, high-fidelity research analysis. Do NOT make up, invent, or hallucinate any facts or numbers. Only use the provided metrics, calculations, and content.

You MUST produce a detailed, deeply analytical response structured in clean JSON with the following keys. The response must be valid JSON:
{
  "trends": [
    "Trend/pattern 1 with solid references to columns/data",
    "Trend/pattern 2...",
    "Trend/pattern 3..."
  ],
  "statsSummary": "A highly readable, professional meta-analysis of all pre-computed descriptive statistics, dataset sizes, and missing values, commenting on data quality.",
  "academicExplanation": "A deep scholarly, theoretical literature-aligned explanation of why these metrics matter, explaining underlying dynamics.",
  "findings": "Detailed list of core empirical findings, drawing connections between manual entries and files.",
  "conclusions": "Grounded conclusions summarizing the research's primary takeaways.",
  "recommendations": "Actionable, rigorous, and practical research/policy recommendations based strictly on findings."
}

Ensure the output is beautifully articulated and highly detailed. Ensure the JSON is completely valid. If you need, output markdown formatting INSIDE the string fields.`;

    const responseStream = await generateContentStreamWithRetry({
      model: 'gemini-3.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `Dataset and Project Dossier:\n\n${projectContext}` }] }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Project Analysis error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message || 'Analysis failed.' })}\n\n`);
    res.end();
  }
});

// Endpoint 3: Chat with Project Context (Streaming via SSE)
app.post('/api/project/chat-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { project, message, chatHistory } = req.body || {};

    if (!project || !message) {
      res.write(`data: ${JSON.stringify({ error: 'Missing project or message' })}\n\n`);
      return res.end();
    }

    // Compile context from project
    let context = `--- RESEARCH PROJECT DOSSIER ---\n`;
    context += `Project Name: ${project.name}\n`;
    context += `Description: ${project.description || 'No description provided'}\n\n`;

    // Incorporate project analysis if available
    if (project.analysis) {
      context += `### CORE RESEARCH FINDINGS & METRICS:\n`;
      context += `- Trends identified: ${project.analysis.trends.join('; ')}\n`;
      context += `- Descriptive Stats: ${project.analysis.statsSummary}\n`;
      context += `- Theoretical Academic Explanation: ${project.analysis.academicExplanation}\n`;
      context += `- Key Findings: ${project.analysis.findings}\n`;
      context += `- Conclusions: ${project.analysis.conclusions}\n`;
      context += `- Recommendations: ${project.analysis.recommendations}\n\n`;
    }

    // List datasets
    if (project.files && project.files.length > 0) {
      context += `### ATTACHED DATASETS & DOCUMENTS:\n`;
      project.files.forEach((f: any, idx: number) => {
        context += `File #${idx+1}: ${f.name} (type: ${f.type})\n`;
        if (f.type === 'csv' || f.type === 'excel') {
          const stats = f.parsedData?.tableStructure?.columnStats;
          if (stats) {
            context += `- Key columns & statistics:\n`;
            stats.forEach((st: any) => {
              if (st.type === 'numeric') {
                context += `  * Column "${st.columnName}" (Numeric) -> Mean: ${st.mean}, Median: ${st.median}, Min: ${st.min}, Max: ${st.max}\n`;
              } else {
                context += `  * Column "${st.columnName}" (Categorical) -> Top categories: ${Object.entries(st.frequency || {}).slice(0, 3).map(([c, v]) => `${c} (${v})`).join(', ')}\n`;
              }
            });
          }
        } else {
          context += `- Academic Summary: ${f.parsedData?.summary || 'No summary available'}\n`;
          context += `- Sample content: ${String(f.parsedData?.textContent || '').substring(0, 600)}...\n`;
        }
      });
      context += `\n`;
    }

    // List manual entries
    if (project.dataEntries && project.dataEntries.length > 0) {
      context += `### MANUAL NOTES & DATA ENTRIES:\n`;
      project.dataEntries.forEach((de: any, idx: number) => {
        context += `Entry #${idx+1}: ${de.title}\nContent:\n${de.content}\n\n`;
      });
    }

    const systemInstruction = `You are "Guiding Research Friend", an expert, empathetic, and objective academic research companion.
You have access to the complete current research project dossier: databases, manual entries, summary literature, and previous analysis reports.

Your role:
- Answer project-specific questions with extreme academic rigor, precision, and clarity.
- Ground your answers 100% in the provided dossier.
- If a user asks a question that is NOT answerable from the project data or dossier, explain clearly and politely that the information is not present in the current datasets. DO NOT make up or hallucinate citations, figures, or results.
- Incorporate pre-calculated statistics (means, medians, categories) directly in your answers to prove quantitative precision.
- Provide clean Markdown formatting with clear sections, headings, bullet points, and citation tags where applicable.`;

    // Map chatHistory to standard Gemini format
    const contents: any[] = [];
    
    // Add context first as user part so model is primed
    contents.push({
      role: 'user',
      parts: [{ text: `Here is my current research project context and dossier. Use this as the sole source of truth to guide our conversation:\n\n${context}` }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: "Understood. I have fully indexed and analyzed your research project dossier, including datasets, computed statistics, summaries, and manual observations. I am ready to answer any questions or help you develop your research grounded strictly on this data." }]
    });

    // Add rest of chat history
    if (chatHistory && chatHistory.length > 0) {
      chatHistory.forEach((msg: any) => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      });
    }

    // Add final active question
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const responseStream = await generateContentStreamWithRetry({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.2 // Lower temp for factual accuracy
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Chat error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message || 'Chat failed.' })}\n\n`);
    res.end();
  }
});


// Global Error Handler Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global Express Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.',
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
});


// ==================== VITE DEVELOPMENT MIDDLEWARE / PRODUCTION STATIC SERVING ====================

async function startServer() {
  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Guiding Research Friend backend running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
