import OpenAI from 'openai';
import sql from '../lib/db.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const conversations = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, sessionId, lang = 'it', client } = req.body;

    // recupera cliente dal database
    const clientData = await sql`
      SELECT * FROM clients WHERE id = ${client}
    `;

    const clientConfig = clientData[0];

    if (!clientConfig) {
      return res.status(404).json({ error: 'Cliente non trovato' });
    }

    // controllo limite token
    if (clientConfig.token_used > clientConfig.token_limit) {
      return res.json({
        reply: 'Il chatbot ha raggiunto il limite mensile.',
      });
    }

    // memoria conversazione
    if (!conversations.has(sessionId)) conversations.set(sessionId, []);
    let history = conversations.get(sessionId);

    history.push({
      role: 'user',
      content: message,
    });

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
          content: clientConfig.ai_prompt,
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

    if (history.length > 6) history = history.slice(-6);

    conversations.set(sessionId, history);

    // aggiorna token usati
    await sql`
      UPDATE clients
      SET token_used = token_used + ${completion.usage.total_tokens}
      WHERE id = ${client}
    `;

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore con l'API OpenAI" });
  }
}