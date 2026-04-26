import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../Icons';
import { uploadDocument, listDocuments, deleteDocument, queryKnowledgeBase } from '../../api';
import { RagDocument } from '../../types';

export const RagManager: React.FC = () => {
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [querying, setQuerying] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      const data = await listDocuments();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
    const interval = setInterval(loadDocuments, 5000);
    return () => clearInterval(interval);
  }, [loadDocuments]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadDocument(file);
      await loadDocuments();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document and all its embeddings?')) return;
    try {
      await deleteDocument(id);
      await loadDocuments();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setQuerying(true);
    try {
      const data = await queryKnowledgeBase(query);
      setQueryResults(data.results || []);
    } catch (err: any) {
      alert(`Query failed: ${err.message}`);
    } finally {
      setQuerying(false);
    }
  };

  const totalChunks = documents.reduce((sum, d) => sum + (d.chunk_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Icon name="Brain" className="text-cyber-accent" />
            Knowledge Base (RAG)
          </h2>
          <p className="text-gray-400 text-sm mt-1">Managed by CORTEX-1 (COO) — Gemini embeddings, vector search</p>
        </div>
        <div className="flex items-center gap-3 bg-cyber-800 border border-cyber-700 px-4 py-2 rounded-lg">
          <span className="text-xs font-mono text-cyber-accent">{totalChunks} vectors</span>
          <span className="text-gray-600">|</span>
          <span className="text-xs font-mono text-gray-400">{documents.length} docs</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload + Query */}
        <div className="space-y-6">
          <div className="bg-cyber-800 border border-cyber-700 rounded-lg p-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon name="UploadCloud" className="w-5 h-5 text-gray-400" />
              Upload Document
            </h3>
            <label className="border-2 border-dashed border-cyber-700 hover:border-cyber-accent/50 bg-cyber-900/50 rounded-lg p-6 text-center transition-colors cursor-pointer block group">
              <input type="file" className="hidden" accept=".pdf,.txt,.csv,.md,.json,.html" onChange={handleUpload} disabled={uploading} />
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Icon name="Loader" className="w-8 h-8 text-cyber-accent animate-spin" />
                  <p className="text-sm text-cyber-accent">Uploading & Embedding...</p>
                </div>
              ) : (
                <>
                  <Icon name="FileText" className="w-8 h-8 text-gray-500 mx-auto mb-3 group-hover:text-cyber-accent transition-colors" />
                  <p className="text-sm text-gray-300 font-medium">Click or drop file here</p>
                  <p className="text-xs text-gray-500 mt-1">PDF, TXT, CSV, MD, JSON, HTML (50MB max)</p>
                </>
              )}
            </label>
          </div>

          <div className="bg-cyber-800 border border-cyber-700 rounded-lg p-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon name="Search" className="w-5 h-5 text-gray-400" />
              Query Knowledge Base
            </h3>
            <form onSubmit={handleQuery} className="space-y-3">
              <input
                type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-cyber-900 border border-cyber-700 rounded px-4 py-2 text-gray-100 text-sm focus:outline-none focus:border-cyber-accent"
                placeholder="Search the hive mind..."
              />
              <button type="submit" disabled={querying}
                className="w-full bg-cyber-accent/10 text-cyber-accent border border-cyber-accent/50 py-2 rounded text-sm hover:bg-cyber-accent/20 disabled:opacity-50">
                {querying ? 'Searching...' : 'Search'}
              </button>
            </form>
            {queryResults.length > 0 && (
              <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                {queryResults.map((r, i) => (
                  <div key={i} className="bg-cyber-900 p-3 rounded border border-cyber-700 text-xs">
                    <div className="text-gray-500 mb-1">Source: {r.source_document} | Similarity: {(r.similarity * 100).toFixed(1)}%</div>
                    <div className="text-gray-300 line-clamp-3">{r.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Document Table */}
        <div className="lg:col-span-2">
          <div className="bg-cyber-800 border border-cyber-700 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-cyber-700 bg-cyber-900/50">
              <h3 className="font-semibold flex items-center gap-2">
                <Icon name="Layers" className="w-5 h-5 text-gray-400" />
                Embedded Documents
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-400 uppercase bg-cyber-900/80 border-b border-cyber-700">
                  <tr>
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Chunks</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Ingested</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(doc => (
                    <tr key={doc.id} className="border-b border-cyber-700/50 hover:bg-cyber-700/30">
                      <td className="px-4 py-3 font-medium text-gray-200 flex items-center gap-2">
                        <Icon name="File" className="w-4 h-4 text-gray-500" />
                        {doc.original_name}
                      </td>
                      <td className="px-4 py-3">
                        {doc.status === 'embedded' ? (
                          <span className="text-cyber-success flex items-center gap-1 text-xs"><Icon name="CheckCircle" className="w-3 h-3" /> Embedded</span>
                        ) : doc.status === 'processing' ? (
                          <span className="text-cyber-accent flex items-center gap-1 text-xs"><Icon name="Loader" className="w-3 h-3 animate-spin" /> Processing</span>
                        ) : doc.status === 'failed' ? (
                          <span className="text-cyber-warning flex items-center gap-1 text-xs"><Icon name="AlertTriangle" className="w-3 h-3" /> Failed</span>
                        ) : (
                          <span className="text-gray-400 text-xs">Uploaded</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-400">{doc.chunk_count}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{(doc.size_bytes / 1024).toFixed(1)} KB</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(doc.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDelete(doc.id)} className="text-gray-500 hover:text-cyber-warning transition-colors">
                          <Icon name="Trash2" className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {documents.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {loading ? 'Loading...' : 'No documents uploaded yet. Upload files to build the knowledge base.'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
