import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getDb } from '../db/init.js';
import { ingestDocument, queryRAG } from '../services/rag.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.txt', '.csv', '.md', '.json', '.html'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not supported. Allowed: ${allowed.join(', ')}`));
    }
  },
});

const router = Router();

// POST /api/rag/upload - upload and ingest a document
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const docId = uuidv4();
    const db = getDb();

    db.prepare(`
      INSERT INTO documents (id, filename, original_name, mime_type, size_bytes, status)
      VALUES (?, ?, ?, ?, ?, 'uploaded')
    `).run(docId, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size);
    db.close();

    // Start ingestion asynchronously
    ingestDocument(docId).catch(err => {
      console.error(`[RAG Route] Ingestion failed for ${docId}:`, err);
    });

    res.json({
      documentId: docId,
      filename: req.file.originalname,
      status: 'processing',
      message: 'Document uploaded. Embedding in progress.',
    });
  } catch (error) {
    console.error('[RAG Route] Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// GET /api/rag/documents - list all documents
router.get('/documents', (req, res) => {
  try {
    const db = getDb();
    const docs = db.prepare(`
      SELECT id, original_name, mime_type, size_bytes, status, chunk_count, created_at, updated_at
      FROM documents ORDER BY created_at DESC
    `).all();
    db.close();

    res.json({ documents: docs });
  } catch (error) {
    console.error('[RAG Route] List error:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

// DELETE /api/rag/documents/:id - delete a document and its chunks
router.delete('/documents/:id', (req, res) => {
  try {
    const db = getDb();
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);

    if (!doc) {
      db.close();
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete chunks first (cascade should handle this, but be explicit)
    db.prepare('DELETE FROM document_chunks WHERE document_id = ?').run(req.params.id);
    db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
    db.close();

    // Delete physical file
    const filePath = path.join(UPLOADS_DIR, doc.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[RAG Route] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// POST /api/rag/query - query the knowledge base
router.post('/query', async (req, res) => {
  try {
    const { query, topK } = req.body;
    if (!query) return res.status(400).json({ error: 'query is required' });

    const results = await queryRAG(query, topK || 5);
    res.json({ results });
  } catch (error) {
    console.error('[RAG Route] Query error:', error);
    res.status(500).json({ error: 'RAG query failed' });
  }
});

export default router;
