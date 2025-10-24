const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.use(cors());                // tighten origins in production
app.use(express.json());

console.log('Bearer ' + process.env.DEEPSEEK_API_KEY)

app.post('/chat', async (req, res) => {
  try {
    const { messages, model = 'deepseek/deepseek-r1-0528-qwen3-8b:free' } = req.body ?? {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages[] required' });
    }

    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.DEEPSEEK_API_KEY,
        'Content-Type': 'application/json',
        //'HTTP-Referer': 'https://yourapp.example', 
        'X-Title': 'chat-bot-app',
      },
      body: JSON.stringify({ model, messages }),
    });
    const text = await r.text();
    if (!r.ok) {
      console.error('OpenRouter error', r.status, text);
      return res.status(r.status).json({ error: 'OpenRouter error', detail: text });
    }
    const data = JSON.parse(text);
    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) return res.status(502).json({ error: 'Invalid OpenRouter response', data });

    res.json({ role: 'assistant', content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log('API on :' + port));