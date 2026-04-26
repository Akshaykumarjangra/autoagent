import fetch from 'node-fetch';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-2.5-flash';

function getApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  return key;
}

/**
 * Generate content (non-streaming) from Gemini
 */
export async function generateContent(prompt, systemInstruction, options = {}) {
  const apiKey = getApiKey();
  const url = `${GEMINI_BASE}/models/${options.model || MODEL}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 8192,
      topP: options.topP ?? 0.95,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No content returned from Gemini');
  return text;
}

/**
 * Stream content from Gemini (returns async generator of text chunks)
 */
export async function* streamContent(prompt, systemInstruction, options = {}) {
  const apiKey = getApiKey();
  const url = `${GEMINI_BASE}/models/${options.model || MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const body = {
    contents: Array.isArray(prompt)
      ? prompt
      : [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 8192,
      topP: options.topP ?? 0.95,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini streaming error ${response.status}: ${err}`);
  }

  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) yield text;
        } catch {
          // skip malformed chunks
        }
      }
    }
  }
}

/**
 * Generate embeddings via Gemini
 */
export async function generateEmbedding(text) {
  const apiKey = getApiKey();
  const url = `${GEMINI_BASE}/models/text-embedding-004:embedContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: { parts: [{ text }] },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini embedding error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.embedding?.values;
}

/**
 * Batch embed multiple texts
 */
export async function batchEmbed(texts) {
  const apiKey = getApiKey();
  const url = `${GEMINI_BASE}/models/text-embedding-004:batchEmbedContents?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      requests: texts.map(text => ({
        model: 'models/text-embedding-004',
        content: { parts: [{ text }] },
      })),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini batch embed error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.embeddings?.map(e => e.values) || [];
}
