import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FinancialData } from '../types';

export const GrowthChart: React.FC = () => {
  const [data, setData] = useState<FinancialData[]>([]);

  useEffect(() => {
    // Generate initial mock data
    let currentRevenue = 10;
    let currentAgents = 5;
    const initialData: FinancialData[] = [];
    
    for (let i = 20; i >= 0; i--) {
      const time = new Date();
      time.setMinutes(time.getMinutes() - i * 5);
      initialData.push({
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        revenue: currentRevenue,
        agents: currentAgents
      });
      
      // Simulate growth
      currentRevenue += Math.random() * 2;
      if (currentRevenue > currentAgents * 2.5) {
        currentAgents += 1; // Simulate duplication
      }
    }
    setData(initialData);

    // Update data periodically
    const interval = setInterval(() => {
      setData(prev => {
        const last = prev[prev.length - 1];
        const newRevenue = last.revenue + (Math.random() * 1.5);
        let newAgents = last.agents;
        
        // Simulate duplication condition ($1 profit equivalent abstractly represented here)
        if (newRevenue - last.revenue > 1.0) {
            newAgents += 1;
        }

        const newData = [...prev.slice(1), {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          revenue: Number(newRevenue.toFixed(2)),
          agents: newAgents
        }];
        return newData;
      });
    }, 5000);

    // Listen for real revenue events from Razorpay
    const handleRealRevenue = (e: Event) => {
      const customEvent = e as CustomEvent;
      const amount = customEvent.detail.amount;
      
      setData(prev => {
        const last = prev[prev.length - 1];
        // Massive spike in revenue and agents based on the $1 = 1 agent rule
        const newAgents = last.agents + Math.floor(amount);
        const newRevenue = last.revenue + amount;

        const newDataPoint = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          revenue: Number(newRevenue.toFixed(2)),
          agents: newAgents
        };
        
        return [...prev.slice(1), newDataPoint];
      });
    };

    window.addEventListener('agent-revenue', handleRealRevenue);

    return () => {
      clearInterval(interval);
      window.removeEventListener('agent-revenue', handleRealRevenue);
    };
  }, []);

  return (
    <div className="bg-cyber-800 border border-cyber-700 rounded-lg p-4 h-64 flex flex-col">
      <h3 className="text-sm text-gray-400 mb-4 font-mono uppercase tracking-wider">Swarm Metrics (Live)</h3>
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a24" />
            <XAxis dataKey="time" stroke="#4b5563" fontSize={10} tickMargin={10} />
            <YAxis yAxisId="left" stroke="#00f0ff" fontSize={10} />
            <YAxis yAxisId="right" orientation="right" stroke="#39ff14" fontSize={10} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1a1a24', borderRadius: '4px' }}
              itemStyle={{ fontSize: '12px' }}
              labelStyle={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue (USD Eq)" stroke="#00f0ff" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="stepAfter" dataKey="agents" name="Active Agents" stroke="#39ff14" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
