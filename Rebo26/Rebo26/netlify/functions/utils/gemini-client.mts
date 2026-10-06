import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getGoogleGenAI(): GoogleGenAI {
  if (!aiClient) {
    const key = Netlify.env.get('GEMINI_API_KEY');
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required but was not found.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Robust generation with retry and automatic fallback from gemini-3.5-flash to gemini-3.1-flash-lite
export async function generateContentWithRetry(params: any, maxRetries = 3, delayMs = 1000): Promise<any> {
  let attempt = 0;
  let currentModel = params.model || 'gemini-3.5-flash';

  while (attempt < maxRetries) {
    try {
      const runParams = { ...params, model: currentModel };
      const ai = getGoogleGenAI();
      return await ai.models.generateContent(runParams);
    } catch (error: any) {
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
        console.warn('Falling back from gemini-3.5-flash to gemini-3.1-flash-lite due to service unavailability...');
        currentModel = 'gemini-3.1-flash-lite';
      }

      const backoff = delayMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }
}

export async function generateContentStreamWithRetry(params: any, maxRetries = 3, delayMs = 1000): Promise<any> {
  let attempt = 0;
  let currentModel = params.model || 'gemini-3.5-flash';

  while (attempt < maxRetries) {
    try {
      const runParams = { ...params, model: currentModel };
      const ai = getGoogleGenAI();
      return await ai.models.generateContentStream(runParams);
    } catch (error: any) {
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
        console.warn('Falling back from gemini-3.5-flash to gemini-3.1-flash-lite due to service unavailability...');
        currentModel = 'gemini-3.1-flash-lite';
      }

      const backoff = delayMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }
}
