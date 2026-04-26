import { v4 as uuidv4 } from 'uuid';
import { generateEmbedding, batchEmbed } from './gemini.js';
import { getDb } from '../db/init.js';

/**
 * Chunk a document into overlapping segments
 */
export function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);

    // Try to break on sentence boundary
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > chunkSize * 0.5) {
        chunk = chunk.slice(0, breakPoint + 1);
      }
    }

    chunks.push(chunk.trim());
    start += chunk.length - overlap;
    if (start <= 0 && chunks.length > 0) start = end; // safety
  }

  return chunks.filter(c => c.length > 20); // skip tiny fragments
}

/**
 * Ingest a document: chunk it, embed each chunk, store in DB
 */
export async function ingestDocument(documentId) {
  const db = getDb();
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(documentId);

  if (!doc) {
    db.close();
    throw new Error(`Document ${documentId} not found`);
  }

  try {
    // Update status to processing
    db.prepare("UPDATE documents SET status = 'processing', updated_at = datetime('now') WHERE id = ?").run(documentId);

    // Read file content
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const filePath = path.join(uploadsDir, doc.filename);

    const content = await fs.readFile(filePath, 'utf-8');

    // Chunk the document
    const chunks = chunkText(content);
    console.log(`[RAG] Document ${doc.original_name}: ${chunks.length} chunks created`);

    // Batch embed (in groups of 100)
    const BATCH_SIZE = 100;
    const allEmbeddings = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const embeddings = await batchEmbed(batch);
      allEmbeddings.push(...embeddings);
      console.log(`[RAG] Embedded batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}`);
    }

    // Store chunks with embeddings
    const insertChunk = db.prepare(`
      INSERT INTO document_chunks (id, document_id, chunk_index, content, embedding)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((chunks, embeddings) => {
      for (let i = 0; i < chunks.length; i++) {
        insertChunk.run(
          uuidv4(),
          documentId,
          i,
          chunks[i],
          JSON.stringify(embeddings[i])
        );
      }
    });

    insertMany(chunks, allEmbeddings);

    // Update document status
    db.prepare(`
      UPDATE documents SET status = 'embedded', chunk_count = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(chunks.length, documentId);

    console.log(`[RAG] Document ${doc.original_name} fully embedded (${chunks.length} chunks)`);
    db.close();
    return { chunkCount: chunks.length };

  } catch (error) {
    db.prepare("UPDATE documents SET status = 'failed', updated_at = datetime('now') WHERE id = ?").run(documentId);
    db.close();
    throw error;
  }
}

/**
 * Query the RAG system: embed query, find most similar chunks
 */
export async function queryRAG(query, topK = 5) {
  const queryEmbedding = await generateEmbedding(query);
  if (!queryEmbedding) return [];

  const db = getDb();
  const allChunks = db.prepare(`
    SELECT dc.id, dc.content, dc.embedding, d.original_name as source_document
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE dc.embedding IS NOT NULL AND d.status = 'embedded'
  `).all();
  db.close();

  if (allChunks.length === 0) return [];

  // Calculate cosine similarity for each chunk
  const scored = allChunks.map(chunk => {
    const chunkEmbedding = JSON.parse(chunk.embedding);
    const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
    return { ...chunk, similarity, embedding: undefined };
  });

  // Sort by similarity descending, return top K
  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK).map(({ id, content, source_document, similarity }) => ({
    id, content, source_document, similarity,
  }));
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}
