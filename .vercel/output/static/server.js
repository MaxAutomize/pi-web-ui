const express = require('express');
const { execFileSync } = require('child_process');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// pi chat endpoint — proxies messages to the local pi agent
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.json({ reply: 'No message received.' });

  try {
    // Run pi with the message as a literal argument (no shell parsing)
    const output = execFileSync('pi', ['chat', message], {
      timeout: 30000,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024
    });
    res.json({ reply: output.trim() || 'Done.' });
  } catch (err) {
    // If pi isn't available, return a helpful fallback
    res.json({ reply: `pi is not reachable on this server. Make sure the pi agent is running locally.\n\nYour message was: ${message}` });
  }
});

// Export for Vercel serverless
module.exports = app;

// Local dev server (skipped on Vercel)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`pi web ui → http://localhost:${PORT}`));
}