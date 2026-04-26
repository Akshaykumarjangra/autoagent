const API_BASE = '/api';

function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem('autonomix_admin_token');
  } catch {
    return null;
  }
}

export function setAdminToken(token: string) {
  try { sessionStorage.setItem('autonomix_admin_token', token); } catch {}
}

export function clearAdminToken() {
  try { sessionStorage.removeItem('autonomix_admin_token'); } catch {}
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const token = getAdminToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
}

// ─── Payment APIs ──────────────────────────
export async function getPaymentConfig() {
  return apiFetch('/payments/config');
}

export async function createOrder(tierId: string, customerEmail?: string, customerName?: string) {
  return apiFetch('/payments/create-order', {
    method: 'POST',
    body: JSON.stringify({ tierId, customerEmail, customerName }),
  });
}

export async function verifyPayment(data: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  tierId: string;
}) {
  return apiFetch('/payments/verify', { method: 'POST', body: JSON.stringify(data) });
}

export async function getPaymentHistory(limit = 50, offset = 0) {
  return apiFetch(`/payments/history?limit=${limit}&offset=${offset}`);
}

// ─── Crypto Payment APIs (NOWPayments) ─────
export async function createCryptoInvoice(tierId: string, customerEmail?: string, customerName?: string) {
  return apiFetch('/payments/crypto/create-invoice', {
    method: 'POST',
    body: JSON.stringify({ tierId, customerEmail, customerName }),
  });
}

export async function getCryptoStatus(orderId: string) {
  return apiFetch(`/payments/crypto/status/${orderId}`);
}

// ─── Agent APIs ────────────────────────────
export async function submitConsultation(taskId: string, topic: string, details: string, customerName: string) {
  return apiFetch('/agents/consultation', {
    method: 'POST',
    body: JSON.stringify({ taskId, topic, details, customerName }),
  });
}

export async function submitWebsite(taskId: string, data: {
  businessName: string; businessType: string; description: string; colorScheme: string;
}) {
  return apiFetch('/agents/website', { method: 'POST', body: JSON.stringify({ taskId, ...data }) });
}

export async function getTaskStatus(taskId: string) {
  return apiFetch(`/agents/task/${taskId}`);
}

export async function listTasks(limit = 50, offset = 0, status?: string) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (status) params.set('status', status);
  return apiFetch(`/agents/tasks?${params}`);
}

// ─── Auth APIs ─────────────────────────────
export async function adminLogin(email: string) {
  const result = await apiFetch('/auth/admin-login', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  if (result.token) setAdminToken(result.token);
  return result;
}

// ─── RAG APIs ──────────────────────────────
export async function uploadDocument(file: File) {
  const formData = new FormData();
  formData.append('document', file);

  const token = getAdminToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/rag/upload`, { method: 'POST', body: formData, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

export async function listDocuments() {
  return apiFetch('/rag/documents');
}

export async function deleteDocument(id: string) {
  return apiFetch(`/rag/documents/${id}`, { method: 'DELETE' });
}

export async function queryKnowledgeBase(query: string) {
  return apiFetch('/rag/query', { method: 'POST', body: JSON.stringify({ query }) });
}

// ─── Analytics APIs ────────────────────────
export async function getDashboardStats() {
  return apiFetch('/analytics/dashboard');
}

export async function trackEvent(eventType: string, eventData?: any) {
  return apiFetch('/analytics/track', {
    method: 'POST',
    body: JSON.stringify({ eventType, eventData }),
  }).catch(() => {}); // fire and forget
}

// ─── Finance APIs ──────────────────────────
export async function getFinancialReport() {
  return apiFetch('/finance/report');
}

export async function getPnL() {
  return apiFetch('/finance/pnl');
}

export async function getGstSummary() {
  return apiFetch('/finance/gst-summary');
}

export async function getComplianceCheck() {
  return apiFetch('/finance/compliance-check');
}

// ─── Health ────────────────────────────────
export async function getHealth() {
  return apiFetch('/health');
}
