const express = require('express');
const { spawn } = require('child_process');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const server = http.createServer(app);

// WebSocket for streaming responses
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let data;
    try { data = JSON.parse(raw); } catch { return; }
    const { message } = data;
    if (!message) return;

    // Detect if it's a slash command
    const isSlash = message.startsWith('/');

    const child = spawn('pi', ['chat', message], {
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let fullOutput = '';

    // Stream stdout chunks to the client in real-time
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      fullOutput += text;
      ws.send(JSON.stringify({ type: 'chunk', text }));
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      fullOutput += text;
      ws.send(JSON.stringify({ type: 'chunk', text }));
    });

    child.on('close', (code) => {
      ws.send(JSON.stringify({ type: 'done', text: fullOutput.trim(), exitCode: code }));
    });

    child.on('error', (err) => {
      ws.send(JSON.stringify({ type: 'error', text: err.message }));
    });
  });
});

// REST fallback (for Vercel / simple clients)
app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  if (!message) return res.json({ reply: 'No message received.' });

  const child = spawn('pi', ['chat', message], {
    env: { ...process.env, FORCE_COLOR: '0' },
    timeout: 120000
  });

  let output = '';
  child.stdout.on('data', (d) => { output += d; });
  child.stderr.on('data', (d) => { output += d; });

  child.on('close', () => { res.json({ reply: output.trim() || 'Done.' }); });
  child.on('error', (err) => { res.json({ reply: `Error: ${err.message}` }); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`pi web ui → http://localhost:${PORT}`));