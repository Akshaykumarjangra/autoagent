import React, { useState, useEffect } from 'react';
import { Icon } from './Icons';
import { createOrder, verifyPayment, getPaymentConfig, trackEvent, createCryptoInvoice } from '../api';
import { ConsultationForm } from './PostPayment/ConsultationForm';
import { WebsiteForm } from './PostPayment/WebsiteForm';
import { ChatPortal } from './PostPayment/ChatPortal';

const TIERS = [
  {
    id: 'matrix-consultation',
    name: 'Matrix Consultation',
    price: '₹1',
    priceNum: 1,
    agents: 1,
    department: 'Consulting Division',
    head: 'ORACLE-7',
    desc: 'Instant, expert AI consultation on ANY topic. Get a 2000+ word strategic report powered by our CEO + MD intelligence layer.',
    highlight: true,
    agentType: 'consultation',
    imageSeed: 'matrix-consult',
  },
  {
    id: 'basic-showcase',
    name: 'Website Forge',
    price: '₹50',
    priceNum: 50,
    agents: 5,
    department: 'Production Division',
    head: 'FORGE-9',
    desc: 'AI-generated stunning landing page. Full HTML, Tailwind CSS, responsive. Looks like a $50K agency build — delivered in seconds.',
    highlight: false,
    agentType: 'website',
    imageSeed: 'basic-showcase',
  },
  {
    id: 'omni-search',
    name: 'Omni-Search Domination',
    price: '₹500',
    priceNum: 500,
    agents: 50,
    department: 'Marketing Division',
    head: 'VIRAL-1',
    desc: 'Full strategic consultation from our entire C-Suite on SEO, AEO, GEO domination. Actionable playbook for search dominance.',
    highlight: false,
    agentType: 'consultation',
    imageSeed: 'omni-search',
  },
  {
    id: 'c-suite-takeover',
    name: 'C-Suite Live Session',
    price: '₹5,000',
    priceNum: 5000,
    agents: 500,
    department: 'Executive Board',
    head: 'AXIOM-1 + NEXUS-PRIME',
    desc: 'Live chat with our CEO & MD agents. Billion-dollar strategic thinking, real-time. Like hiring McKinsey for a fraction of the cost.',
    highlight: false,
    agentType: 'chat',
    imageSeed: 'c-suite',
  },
];

