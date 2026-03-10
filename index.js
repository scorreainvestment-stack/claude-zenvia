const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const ZENVIA_TOKEN = process.env.ZENVIA_TOKEN;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const ZENVIA_SENDER = process.env.ZENVIA_SENDER;

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  const msg = req.body;
  const userPhone = msg.from;
  const userText = msg.contents?.[0]?.text;
  if (!userText) return;

  try {
    const claudeRes = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: userText }]
      },
      {
        headers: {
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = claudeRes.data.content[0].text;

    await axios.post(
      'https://api.zenvia.com/v2/channels/whatsapp/messages',
      {
        from: ZENVIA_SENDER,
        to: userPhone,
        contents: [{ type: 'text', text: reply }]
      },
      {
        headers: {
          'X-API-TOKEN': ZENVIA_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
});

app.listen(3000, () => console.log('Servidor corriendo'));
