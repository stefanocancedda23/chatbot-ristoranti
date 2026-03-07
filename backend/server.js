import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { Redis } from '@upstash/redis';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const conversations = new Map();

app.post('/chat', async (req, res) => {
  try {
    const { message, sessionId, lang = 'it', client } = req.body;

    // ---------- TOKEN LIMIT ----------
    const month = new Date().toISOString().slice(0, 7);
    const key = `tokens:${client}:${month}`;

    const usedTokens = (await redis.get(key)) || 0;
    const limit = 100000;

    if (usedTokens > limit) {
      return res.json({
        reply: 'Il chatbot ha raggiunto il limite mensile.',
      });
    }

    // ---------- CARICA JSON CLIENTE ----------

    const filePath = path.join(process.cwd(), 'public/data', `${client}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        reply: 'Configurazione cliente non trovata',
      });
    }

    const clientConfig = JSON.parse(fs.readFileSync(filePath));

    // ---------- MEMORIA CONVERSAZIONE ----------

    if (!conversations.has(sessionId)) {
      conversations.set(sessionId, []);
    }

    let history = conversations.get(sessionId);

    history.push({
      role: 'user',
      content: message,
    });

    // ---------- OPENAI ----------

    const completion = await openai.responses.create({
      model: 'gpt-5-mini',
      reasoning: { effort: 'minimal' },
      input: [
        {
          role: 'system',
          content: `Parla solo in lingua: ${lang === 'it' ? 'Italiano' : 'English'}`,
        },
        {
          role: 'system',
          content: `${clientConfig.ai.prompt}`,
        },

        ...history,
      ],

      max_output_tokens: 80,
    });

    const reply =
      completion.output_text ||
      completion.output?.[0]?.content?.[0]?.text ||
      'Mi dispiace, puoi ripetere?';

    history.push({
      role: 'assistant',
      content: reply,
    });

    if (history.length > 6) {
      history = history.slice(-6);
    }

    conversations.set(sessionId, history);

    // ---------- SALVA TOKEN ----------

    const tokens = completion.usage?.total_tokens || 0;
    await redis.incrby(key, tokens);

    res.json({ reply });
  } catch (error) {
    console.error('OpenAI ERROR:', error);
    res.status(500).json({ error: "Errore con l'API OpenAI" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server avviato sulla porta ${PORT}`));
