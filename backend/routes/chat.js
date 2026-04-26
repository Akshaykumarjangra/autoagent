import { WebSocketServer, WebSocket } from 'ws';
import { streamContent } from '../services/gemini.js';
import { getChatSystemPrompt } from '../services/agents.js';
import { queryRAG } from '../services/rag.js';
import { getDb } from '../db/init.js';

/**
 * Setup the /ws-chat WebSocket endpoint for live Gemini chat
 */
export function setupChatWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname === '/ws-chat') {
      const taskId = url.searchParams.get('taskId');

      if (!taskId) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
      }

      // Verify the task exists
      const db = getDb();
      const task = db.prepare('SELECT * FROM agent_tasks WHERE id = ?').get(taskId);
      db.close();

      if (!task) {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, { taskId, task });
      });
    }
    // Don't handle other upgrade paths here - let the main server handle /ws-proxy
  });

  wss.on('connection', (ws, request, context) => {
    const { taskId, task } = context;
    const conversationHistory = [];
    const systemPrompt = getChatSystemPrompt(task.type);

    console.log(`[Chat] Client connected for task ${taskId}`);

    ws.send(JSON.stringify({
      type: 'system',
      message: 'Connected to Autonomix AI Agent. How can I help you today?',
    }));

    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type !== 'user_message' || !msg.content) return;

        // Add user message to history
        conversationHistory.push({
          role: 'user',
          parts: [{ text: msg.content }],
        });

        // Optionally query RAG for context
        let ragContext = '';
        try {
          const results = await queryRAG(msg.content, 2);
          if (results.length > 0) {
            ragContext = `\n\n[Relevant knowledge base context: ${results.map(r => r.content).join(' | ')}]`;
          }
        } catch {
          // RAG not critical for chat
        }

        const fullSystemPrompt = systemPrompt + ragContext;

        // Send typing indicator
        ws.send(JSON.stringify({ type: 'typing', status: true }));

        // Stream response from Gemini
        let fullResponse = '';
        try {
          for await (const chunk of streamContent(conversationHistory, fullSystemPrompt)) {
            fullResponse += chunk;
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'stream_chunk',
                content: chunk,
              }));
            }
          }
        } catch (streamError) {
          console.error('[Chat] Stream error:', streamError);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Agent encountered an error. Please try again.',
          }));
          return;
        }

        // Add assistant response to history
        conversationHistory.push({
          role: 'model',
          parts: [{ text: fullResponse }],
        });

        // Send stream end
        ws.send(JSON.stringify({
          type: 'stream_end',
          fullContent: fullResponse,
        }));

      } catch (error) {
        console.error('[Chat] Message processing error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message.',
        }));
      }
    });

    ws.on('close', () => {
      console.log(`[Chat] Client disconnected from task ${taskId}`);
    });

    ws.on('error', (err) => {
      console.error(`[Chat] WebSocket error for task ${taskId}:`, err);
    });
  });

  return wss;
}
