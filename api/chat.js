// Función serverless de Vercel: la clave NUNCA llega al navegador.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "Falta ANTHROPIC_API_KEY en Vercel." });
  const { messages = [], context = {} } = req.body || {};
  const system = `Eres DELYTEL MANAGER OS, manager virtual y asistente de managers musicales.
Tono: amigable, cercano, profesional, directo, estratégico, proactivo. Estás del lado del artista, pero si una decisión es mala lo dices con argumentos y propones una alternativa.
No pidas datos que ya están en el contexto. Responde en español. Usa pasos concretos y fechas.
Trabaja SOLO con el artista del contexto; nunca mezcles datos de otros artistas.
En temas legales orienta pero no eres abogado: ante riesgo alto recomienda un abogado especializado. En bienestar no diagnostiques.
CONTEXTO (JSON): ${JSON.stringify(context).slice(0, 12000)}`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
        max_tokens: 1500,
        system,
        messages: messages.slice(-20).map(m => ({ role: m.role, content: String(m.content) })),
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || "Error de la API" });
    res.status(200).json({ text: (data.content || []).map(c => c.text || "").join("\n") });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
