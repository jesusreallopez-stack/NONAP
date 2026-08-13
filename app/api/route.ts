import { NextResponse } from "next/server";

const model = "gpt-5.6-luna";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const currentText = typeof body.currentText === "string" ? body.currentText.trim() : "";

  if (!prompt) return NextResponse.json({ error: "Describe qué quieres escribir." }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "La generación con IA todavía no está configurada." }, { status: 503 });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      reasoning: { effort: "low" },
      input: [
        {
          role: "system",
          content: "Eres un asistente editorial para Línea, una aplicación que convierte texto en visuales. Escribe en español claro, directo y bien estructurado. Devuelve únicamente el texto solicitado, sin introducciones, sin markdown y sin explicar tu proceso."
        },
        {
          role: "user",
          content: `Solicitud: ${prompt}\n\nTexto ya presente (úsalo como contexto, no lo repitas):\n${currentText || "[Documento vacío]"}`
        }
      ]
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("OpenAI write request failed", response.status, detail);
    return NextResponse.json({ error: "No fue posible generar el texto. Inténtalo de nuevo." }, { status: 502 });
  }

  const result = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  const text = result.output_text ?? result.output?.flatMap((item) => item.content ?? []).filter((item) => item.type === "output_text").map((item) => item.text ?? "").join("") ?? "";
  if (!text.trim()) return NextResponse.json({ error: "La IA no devolvió texto utilizable." }, { status: 502 });

  return NextResponse.json({ text: text.trim(), model, effort: "light" });
}
