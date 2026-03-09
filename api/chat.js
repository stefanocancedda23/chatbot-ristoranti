import OpenAI from "openai";
import fs from "fs";
import path from "path";


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const conversations = new Map();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, sessionId, lang = "it", client } = req.body;

    // ✅ Limite token
    const month = new Date().toISOString().slice(0, 7);
    const key = `tokens:${client}:${month}`;

    const limit = 100000;

    if (usedTokens > limit) {
      return res.json({ reply: "Il chatbot ha raggiunto il limite mensile." });
    }

    // ✅ Leggi JSON cliente
    const filePath = path.join(process.cwd(), "public/data", `${client}.json`);
    const clientConfig = JSON.parse(fs.readFileSync(filePath));

    // ✅ Memoria conversazione
    if (!conversations.has(sessionId)) conversations.set(sessionId, []);
    let history = conversations.get(sessionId);
    history.push({ role: "user", content: message });

    // ✅ OpenAI
    const completion = await openai.responses.create({
      model: "gpt-5-mini",
      reasoning: { effort: "minimal" },
      input: [
        { role: "system", content: `Parla solo in lingua: ${lang === "it" ? "Italiano" : "English"}` },
        { role: "system", content: clientConfig.ai.prompt },
        ...history
      ],
      max_output_tokens: 80
    });

    const reply = completion.output_text || completion.output?.[0]?.content?.[0]?.text || "Mi dispiace, puoi ripetere?";
    history.push({ role: "assistant", content: reply });
    if (history.length > 6) history = history.slice(-6);
    conversations.set(sessionId, history);

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore con l'API OpenAI" });
  }
}