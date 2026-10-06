import type { Config } from '@netlify/functions';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { generateContentWithRetry } from './utils/gemini-client.mts';
import { calculateColumnStats } from './utils/column-stats.mts';

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { name, type, content } = await req.json();

    if (!name || !type || !content) {
      return Response.json({ error: 'Missing name, type, or content' }, { status: 400 });
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
          summary: 'Successfully parsed document.',
          detectedTables: []
        };
      }
    } else if (type === 'docx') {
      const buffer = Buffer.from(content, 'base64');
      const docResult = await mammoth.extractRawText({ buffer });
      const textContent = docResult.value;

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
          summary: 'Successfully extracted text content.',
          detectedTables: []
        };
      }
    } else if (type === 'txt') {
      const textContent = Buffer.from(content, 'base64').toString('utf-8');

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
          summary: 'Successfully extracted text content.',
          detectedTables: []
        };
      }
    }

    return Response.json(parsedData);
  } catch (error: any) {
    console.error('File parsing error:', error);
    return Response.json({ error: error.message || 'Error parsing file.' }, { status: 500 });
  }
};

export const config: Config = {
  path: '/api/analyze-file',
};
