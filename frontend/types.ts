import React from 'react';

export interface SectionData {
  id: string;
  title: string;
  iconName: string;
  content: React.ReactNode;
}

export interface AgentLog {
  id: string;
  timestamp: string;
  agentId: string;
  action: string;
  status: 'success' | 'pending' | 'error' | 'info' | 'warning';
  value?: string;
}

export interface FinancialData {
  time: string;
  revenue: number;
  agents: number;
}

export interface RagDocument {
  id: string;
  original_name: string;
  status: 'uploaded' | 'processing' | 'embedded' | 'failed';
  chunk_count: number;
  size_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
  id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  amount: number;
  currency: string;
  tier_name: string;
  customer_email: string;
  status: string;
  agent_type: string;
  task_status: string;
  created_at: string;
}

export interface AgentTask {
  id: string;
  payment_id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  output?: any;
}

export interface DashboardStats {
  revenue: {
    total_revenue: number;
    total_revenue_display: string;
    successful_payments: number;
    total_orders: number;
    week_revenue_display: string;
    today_revenue_display: string;
  };
  revenueByTier: Array<{ tier_name: string; count: number; total: number }>;
  taskStats: { total: number; pending: number; running: number; completed: number; failed: number };
  tasksByType: Array<{ type: string; count: number; completed: number }>;
  ragStats: { total_documents: number; embedded: number; processing: number; total_chunks: number };
  dailyRevenue: Array<{ day: string; revenue: number; orders: number }>;
  recentPayments: PaymentRecord[];
}

// Chat message types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}
