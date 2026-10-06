import type { Config } from '@netlify/functions';
import { generateContentStreamWithRetry } from './utils/gemini-client.mts';

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { project, message, chatHistory } = await req.json();
  const encoder = new TextEncoder();

  if (!project || !message) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Missing project or message' })}\n\n`));
        controller.close();
      }
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  // Compile context from project
  let context = `--- RESEARCH PROJECT DOSSIER ---\n`;
  context += `Project Name: ${project.name}\n`;
  context += `Description: ${project.description || 'No description provided'}\n\n`;

  if (project.analysis) {
    context += `### CORE RESEARCH FINDINGS & METRICS:\n`;
    context += `- Trends identified: ${project.analysis.trends.join('; ')}\n`;
    context += `- Descriptive Stats: ${project.analysis.statsSummary}\n`;
    context += `- Theoretical Academic Explanation: ${project.analysis.academicExplanation}\n`;
    context += `- Key Findings: ${project.analysis.findings}\n`;
    context += `- Conclusions: ${project.analysis.conclusions}\n`;
    context += `- Recommendations: ${project.analysis.recommendations}\n\n`;
  }

  if (project.files && project.files.length > 0) {
    context += `### ATTACHED DATASETS & DOCUMENTS:\n`;
    project.files.forEach((f: any, idx: number) => {
      context += `File #${idx + 1}: ${f.name} (type: ${f.type})\n`;
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

  if (project.dataEntries && project.dataEntries.length > 0) {
    context += `### MANUAL NOTES & DATA ENTRIES:\n`;
    project.dataEntries.forEach((de: any, idx: number) => {
      context += `Entry #${idx + 1}: ${de.title}\nContent:\n${de.content}\n\n`;
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

  const contents: any[] = [];

  contents.push({
    role: 'user',
    parts: [{ text: `Here is my current research project context and dossier. Use this as the sole source of truth to guide our conversation:\n\n${context}` }]
  });
  contents.push({
    role: 'model',
    parts: [{ text: 'Understood. I have fully indexed and analyzed your research project dossier, including datasets, computed statistics, summaries, and manual observations. I am ready to answer any questions or help you develop your research grounded strictly on this data.' }]
  });

  if (chatHistory && chatHistory.length > 0) {
    chatHistory.forEach((msg: any) => {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      });
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  const stream = new ReadableStream({
    async start(controller) {
      try {
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
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.text })}\n\n`));
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (error: any) {
        console.error('Chat error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message || 'Chat failed.' })}\n\n`));
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
  path: '/api/project/chat-stream',
};
