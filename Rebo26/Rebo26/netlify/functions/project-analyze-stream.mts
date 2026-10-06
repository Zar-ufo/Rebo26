import type { Config } from '@netlify/functions';
import { generateContentStreamWithRetry } from './utils/gemini-client.mts';

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { name, description, files, dataEntries } = await req.json();

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

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
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
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.text })}\n\n`));
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (error: any) {
        console.error('Project Analysis error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message || 'Analysis failed.' })}\n\n`));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};

export const config: Config = {
  path: '/api/project/analyze-stream',
};
