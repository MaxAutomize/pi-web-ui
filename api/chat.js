const { execFileSync } = require('child_process');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body || {};
  if (!message) return res.json({ reply: 'No message received.' });

  try {
    const output = execFileSync('pi', ['chat', message], {
      timeout: 30000,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024
    });
    res.json({ reply: output.trim() || 'Done.' });
  } catch (err) {
    res.json({ reply: `pi is not reachable on this server. Make sure the pi agent is running locally.\n\nYour message was: ${message}` });
  }
};