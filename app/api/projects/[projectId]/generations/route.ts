import { NextResponse } from "next/server";

type VisualType = "flow" | "mindmap" | "timeline";

function makeProposal(sourceText: string, type: VisualType) {
  const sentences = sourceText.replace(/\n+/g, " ").split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 6);
  const labels = sentences.length ? sentences : ["Contexto", "Idea principal", "Siguiente paso", "Resultado"];
  return { type, title: type === "flow" ? "Flujo de trabajo" : type === "mindmap" ? "Mapa de ideas" : "Línea de tiempo", confidence: Math.min(0.96, 0.74 + labels.length * 0.04), documentModel: { layoutIntent: type, nodes: labels.map((label, index) => ({ id: `${type}-${index}`, label: label.replace(/[.!?]+$/, ""), group: index === 0 ? "main" : "supporting" })), edges: labels.slice(0, -1).map((_, index) => ({ from: `${type}-${index}`, to: `${type}-${index + 1}`, relation: "next" })), metrics: [], styleToken: { palette: "editorial", density: "balanced" } } };
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const body = await request.json().catch(() => ({}));
  const sourceText = typeof body.sourceText === "string" ? body.sourceText.trim() : "";
  if (!sourceText) return NextResponse.json({ error: "sourceText es obligatorio" }, { status: 400 });
  const requestedTypes = Array.isArray(body.requestedTypes) ? body.requestedTypes : ["flow", "mindmap", "timeline"];
  const types = requestedTypes.filter((type: unknown): type is VisualType => type === "flow" || type === "mindmap" || type === "timeline");
  const project = await params;
  return NextResponse.json({ generationId: crypto.randomUUID(), projectId: project.projectId, proposals: (types.length ? types : ["flow", "mindmap", "timeline"]).map((type) => makeProposal(sourceText, type)), usage: { inputTokens: sourceText.split(/\s+/).length, outputTokens: 0, provider: "local-fallback" } });
}
