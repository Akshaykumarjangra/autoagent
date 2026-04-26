import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../Icons';
import { ChatMessage } from '../../types';

interface Props {
  taskId: string;
}

export const ChatPortal: React.FC<Props> = ({ taskId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws-chat?taskId=${taskId}`);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'system':
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'system',
            content: data.message,
            timestamp: new Date().toLocaleTimeString(),
          }]);
          break;

        case 'typing':
          setIsTyping(data.status);
          if (data.status) setStreamBuffer('');
          break;

        case 'stream_chunk':
          setIsTyping(false);
          setStreamBuffer(prev => prev + data.content);
          break;

        case 'stream_end':
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: data.fullContent,
            timestamp: new Date().toLocaleTimeString(),
          }]);
          setStreamBuffer('');
          break;

        case 'error':
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'system',
            content: `Error: ${data.message}`,
            timestamp: new Date().toLocaleTimeString(),
          }]);
          setIsTyping(false);
          break;
      }
    };

    return () => { ws.close(); };
  }, [taskId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamBuffer]);

  const sendMessage = () => {
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const msg = input.trim();
    setInput('');

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      timestamp: new Date().toLocaleTimeString(),
    }]);

    wsRef.current.send(JSON.stringify({ type: 'user_message', content: msg }));
  };

  return (
    <div className="bg-cyber-800 border border-cyber-700 rounded-lg flex flex-col h-[70vh]">
      {/* Header */}
      <div className="p-4 border-b border-cyber-700 bg-cyber-900/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cyber-accent/10 border border-cyber-accent flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <Icon name="Bot" className="w-5 h-5 text-cyber-accent" />
          </div>
          <div>
            <h3 className="font-bold text-gray-100">C-Suite Strategic Session</h3>
            <p className="text-xs text-gray-400 font-mono">AXIOM-1 (CEO) + NEXUS-PRIME (MD)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-cyber-success animate-pulse' : 'bg-cyber-warning'}`}></span>
          <span className="text-xs font-mono text-gray-400">{isConnected ? 'LIVE' : 'CONNECTING...'}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-3 ${
              msg.role === 'user'
                ? 'bg-cyber-accent/20 border border-cyber-accent/30 text-gray-100'
                : msg.role === 'system'
                ? 'bg-cyber-900 border border-cyber-700 text-gray-400 text-sm italic'
                : 'bg-cyber-900 border border-cyber-700 text-gray-200'
            }`}>
              {msg.role === 'assistant' && (
                <div className="text-[10px] text-purple-400 font-mono mb-1">AXIOM-1 / NEXUS-PRIME</div>
              )}
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              <div className="text-[10px] text-gray-500 mt-1">{msg.timestamp}</div>
            </div>
          </div>
        ))}

        {/* Streaming response */}
        {streamBuffer && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-3 bg-cyber-900 border border-cyber-700 text-gray-200">
              <div className="text-[10px] text-purple-400 font-mono mb-1">AXIOM-1 / NEXUS-PRIME</div>
              <div className="text-sm whitespace-pre-wrap">{streamBuffer}</div>
              <span className="inline-block w-2 h-4 bg-cyber-accent animate-pulse ml-1"></span>
            </div>
          </div>
        )}

        {isTyping && !streamBuffer && (
          <div className="flex justify-start">
            <div className="bg-cyber-900 border border-cyber-700 rounded-lg p-3 flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-cyber-accent animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 rounded-full bg-cyber-accent animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 rounded-full bg-cyber-accent animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span className="text-xs text-gray-500">Agents thinking...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-cyber-700 bg-cyber-900/50 shrink-0">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask the C-Suite anything..."
            disabled={!isConnected}
            className="flex-1 bg-cyber-900 border border-cyber-700 rounded px-4 py-3 text-gray-100 focus:outline-none focus:border-cyber-accent transition-all disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!isConnected || !input.trim()}
            className="bg-cyber-accent text-cyber-900 px-6 py-3 rounded font-bold hover:bg-cyber-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Icon name="Send" className="w-4 h-4" /> Send
          </button>
        </div>
      </div>
    </div>
  );
};
