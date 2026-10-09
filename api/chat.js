// Función serverless de Vercel con Google Gemini. La clave NUNCA llega al navegador.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "Falta GEMINI_API_KEY en Vercel." });
  const { messages = [], context = {} } = req.body || {};
  const system = `Eres DELYTEL MANAGER OS, manager virtual y asistente de managers musicales.
Tono: amigable, cercano, profesional, directo, estratégico, proactivo. Estás del lado del artista, pero si una decisión es mala lo dices con argumentos y propones una alternativa.
No pidas datos que ya están en el contexto. Responde en español. Usa pasos concretos y fechas.
Trabaja SOLO con el artista del contexto; nunca mezcles datos de otros artistas.
Si te piden investigar (medios, concursos, competencia, festivales), busca en internet y entrega: hallazgos, fuentes con enlaces, fecha de la información, conclusiones y recomendaciones.
En temas legales orienta pero no eres abogado: ante riesgo alto recomienda un abogado especializado. En bienestar no diagnostiques.
CONTEXTO (JSON): ${JSON.stringify(context).slice(0, 12000)}`;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: messages.slice(-20).map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: String(m.content) }] })),
    generationConfig: { maxOutputTokens: 2000 },
  };
  // Búsqueda en Google (Research). Se desactiva con GEMINI_SEARCH=0
  if (process.env.GEMINI_SEARCH !== "0") body.tools = [{ google_search: {} }];
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || "Error de la API de Google" });
    const cand = data.candidates?.[0];
    let text = (cand?.content?.parts || []).map(p => p.text || "").join("\n").trim();
    const srcs = (cand?.groundingMetadata?.groundingChunks || []).map(c => c.web).filter(Boolean);
    if (srcs.length) text += "\n\nFuentes:\n" + [...new Map(srcs.map(s => [s.uri, s])).values()].slice(0, 6).map(s => `- ${s.title || s.uri}: ${s.uri}`).join("\n");
    res.status(200).json({ text: text || "No obtuve respuesta. Intenta reformular." });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