export const HirePortal: React.FC = () => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [razorpayKeyId, setRazorpayKeyId] = useState<string>('');
  const [postPayment, setPostPayment] = useState<{
    taskId: string;
    agentType: string;
    tierName: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPaymentConfig()
      .then((config) => setRazorpayKeyId(config.razorpayKeyId))
      .catch(() => console.warn('Could not load payment config'));
  }, []);

  const handlePayment = async (tier: typeof TIERS[0]) => {
    setProcessingId(tier.id);
    setError(null);

    try {
      trackEvent('checkout_initiated', { tierId: tier.id });

      // 1. Create order on backend
      const order = await createOrder(tier.id);

      // 2. Open Razorpay checkout
      const options = {
        key: razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Autonomix Global Swarm',
        description: `${tier.name} — ${tier.department}`,
        order_id: order.orderId,
        theme: { color: '#00f0ff' },
        handler: async (response: any) => {
          try {
            // 3. Verify payment on backend
            const result = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              tierId: tier.id,
            });

            trackEvent('payment_success', { tierId: tier.id });

            // 4. Dispatch live event for terminal log
            window.dispatchEvent(new CustomEvent('agent-revenue', {
              detail: { amount: tier.priceNum, method: 'Razorpay', department: tier.department },
            }));

            // 5. Show post-payment flow
            setPostPayment({
              taskId: result.taskId,
              agentType: result.agentType,
              tierName: tier.name,
            });
          } catch (err: any) {
            setError(err.message || 'Payment verification failed');
          }
          setProcessingId(null);
        },
        modal: {
          ondismiss: () => {
            setProcessingId(null);
            trackEvent('checkout_dismissed', { tierId: tier.id });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        setError('Payment failed. Please try again.');
        setProcessingId(null);
        trackEvent('payment_failed', { tierId: tier.id, error: resp.error?.description });
      });
      rzp.open();

    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment');
      setProcessingId(null);
    }
  };

  const handleCryptoPayment = async (tier: typeof TIERS[0]) => {
    setProcessingId(tier.id + '-crypto');
    setError(null);
    try {
      trackEvent('crypto_checkout_initiated', { tierId: tier.id });
      const { invoiceUrl } = await createCryptoInvoice(tier.id);
      if (!invoiceUrl) throw new Error('No invoice URL returned');
      window.location.href = invoiceUrl;
    } catch (err: any) {
      setError(err.message || 'Failed to create crypto invoice');
      setProcessingId(null);
    }
  };

  // ─── Post-Payment Views ───────────────────
  if (postPayment) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setPostPayment(null)}
          className="text-gray-400 hover:text-cyber-accent flex items-center gap-2 text-sm transition-colors"
        >
          <Icon name="ArrowLeft" className="w-4 h-4" /> Back to Services
        </button>

        {postPayment.agentType === 'consultation' && (
          <ConsultationForm taskId={postPayment.taskId} tierName={postPayment.tierName} />
        )}
        {postPayment.agentType === 'website' && (
          <WebsiteForm taskId={postPayment.taskId} />
        )}
        {postPayment.agentType === 'chat' && (
          <ChatPortal taskId={postPayment.taskId} />
        )}
      </div>
    );
  }

  // ─── Service Tiers Grid ───────────────────
  return (
    <div className="space-y-6">
      <div className="bg-cyber-900/50 border border-cyber-accent/30 p-5 rounded-lg flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1">
          <h3 className="text-cyber-accent font-bold flex items-center gap-2 mb-2">
            <Icon name="Zap" className="w-5 h-5" />
            Autonomous Digital Workforce — Live & Earning
          </h3>
          <p className="text-sm text-gray-300">
            Every department is staffed by AI agents led by a visionary CEO (AXIOM-1) and an unstoppable Managing Director (NEXUS-PRIME).
            Choose a service below. Pay via Razorpay. Get instant, world-class delivery.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-cyber-800 px-4 py-2 rounded border border-cyber-700 shrink-0">
          <span className="w-2 h-2 rounded-full bg-cyber-success animate-pulse"></span>
          <span className="text-xs font-mono text-gray-400">ALL DEPARTMENTS ONLINE</span>
        </div>
      </div>

      {error && (
        <div className="bg-cyber-warning/10 border border-cyber-warning text-cyber-warning p-4 rounded-lg flex items-center gap-3">
          <Icon name="AlertTriangle" className="w-5 h-5 shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-cyber-warning/60 hover:text-cyber-warning">
            <Icon name="X" className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            className={`bg-cyber-800 border ${tier.highlight ? 'border-cyber-accent shadow-[0_0_20px_rgba(0,240,255,0.15)]' : 'border-cyber-700'} rounded-lg p-5 flex flex-col hover:border-cyber-accent/50 transition-all duration-300 relative overflow-hidden group`}
          >
            {tier.highlight && (
              <div className="absolute top-0 right-0 z-10 bg-cyber-accent text-cyber-900 text-xs font-bold px-3 py-1 rounded-bl-lg">
                MOST POPULAR
              </div>
            )}

            <img
              src={`https://picsum.photos/seed/${tier.imageSeed}/400/200`}
              alt={tier.name}
              className="w-full h-32 object-cover rounded-md mb-4 opacity-70 group-hover:opacity-100 transition-opacity border border-cyber-700"
            />

            <div className="text-[10px] text-purple-400 font-mono uppercase tracking-widest mb-1">
              {tier.department}
            </div>
            <h4 className="text-gray-100 font-bold text-lg">{tier.name}</h4>
            <div className="text-3xl font-mono text-cyber-accent my-3">{tier.price}</div>
            <p className="text-sm text-gray-400 mb-4 flex-1">{tier.desc}</p>

            <div className="text-xs text-gray-500 mb-4 font-mono flex items-center gap-2 bg-cyber-900/50 p-2 rounded">
              <Icon name="Cpu" className="w-3 h-3 text-cyber-accent" />
              Led by {tier.head} • ~{tier.agents} Agent{tier.agents > 1 ? 's' : ''}
            </div>

            <button
              onClick={() => handlePayment(tier)}
              disabled={processingId !== null}
              className={`w-full py-3 px-4 ${
                tier.highlight
                  ? 'bg-cyber-accent text-cyber-900 hover:bg-cyber-accent/90'
                  : 'bg-cyber-accent/10 hover:bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/50'
              } rounded transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-semibold`}
            >
              {processingId === tier.id ? (
                <><Icon name="Loader" className="w-4 h-4 animate-spin" /> Processing...</>
              ) : (
                <><Icon name="CreditCard" className="w-4 h-4" /> Pay {tier.price}</>
              )}
            </button>
            <button
              onClick={() => handleCryptoPayment(tier)}
              disabled={processingId !== null}
              className="mt-2 w-full py-2 px-4 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm font-mono"
              title="Pay with Bitcoin, USDT, ETH, SOL, or any supported crypto"
            >
              {processingId === tier.id + '-crypto' ? (
                <><Icon name="Loader" className="w-4 h-4 animate-spin" /> Opening invoice...</>
              ) : (
                <>₿ Pay with Crypto</>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-cyber-700 flex flex-wrap items-center justify-center gap-6 md:gap-12 text-gray-500 text-sm font-mono">
        <div className="flex items-center gap-2">
          <Icon name="ShieldCheck" className="w-5 h-5 text-cyber-success" />
          <span>256-bit Encryption</span>
        </div>
        <div className="flex items-center gap-2">
          <Icon name="Lock" className="w-5 h-5 text-cyber-success" />
          <span>Razorpay Secured</span>
        </div>
        <div className="flex items-center gap-2">
          <Icon name="Globe" className="w-5 h-5 text-cyber-success" />
          <span>Instant AI Delivery</span>
        </div>
      </div>
    </div>
  );
};
