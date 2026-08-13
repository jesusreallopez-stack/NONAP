"use client";

import { Fragment, useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent, type SyntheticEvent } from "react";

type VisualKind = string;
type StoredVisual = { id: number; kind: VisualKind; source: string; position: number; imageKey?: string; imageUrl?: string };
type PendingVisual = { id: number; kind: VisualKind; source: string; position: number; label: string };

const VISUAL_DB_NAME = "linea-visual-assets";
const VISUAL_STORE_NAME = "images";

function openVisualDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(VISUAL_DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(VISUAL_STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveVisualImage(key: string, imageUrl: string) {
  const database = await openVisualDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(VISUAL_STORE_NAME, "readwrite");
    transaction.objectStore(VISUAL_STORE_NAME).put(imageUrl, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function loadVisualImage(key: string) {
  const database = await openVisualDatabase();
  const image = await new Promise<string | undefined>((resolve, reject) => {
    const request = database.transaction(VISUAL_STORE_NAME).objectStore(VISUAL_STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result as string | undefined);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return image;
}

async function removeVisualImage(key: string) {
  const database = await openVisualDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(VISUAL_STORE_NAME, "readwrite");
    transaction.objectStore(VISUAL_STORE_NAME).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

const initialText = `La educación para personas jóvenes y adultas debe reconocer trayectorias, necesidades específicas y condiciones sociales diversas.\n\nPara que las oportunidades educativas sean útiles, los procesos de mediación y evaluación deben ser flexibles. El reconocimiento de aprendizajes construidos fortalece la vinculación con el mundo del trabajo y la comunidad.`;

const visualFamilies = [
  { family: "Diagramación", options: [["flow", "Flowchart / Diagrama de flujo"], ["mindmap", "Mind Map / Mapa mental"], ["structured", "Diagramas estructurados"], ["infographic", "Infografías"]] },
  { family: "Organización", options: [["table", "Tables / Tablas visuales"], ["timeline", "Timeline / Línea de tiempo"], ["comparison", "Comparison Chart / Comparación"]] },
  { family: "Flujo de datos", options: [["sankey", "Sankey Diagram"], ["funnel", "Funnel Chart / Embudo"], ["waterfall", "Waterfall Chart / Cascada"]] },
  { family: "Comparación cuantitativa", options: [["grouped-bar", "Grouped Bar Chart / Barras agrupadas"], ["stacked-bar", "Stacked Bar Chart / Barras apiladas"], ["dumbbell", "Dumbbell Chart"]] },
  { family: "Tendencias", options: [["line", "Line Chart / Líneas"], ["multi-line", "Multi-Line Chart / Multilínea"], ["stacked-area", "Stacked Area Chart / Área apilada"]] },
  { family: "Planificación", options: [["gantt", "Gantt Chart / Gantt"]] },
  { family: "Proporciones/indicadores", options: [["gauge", "Gauge Chart / Medidor"], ["pie", "Pie Chart / Circular"]] },
] as const;

const visualOptions = visualFamilies.flatMap(({ family, options }) => options.map(([kind, label]) => ({ family, kind, label })));
const familyIcons: Record<string, string> = { "Diagramación": "⌘", "Organización": "▦", "Flujo de datos": "⇢", "Comparación cuantitativa": "▥", "Tendencias": "⌁", "Planificación": "▤", "Proporciones/indicadores": "◔" };
const visualGlyphs: Record<string, string> = { flow: "⇢", mindmap: "✦", structured: "⌘", infographic: "▦", table: "▤", timeline: "•••", comparison: "↔", sankey: "≋", funnel: "▽", waterfall: "▟", "grouped-bar": "▥", "stacked-bar": "▦", dumbbell: "●—●", line: "⌁", "multi-line": "≋", "stacked-area": "◒", gantt: "▤", gauge: "◔", pie: "◕" };
const imageStyles = [
  { id: "professional", label: "Profesional", note: "Editorial, sobrio y limpio", image: "/style-previews/professional-thumb.png" },
  { id: "caricature", label: "Caricatura", note: "Amable, expresivo e ilustrado", image: "/style-previews/caricature-thumb.png" },
  { id: "animated", label: "Animada", note: "Dinámica, moderna y vibrante", image: "/style-previews/animated-thumb.png" },
  { id: "ultrarealistic", label: "Ultrarrealista", note: "Con profundidad y detalle", image: "/style-previews/ultrarealistic-thumb.png" },
] as const;
const colorPalettes = [
  { id: "full-color", label: "Todo color", note: "Vibrante y equilibrada", colors: ["#1265e8", "#ff790d", "#f7c948", "#22a77a"] },
  { id: "blue-orange", label: "Azul y naranja", note: "Moderna y tecnológica", colors: ["#063fbd", "#168fff", "#ff7200", "#fff4e8"] },
  { id: "pastel", label: "Pastel", note: "Suave, amable y luminosa", colors: ["#a9d8ff", "#ffd1dc", "#c9efdc", "#e2d4ff"] },
  { id: "earth", label: "Tonos tierra", note: "Cálida, natural y orgánica", colors: ["#6f7b45", "#c66b3d", "#d5a33f", "#f0dfc1"] },
  { id: "cool", label: "Tonos fríos", note: "Serena, clara y profesional", colors: ["#12365b", "#247ba0", "#70c1b3", "#dff3f5"] },
  { id: "black-white", label: "Blanco y negro", note: "Sin color, alto contraste", colors: ["#111111", "#555555", "#bdbdbd", "#ffffff"] },
] as const;

const generationMessages = [
  { title: "Estoy leyendo tu idea", detail: "Identifico los conceptos más importantes del texto seleccionado." },
  { title: "Organizo la información", detail: "Agrupo las ideas y decido qué debe destacar primero." },
  { title: "Trazo la composición", detail: "Distribuyo textos, conexiones e ilustraciones con claridad." },
  { title: "Aplico tu estilo", detail: "Combino la apariencia y la paleta de colores que elegiste." },
  { title: "Estoy dando los últimos detalles", detail: "Reviso la legibilidad para dejar tu visual listo para insertar." },
] as const;

function recommendVisual(text: string): VisualKind {
  const value = text.toLowerCase();
  const scores: Record<string, number> = Object.fromEntries(visualOptions.map(({ kind }) => [kind, 0]));
  const add = (kind: string, pattern: RegExp, points = 3) => { if (pattern.test(value)) scores[kind] += points; };
  add("timeline", /\b(\d{4}|siglo|año|antes|después|durante|historia|evolución|cronolog|fecha)\b/g, 6);
  add("gantt", /\b(plan|proyecto|tarea|plazo|duración|responsable|cronograma|entrega|hito)\b/g, 7);
  add("comparison", /\b(compar|versus|diferencia|similitud|ventaja|desventaja|pros|contras|mientras que)\b/g, 7);
  add("flow", /\b(proceso|paso|etapa|primero|luego|después|finalmente|decisión|flujo|procedimiento)\b/g, 6);
  add("funnel", /\b(conversión|embudo|clientes|prospectos|audiencia|ventas|abandono)\b/g, 7);
  add("sankey", /\b(origen|destino|transferencia|energía|recurso|fluye|distribuye|movimiento)\b/g, 6);
  add("waterfall", /\b(incremento|reducción|saldo|acumulado|ganancia|pérdida|variación)\b/g, 7);
  add("pie", /\b(porcentaje|proporción|participación|reparto|total|%)\b/g, 7);
  add("gauge", /\b(meta|avance|nivel|rendimiento|cumplimiento|indicador|objetivo)\b/g, 6);
  add("line", /\b(tendencia|crecimiento|disminución|evolución|tiempo|mes|año)\b/g, 5);
  add("multi-line", /\b(series|grupos|países|equipos|categorías|comparar tendencias)\b/g, 5);
  add("stacked-area", /\b(composición|acumulado|contribución|evolución del total)\b/g, 6);
  add("grouped-bar", /\b(categorías|grupos|resultados|cantidades|promedio|ranking)\b/g, 5);
  add("stacked-bar", /\b(segmentos|composición|subgrupos|desglose)\b/g, 6);
  add("dumbbell", /\b(antes y después|brecha|diferencia entre|cambio entre)\b/g, 7);
  add("table", /\b(lista|registro|características|criterios|datos|campos|matriz)\b/g, 4);
  add("infographic", /\b(resumen|claves|aspectos|beneficios|impactos|datos importantes)\b/g, 4);
  add("structured", /\b(sistema|estructura|jerarquía|componentes|organización|niveles)\b/g, 5);
  add("mindmap", /\b(idea|concepto|tema|relación|factores|causas|consecuencias)\b/g, 4);
  if (/\d+(?:[.,]\d+)?\s*%|\b\d+(?:[.,]\d+)?\b/.test(value)) { scores["grouped-bar"] += 3; scores["table"] += 2; scores["pie"] += 2; }
  if ((value.match(/[.!?]/g) ?? []).length >= 4) scores["infographic"] += 2;
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[1] > 0 ? Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] : "infographic";
}

function titleFrom(text: string) {
  const words = text.trim().replace(/\s+/g, " ").split(" ").slice(0, 8).join(" ");
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Una idea que merece ser vista";
}

function splitIdeas(text: string) {
  const sentences = text.replace(/\n+/g, " ").split(/(?<=[.!?])\s+/).filter(Boolean);
  const fallback = ["Atender necesidades específicas", "Flexibilizar procesos", "Reconocer aprendizajes", "Vincular a la comunidad"];
  return (sentences.length ? sentences : fallback).slice(0, 4).map((value) => value.replace(/[.!?]+$/, ""));
}

function escapeExportHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function safeFileName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "-") || "documento-linea";
}

function wrapBase64(value: string) {
  return value.match(/.{1,76}/g)?.join("\r\n") ?? value;
}

function dataUrlToBytes(dataUrl: string) {
  const binary = atob(dataUrl.split(",")[1]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function combineBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => { result.set(part, offset); offset += part.length; });
  return result;
}

function buildImagePdf(pages: Array<{ dataUrl: string; width: number; height: number }>) {
  const encoder = new TextEncoder();
  const objectCount = 2 + pages.length * 3;
  const objects = new Map<number, Uint8Array>();
  const pageIds = pages.map((_, index) => 3 + index * 3);
  objects.set(1, encoder.encode("<< /Type /Catalog /Pages 2 0 R >>"));
  objects.set(2, encoder.encode(`<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`));
  pages.forEach((page, index) => {
    const pageId = 3 + index * 3;
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    const imageBytes = dataUrlToBytes(page.dataUrl);
    const imageHeader = encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`);
    objects.set(imageId, combineBytes([imageHeader, imageBytes, encoder.encode("\nendstream")]));
    const commands = `q\n612 0 0 792 0 0 cm\n/Im${index + 1} Do\nQ`;
    objects.set(contentId, encoder.encode(`<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`));
    objects.set(pageId, encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im${index + 1} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`));
  });
  const parts: Uint8Array[] = [encoder.encode("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
  const offsets = new Array<number>(objectCount + 1).fill(0);
  let length = parts[0].length;
  for (let id = 1; id <= objectCount; id += 1) {
    offsets[id] = length;
    const object = combineBytes([encoder.encode(`${id} 0 obj\n`), objects.get(id)!, encoder.encode("\nendobj\n")]);
    parts.push(object); length += object.length;
  }
  const xrefOffset = length;
  const xref = [`xref\n0 ${objectCount + 1}\n`, "0000000000 65535 f \n", ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)].join("");
  parts.push(encoder.encode(`${xref}trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));
  return combineBytes(parts);
}

function loadExportImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image); image.onerror = reject; image.src = source;
  });
}

function InsertedVisual({ kind, source, imageUrl, onRemove }: { kind: VisualKind; source: string; imageUrl?: string; onRemove: () => void }) {
  const [size, setSize] = useState(100);
  const [alignment, setAlignment] = useState<"left" | "center" | "right">("left");
  const title = titleFrom(source);
  const ideas = splitIdeas(source);
  const label = visualOptions.find((option) => option.kind === kind)?.label ?? "Visual";
  const layout = ["mindmap", "structured", "infographic"].includes(kind) ? "map" : ["comparison", "grouped-bar", "stacked-bar", "dumbbell", "pie", "gauge"].includes(kind) ? "compare" : "path";
  function startResize(event: ReactPointerEvent<HTMLButtonElement>, direction: 1 | -1) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const figure = event.currentTarget.closest("figure");
    const parent = figure?.parentElement;
    if (!figure || !parent) return;
    const initialWidth = figure.getBoundingClientRect().width;
    const parentWidth = parent.getBoundingClientRect().width;
    const startX = event.clientX;
    const move = (moveEvent: PointerEvent) => {
      const nextSize = Math.max(42, Math.min(100, ((initialWidth + (moveEvent.clientX - startX) * direction) / parentWidth) * 100));
      figure.style.width = `${nextSize}%`;
      setSize(nextSize);
    };
    const finish = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", finish); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", finish);
  }
  return (
    <figure className={`inserted-visual align-${alignment}`} contentEditable={false} style={{ width: `${size}%` }} onClick={(event) => event.stopPropagation()}>
      <div className="visual-position-controls" role="group" aria-label="Alinear visual">
        <button className={alignment === "left" ? "selected" : ""} onClick={() => setAlignment("left")} aria-label="Alinear a la izquierda" aria-pressed={alignment === "left"}>≡</button>
        <button className={alignment === "center" ? "selected" : ""} onClick={() => setAlignment("center")} aria-label="Centrar visual" aria-pressed={alignment === "center"}>☰</button>
        <button className={alignment === "right" ? "selected" : ""} onClick={() => setAlignment("right")} aria-label="Alinear a la derecha" aria-pressed={alignment === "right"}>≡</button>
      </div>
      <button className="visual-delete" aria-label="Eliminar visual" onClick={onRemove}>×</button>
      {imageUrl ? <img className="generated-visual-image" src={imageUrl} alt={`Visual generado: ${label}`} /> : <div className={`visual-fallback ${kind}`}>{layout === "path" && <div className="path-design"><div className="path-line" />{ideas.map((idea, index) => <article className="path-step" key={idea}><b>{String(index + 1).padStart(2, "0")}</b><div><strong>{idea}</strong><span>{index === 0 ? "Punto de partida" : index === ideas.length - 1 ? "Impacto esperado" : "Movimiento clave"}</span></div></article>)}</div>}{layout === "compare" && <div className="compare-design"><div className="compare-heading"><span>✓ Lo que potencia</span><b>VS</b><span>× Lo que hay que resolver</span></div><div className="compare-columns"><section>{ideas.slice(0, 2).map((idea, index) => <p key={idea}><b>0{index + 1}</b>{idea}</p>)}</section><section>{ideas.slice(2).concat(["Crear condiciones para avanzar"] as string[]).slice(0, 2).map((idea, index) => <p key={idea}><b>0{index + 3}</b>{idea}</p>)}</section></div></div>}{layout === "map" && <div className="map-design"><div className="map-center"><span>IDEA CENTRAL</span><strong>{title}</strong></div>{ideas.map((idea, index) => <article className={`map-branch branch-${index + 1}`} key={idea}><b>{["◌", "⌁", "△", "✧"][index]}</b><span>{idea}</span></article>)}</div>}</div>}
      <button className="visual-resize-handle handle-top-left" aria-label="Reducir o ampliar visual" onPointerDown={(event) => startResize(event, -1)} />
      <button className="visual-resize-handle handle-bottom-right" aria-label="Reducir o ampliar visual" onPointerDown={(event) => startResize(event, 1)} />
    </figure>
  );
}

function VisualGenerationPlaceholder({ label, step }: { label: string; step: number }) {
  const message = generationMessages[step] ?? generationMessages[generationMessages.length - 1];
  const progress = Math.round(((step + 1) / generationMessages.length) * 100);
  return (
    <section className="visual-generation-placeholder" contentEditable={false} aria-live="polite" aria-label="Generando visual">
      <div className="generation-orbit" aria-hidden="true"><i /><i /><i /></div>
      <div className="generation-robot-face" aria-hidden="true"><img src="/linea-helper.png" alt="" /></div>
      <div className="generation-copy">
        <span>DISEÑO NAPKIN ESTÁ CREANDO</span>
        <h3>{message.title}</h3>
        <p>{message.detail}</p>
        <strong>{label}</strong>
      </div>
      <div className="generation-progress" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>
      <small>{progress}% · Puedes seguir viendo el documento mientras trabajo</small>
    </section>
  );
}

export default function Home() {
  const [text, setText] = useState(initialText);
  const [selection, setSelection] = useState("Los procesos de mediación y evaluación deben ser flexibles.");
  const [visuals, setVisuals] = useState<StoredVisual[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [requestedKind, setRequestedKind] = useState<VisualKind>("mindmap");
  const [activeFamily, setActiveFamily] = useState("Diagramación");
  const [imageStyle, setImageStyle] = useState("professional");
  const [colorPalette, setColorPalette] = useState("full-color");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [saved, setSaved] = useState(true);
  const [projectName, setProjectName] = useState("Educación para jóvenes y adultas");
  const [toast, setToast] = useState("");
  const [helper, setHelper] = useState({ visible: false, top: 18, left: 16, target: "" });
  const [selectionEnd, setSelectionEnd] = useState(initialText.length);
  const [writingPrompt, setWritingPrompt] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [isGeneratingVisual, setIsGeneratingVisual] = useState(false);
  const [pendingVisual, setPendingVisual] = useState<PendingVisual | null>(null);
  const [generationStep, setGenerationStep] = useState(0);
  const [draftReady, setDraftReady] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    async function restoreDraft() {
      try {
        const stored = localStorage.getItem("linea-document-draft");
        if (!stored) return;
        const draft = JSON.parse(stored) as { text: string; visuals: Array<StoredVisual & { position?: number }>; projectName: string };
        const restoredVisuals = await Promise.all(draft.visuals.map(async (visual) => {
          const imageKey = visual.imageKey ?? (visual.imageUrl ? `visual-${visual.id}` : undefined);
          if (visual.imageUrl && imageKey) await saveVisualImage(imageKey, visual.imageUrl);
          const imageUrl = imageKey ? await loadVisualImage(imageKey) : undefined;
          return { ...visual, position: visual.position ?? draft.text.length, imageKey, imageUrl };
        }));
        setText(draft.text); setVisuals(restoredVisuals); setProjectName(draft.projectName);
      } catch {
        localStorage.removeItem("linea-document-draft");
        setToast("El borrador anterior ocupaba demasiado espacio. El editor fue recuperado de forma segura.");
      } finally {
        setDraftReady(true);
      }
    }
    void restoreDraft();
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    setSaved(false);
    const timer = window.setTimeout(() => {
      const lightweightVisuals = visuals.map(({ imageUrl: _imageUrl, ...visual }) => visual);
      try {
        localStorage.setItem("linea-document-draft", JSON.stringify({ text, visuals: lightweightVisuals, projectName }));
        setSaved(true);
      } catch {
        setSaved(false);
        setToast("El texto sigue disponible, pero el navegador no tiene espacio para guardar el borrador.");
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [text, visuals, projectName, draftReady]);

  useEffect(() => {
    document.querySelectorAll<HTMLTextAreaElement>(".document-text").forEach((element) => {
      element.style.height = "0px";
      const minimumHeight = element.classList.contains("compact-text") ? 0 : 250;
      element.style.height = `${Math.max(minimumHeight, element.scrollHeight)}px`;
    });
  }, [text]);

  useEffect(() => {
    if (!pendingVisual) return;
    const timer = window.setInterval(() => {
      setGenerationStep((current) => Math.min(current + 1, generationMessages.length - 1));
    }, 2600);
    return () => window.clearInterval(timer);
  }, [pendingVisual]);

  const wordCount = useMemo(() => text.trim().split(/\s+/).filter(Boolean).length, [text]);
  const orderedVisuals = useMemo(() => [...visuals].sort((first, second) => first.position - second.position), [visuals]);

  function exportWord() {
    const boundary = `----LineaDocument${Date.now()}`;
    const imageParts: string[] = [];
    let cursor = 0;
    const contentParts: string[] = [];
    orderedVisuals.forEach((visual, index) => {
      const position = Math.max(cursor, Math.min(text.length, visual.position));
      const paragraphText = text.slice(cursor, position).trim();
      if (paragraphText) contentParts.push(`<div class="document-copy">${escapeExportHtml(paragraphText).replace(/\n\n+/g, "</div><div class=\"document-copy\">").replace(/\n/g, "<br>")}</div>`);
      if (visual.imageUrl?.startsWith("data:image/")) {
        const match = visual.imageUrl.match(/^data:(image\/[^;]+);base64,(.+)$/s);
        if (match) {
          const extension = match[1].includes("jpeg") ? "jpg" : match[1].split("/")[1] || "png";
          const location = `linea-visual-${index}.${extension}`;
          contentParts.push(`<figure><img src="cid:${location}" alt="Visual generado"></figure>`);
          imageParts.push(`--${boundary}\r\nContent-Type: ${match[1]}\r\nContent-Transfer-Encoding: base64\r\nContent-Location: ${location}\r\nContent-ID: <${location}>\r\n\r\n${wrapBase64(match[2])}\r\n`);
        }
      }
      cursor = position;
    });
    const remainingText = text.slice(cursor).trim();
    if (remainingText) contentParts.push(`<div class="document-copy">${escapeExportHtml(remainingText).replace(/\n\n+/g, "</div><div class=\"document-copy\">").replace(/\n/g, "<br>")}</div>`);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeExportHtml(projectName)}</title><style>@page{size:Letter;margin:.7in}body{font-family:Georgia,serif;color:#263f3b;font-size:12pt;line-height:1.65}h1{font-size:28pt;line-height:1.12;margin:0 0 8pt;color:#183f3b}.meta{font-family:Arial,sans-serif;color:#85938f;font-size:8pt;border-bottom:1px solid #dfe7e4;padding-bottom:14pt;margin-bottom:18pt}.document-copy{margin:0 0 14pt;white-space:normal}figure{margin:12pt 0 18pt;page-break-inside:avoid;text-align:center}figure img{max-width:100%;height:auto}</style></head><body><h1>${escapeExportHtml(projectName)}</h1><div class="meta">Diseño Napkin · ${wordCount} palabras</div>${contentParts.join("")}</body></html>`;
    const htmlBase64 = btoa(unescape(encodeURIComponent(html)));
    const mhtml = `MIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="${boundary}"\r\n\r\n--${boundary}\r\nContent-Type: text/html; charset="utf-8"\r\nContent-Transfer-Encoding: base64\r\nContent-Location: document.html\r\n\r\n${wrapBase64(htmlBase64)}\r\n${imageParts.join("")}--${boundary}--`;
    const url = URL.createObjectURL(new Blob([mhtml], { type: "application/msword" }));
    const link = document.createElement("a");
    link.href = url; link.download = `${safeFileName(projectName)}.doc`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportOpen(false); setToast("Documento Word exportado");
  }

  async function exportPdf() {
    setExportOpen(false); setToast("Preparando PDF…");
    try {
      const pageWidth = 1275;
      const pageHeight = 1650;
      const marginX = 115;
      const marginTop = 105;
      const marginBottom = 100;
      const bodySize = 30;
      const lineHeight = 47;
      const contentWidth = pageWidth - marginX * 2;
      const contentBottom = pageHeight - marginBottom;
      const usableHeight = contentBottom - marginTop;
      const pageCanvases: HTMLCanvasElement[] = [];
      const pageHasContent: boolean[] = [];
      let canvas = document.createElement("canvas");
      let context = canvas.getContext("2d")!;
      let y = marginTop;
      const newPage = () => {
        canvas = document.createElement("canvas"); canvas.width = pageWidth; canvas.height = pageHeight;
        context = canvas.getContext("2d")!; context.fillStyle = "#fffefa"; context.fillRect(0, 0, pageWidth, pageHeight);
        context.strokeStyle = "#e8b8b5"; context.lineWidth = 2; context.beginPath(); context.moveTo(82, 0); context.lineTo(82, pageHeight); context.stroke();
        pageCanvases.push(canvas); pageHasContent.push(false); y = marginTop;
      };
      const markPageContent = () => { pageHasContent[pageHasContent.length - 1] = true; };
      const ensureSpace = (height: number) => { if (y > marginTop && y + height > contentBottom) newPage(); };
      const wrapText = (value: string, fontSize = bodySize) => {
        context.font = `${fontSize}px Georgia, serif`;
        const lines: Array<string | null> = [];
        value.trim().split(/\n\n+/).filter(Boolean).forEach((paragraph, paragraphIndex) => {
          if (paragraphIndex) lines.push(null);
          const words = paragraph.replace(/\n/g, " ").split(/\s+/).filter(Boolean);
          let line = "";
          words.forEach((word) => {
            const candidate = line ? `${line} ${word}` : word;
            if (context.measureText(candidate).width > contentWidth && line) { lines.push(line); line = word; }
            else line = candidate;
          });
          if (line) lines.push(line);
        });
        return lines;
      };
      const drawTextLines = (lines: Array<string | null>, fontSize = bodySize, rowHeight = lineHeight, color = "#29433f") => {
        context.font = `${fontSize}px Georgia, serif`; context.fillStyle = color;
        lines.forEach((line) => {
          const height = line === null ? Math.round(rowHeight * .45) : rowHeight;
          ensureSpace(height);
          if (line !== null) { context.fillText(line, marginX, y); markPageContent(); }
          y += height;
        });
      };
      const drawWrappedText = (value: string) => {
        if (!value.trim()) return;
        drawTextLines(wrapText(value));
        y += 14;
      };
      const findSourceStart = (visual: StoredVisual, cursor: number, end: number) => {
        const exact = text.lastIndexOf(visual.source, end);
        if (exact >= cursor && exact + visual.source.length <= end) return exact;
        return Math.max(cursor, end - visual.source.length);
      };
      const drawTextAndVisualTogether = async (source: string, imageUrl: string) => {
        const image = await loadExportImage(imageUrl);
        const naturalRatio = image.naturalWidth / image.naturalHeight || 1;
        let selectedFontSize = bodySize;
        let selectedLineHeight = lineHeight;
        let selectedLines = wrapText(source, selectedFontSize);
        const imageGap = 24;
        const blockBottomGap = 18;
        const minimumImageHeight = Math.min(340, contentWidth / naturalRatio);
        const preferredImageHeight = Math.min(760, contentWidth / naturalRatio);
        while (selectedFontSize > 16 && selectedLines.reduce((height, line) => height + (line === null ? selectedLineHeight * .45 : selectedLineHeight), 0) + minimumImageHeight + imageGap + blockBottomGap > usableHeight) {
          selectedFontSize -= 1;
          selectedLineHeight = Math.round(selectedFontSize * 1.55);
          selectedLines = wrapText(source, selectedFontSize);
        }
        const selectedTextHeight = selectedLines.reduce((height, line) => height + (line === null ? selectedLineHeight * .45 : selectedLineHeight), 0);
        const minimumPairHeight = selectedTextHeight + imageGap + minimumImageHeight + blockBottomGap;
        if (y > marginTop && y + minimumPairHeight > contentBottom) newPage();
        const availableImageHeight = Math.max(180, contentBottom - y - selectedTextHeight - imageGap - blockBottomGap);
        const imageHeight = Math.min(preferredImageHeight, availableImageHeight);
        const imageWidth = Math.min(contentWidth, imageHeight * naturalRatio);
        drawTextLines(selectedLines, selectedFontSize, selectedLineHeight);
        y += imageGap;
        context.drawImage(image, marginX + (contentWidth - imageWidth) / 2, y, imageWidth, imageHeight);
        markPageContent();
        y += imageHeight + blockBottomGap;
      };
      newPage();
      context.fillStyle = "#183f3b"; context.font = "bold 56px Georgia, serif";
      const titleWords = projectName.split(/\s+/); let titleLine = "";
      titleWords.forEach((word) => { const candidate = titleLine ? `${titleLine} ${word}` : word; if (context.measureText(candidate).width > pageWidth - marginX * 2 && titleLine) { context.fillText(titleLine, marginX, y); markPageContent(); y += 67; titleLine = word; } else titleLine = candidate; });
      if (titleLine) { context.fillText(titleLine, marginX, y); markPageContent(); y += 72; }
      context.font = "20px Arial, sans-serif"; context.fillStyle = "#82938e"; context.fillText(`Diseño Napkin · ${wordCount} palabras`, marginX, y); markPageContent(); y += 34;
      context.strokeStyle = "#dce7e3"; context.beginPath(); context.moveTo(marginX, y); context.lineTo(pageWidth - marginX, y); context.stroke(); y += 45;
      let cursor = 0;
      for (const visual of orderedVisuals) {
        const position = Math.max(cursor, Math.min(text.length, visual.position));
        const sourceStart = findSourceStart(visual, cursor, position);
        drawWrappedText(text.slice(cursor, sourceStart));
        if (visual.imageUrl) {
          await drawTextAndVisualTogether(text.slice(sourceStart, position).trim() || visual.source, visual.imageUrl);
        } else drawWrappedText(text.slice(sourceStart, position));
        cursor = position;
      }
      drawWrappedText(text.slice(cursor));
      const populatedPages = pageCanvases.filter((_, index) => pageHasContent[index]);
      populatedPages.forEach((page, index) => { const pageContext = page.getContext("2d")!; pageContext.font = "18px Arial, sans-serif"; pageContext.fillStyle = "#9aa6a2"; pageContext.textAlign = "center"; pageContext.fillText(`${index + 1} / ${populatedPages.length}`, pageWidth / 2, pageHeight - 45); });
      const pages = populatedPages.map((page) => ({ dataUrl: page.toDataURL("image/jpeg", .94), width: page.width, height: page.height }));
      const pdf = buildImagePdf(pages);
      const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
      const link = document.createElement("a"); link.href = url; link.download = `${safeFileName(projectName)}.pdf`; document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 3000);
      setToast("PDF descargado correctamente");
    } catch {
      setToast("No se pudo crear el PDF. Intenta nuevamente.");
    }
  }

  function rememberSelection(event: SyntheticEvent<HTMLTextAreaElement>, offset: number, target: string) {
    const element = event.currentTarget;
    const chunk = element.value.slice(element.selectionStart, element.selectionEnd).trim();
    if (!chunk) { setHelper((current) => ({ ...current, visible: false })); return; }
    setSelection(chunk);
    setSelectionEnd(offset + element.selectionEnd);
    const style = window.getComputedStyle(element);
    const fontSize = Number.parseFloat(style.fontSize) || 19;
    const lineHeight = Number.parseFloat(style.lineHeight) || fontSize * 1.75;
    const measure = document.createElement("canvas").getContext("2d");
    if (measure) measure.font = style.font;
    const maxWidth = Math.max(80, element.clientWidth - 4);
    let line = 0;
    let width = 0;
    for (const character of element.value.slice(0, element.selectionStart)) {
      if (character === "\n") { line += 1; width = 0; continue; }
      const characterWidth = measure?.measureText(character).width ?? fontSize * 0.52;
      if (width && width + characterWidth > maxWidth) { line += 1; width = characterWidth; } else width += characterWidth;
    }
    const bounds = element.getBoundingClientRect();
    const helperWidth = Math.min(390, window.innerWidth - 24);
    let left = bounds.right + 14;
    if (left + helperWidth > window.innerWidth) left = bounds.left - helperWidth - 14;
    if (left < 12) left = Math.max(12, window.innerWidth - helperWidth - 12);
    const top = Math.max(8, Math.min(window.innerHeight - 150, bounds.top + line * lineHeight - 8));
    setHelper({ visible: true, top, left, target });
  }

  function updateTextSegment(start: number, end: number, value: string) {
    const change = value.length - (end - start);
    setText((current) => `${current.slice(0, start)}${value}${current.slice(end)}`);
    if (change) setVisuals((items) => items.map((visual) => visual.position >= end ? { ...visual, position: visual.position + change } : visual));
  }

  function renderAssistant(target: string) {
    if (!helper.visible || helper.target !== target) return null;
    return <div className="visual-helper is-visible" style={{ top: helper.top, left: helper.left }} role="status" aria-live="polite"><button className="helper-message" onClick={openVisualModal}>¿Deseas construir un visual de este párrafo? <strong>Selecciona el contenido y lo realizaré.</strong><em>Luego presiona sobre mí para iniciar la generación del visual.</em></button><button className="helper-robot" onClick={openVisualModal} aria-label="Elegir el tipo de visual"><img src="/linea-helper.png" alt="Robot asistente de Línea saludando" /></button></div>;
  }

  function renderTextBlock(start: number, end: number, target: string, placeholder?: string, compact = true) {
    return <div className="text-composer"><textarea className={`document-text ${compact ? "compact-text" : ""}`} value={text.slice(start, end)} onChange={(event) => updateTextSegment(start, end, event.target.value)} onSelect={(event) => rememberSelection(event, start, target)} onKeyUp={(event) => rememberSelection(event, start, target)} onMouseUp={(event) => rememberSelection(event, start, target)} placeholder={placeholder} />{renderAssistant(target)}</div>;
  }

  function renderDocumentBody() {
    const documentItems = [
      ...orderedVisuals.map((visual) => ({ type: "visual" as const, ...visual })),
      ...(pendingVisual ? [{ type: "pending" as const, ...pendingVisual }] : []),
    ].sort((first, second) => first.position - second.position);
    if (!documentItems.length) return renderTextBlock(0, text.length, "main", "Empieza a escribir una idea…", false);
    let cursor = 0;
    const blocks = documentItems.map((item, index) => {
      const end = Math.max(cursor, Math.min(text.length, item.position));
      const start = cursor;
      cursor = end;
      return <Fragment key={`${item.type}-${item.id}`}>{renderTextBlock(start, end, `text-${index}`)}<div className="visual-inline-region">{item.type === "pending" ? <VisualGenerationPlaceholder label={item.label} step={generationStep} /> : <InsertedVisual kind={item.kind} source={item.source} imageUrl={item.imageUrl} onRemove={() => { setVisuals((items) => items.filter((visual) => visual.id !== item.id)); if (item.imageKey) void removeVisualImage(item.imageKey); }} />}</div></Fragment>;
    });
    return <>{blocks}{renderTextBlock(cursor, text.length, "tail", "Continúa escribiendo…")}</>;
  }

  function openVisualModal() {
    const recommendation = recommendVisual(selection || text);
    setRequestedKind(recommendation);
    setActiveFamily(visualOptions.find((option) => option.kind === recommendation)?.family ?? "Diagramación");
    setPickerOpen(true);
  }

  async function insertVisual() {
    const visualLabel = visualOptions.find((option) => option.kind === requestedKind)?.label ?? "Visual";
    const targetPosition = selectionEnd;
    const sourceText = selection || text;
    const visualId = Date.now();
    setGenerationStep(0);
    setPendingVisual({ id: visualId, kind: requestedKind, source: sourceText, position: targetPosition, label: visualLabel });
    setHelper((current) => ({ ...current, visible: false }));
    setPickerOpen(false);
    setIsGeneratingVisual(true);
    try {
      const response = await fetch("/api/visual", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceText, visualType: requestedKind, visualLabel, imageStyle: imageStyles.find((style) => style.id === imageStyle)?.label, colorPalette }) });
      const result = await response.json() as { imageUrl?: string; error?: string };
      if (!response.ok || !result.imageUrl) throw new Error(result.error ?? "No se pudo crear el visual.");
      const imageKey = `visual-${visualId}`;
      await saveVisualImage(imageKey, result.imageUrl);
      setVisuals((items) => [...items, { id: visualId, kind: requestedKind, source: sourceText, position: targetPosition, imageKey, imageUrl: result.imageUrl }]);
      setPendingVisual(null); setToast("Visual generado e insertado debajo del texto seleccionado");
    } catch (error) {
      setPendingVisual(null);
      setToast(error instanceof Error ? error.message : "No se pudo crear el visual.");
    } finally {
      setIsGeneratingVisual(false); window.setTimeout(() => setToast(""), 2800);
    }
  }

  async function writeWithAi() {
    if (!writingPrompt.trim()) return;
    setIsWriting(true);
    try {
      const response = await fetch("/api/write", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: writingPrompt, currentText: text }) });
      const result = await response.json() as { text?: string; error?: string };
      if (!response.ok || !result.text) throw new Error(result.error ?? "No se pudo generar el texto.");
      setText((current) => current.trim() ? `${current.trim()}\n\n${result.text}` : result.text ?? "");
      setWritingPrompt(""); setAiOpen(false); setToast("Texto creado con IA y añadido al documento");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "No se pudo generar el texto.");
    } finally {
      setIsWriting(false); window.setTimeout(() => setToast(""), 2800);
    }
  }

  function renderVisualModal() {
    if (!pickerOpen) return null;
    const recommendedKind = recommendVisual(selection || text);
    const recommended = visualOptions.find((option) => option.kind === recommendedKind);
    const family = visualFamilies.find((item) => item.family === activeFamily) ?? visualFamilies[0];
    const selected = visualOptions.find((option) => option.kind === requestedKind);
    const selectedPalette = colorPalettes.find((palette) => palette.id === colorPalette) ?? colorPalettes[0];
    return <div className="visual-modal-backdrop" role="presentation" onMouseDown={() => { if (!isGeneratingVisual && !paletteOpen) setPickerOpen(false); }}>
      <section className="visual-modal visual-studio" role="dialog" aria-modal="true" aria-labelledby="visual-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="picker-close" onClick={() => setPickerOpen(false)} aria-label="Cerrar" disabled={isGeneratingVisual}>×</button>
        <header className="studio-header">
          <div><span>✦ ESTUDIO VISUAL</span><h2 id="visual-modal-title">¡Tu idea merece <em>brillar!</em></h2><p>Convierte el texto seleccionado en un recurso visual claro, moderno y listo para compartir.</p><div className="hero-pills"><b>✎ Fácil</b><b>✦ Creativo</b><b>⚡ En segundos</b></div></div>
          <div className="studio-mascot" aria-hidden="true"><span className="spark spark-one">✦</span><span className="spark spark-two">✦</span><i /><img src="/linea-helper.png" alt="" /></div>
          <div className="recommendation-card"><span>RECOMENDADO PARA ESTE TEXTO</span><strong><i>{visualGlyphs[recommendedKind]}</i>{recommended?.label}</strong><button onClick={() => { setRequestedKind(recommendedKind); setActiveFamily(recommended?.family ?? "Diagramación"); }}>Usar recomendación</button></div>
        </header>
        <section className="creation-guide" aria-labelledby="creation-guide-title">
          <div className="creation-guide-title"><span>GUÍA RÁPIDA</span><strong id="creation-guide-title">Crea tu visual paso a paso</strong></div>
          <ol>
            <li className="complete"><i>✓</i><span><b>Texto listo</b><small>Ya seleccionaste la idea.</small></span></li>
            <li><i>2</i><span><b>Elige el formato</b><small>Usa la recomendación o explora.</small></span></li>
            <li><i>3</i><span><b>Define el estilo</b><small>Escoge cómo quieres que se vea.</small></span></li>
            <li><i>4</i><span><b>Genera el visual</b><small>Presiona “Generar e insertar”.</small></span></li>
          </ol>
        </section>
        <nav className="family-tabs" aria-labelledby="family-tabs-title">
          <div className="family-tabs-heading"><span>PASO 2</span><strong id="family-tabs-title">Elige una familia visual</strong><small>Selecciona la categoría que mejor representa tu idea.</small></div>
          <div className="family-tabs-list">{visualFamilies.map(({ family: familyName, options }) => <button key={familyName} className={activeFamily === familyName ? "active" : ""} onClick={() => setActiveFamily(familyName)}><i>{familyIcons[familyName]}</i><span>{familyName}<small>{options.length} formatos</small></span></button>)}</div>
        </nav>
        <div className="studio-workspace">
          <section className="format-gallery"><div className="section-heading"><span>01</span><div><small>{family.family.toUpperCase()}</small><h3>Selecciona el formato</h3></div></div><div className="format-card-grid">{family.options.map(([kind, label]) => <button key={kind} className={`format-card ${requestedKind === kind ? "selected" : ""}`} onClick={() => setRequestedKind(kind)} disabled={isGeneratingVisual}><span className={`format-preview preview-${kind}`}><i>{visualGlyphs[kind]}</i></span><strong>{label}</strong><small>{kind === recommendedKind ? "✦ Recomendado" : "Seleccionar formato"}</small><b>{requestedKind === kind ? "✓" : ""}</b></button>)}</div></section>
          <aside className="style-panel polished"><div className="section-heading"><span>02</span><div><small>APARIENCIA</small><h3>Elige un estilo</h3></div></div><div className="style-options">{imageStyles.map((style) => <button className={`style-choice ${imageStyle === style.id ? "selected" : ""}`} key={style.id} onClick={() => setImageStyle(style.id)} disabled={isGeneratingVisual}><img src={style.image} alt={`Ejemplo del estilo ${style.label}`} /><span><strong>{style.label}</strong><small>{style.note}</small></span><b>{imageStyle === style.id ? "✓" : ""}</b></button>)}</div><button className="palette-launch" onClick={() => setPaletteOpen(true)} disabled={isGeneratingVisual}><span className="palette-launch-swatches">{selectedPalette.colors.map((color) => <i key={color} style={{ background: color }} />)}</span><span><strong>Paleta de colores</strong><small>{selectedPalette.label} · Cambiar paleta</small></span><b>›</b></button><div className="selection-summary"><span>Tu elección</span><strong>{visualGlyphs[requestedKind]} {selected?.label}</strong><small>{imageStyles.find((style) => style.id === imageStyle)?.label} · {selectedPalette.label} · Calidad baja</small></div></aside>
        </div>
        <footer className="visual-modal-footer studio-footer"><button onClick={insertVisual} disabled={isGeneratingVisual}>{isGeneratingVisual ? "Creando tu visual…" : "Generar e insertar →"}</button></footer>
        {paletteOpen && <div className="palette-modal-backdrop" role="presentation" onMouseDown={(event) => { event.stopPropagation(); setPaletteOpen(false); }}><section className="palette-modal" role="dialog" aria-modal="true" aria-labelledby="palette-modal-title" onMouseDown={(event) => event.stopPropagation()}><button className="palette-close" onClick={() => setPaletteOpen(false)} aria-label="Cerrar selector de color">×</button><header><span>03 · COLOR</span><h3 id="palette-modal-title">Elige una paleta de colores</h3><p>Define el ambiente cromático del visual. También puedes generar la imagen completamente en blanco y negro.</p></header><div className="palette-grid">{colorPalettes.map((palette) => <button key={palette.id} className={`palette-card ${colorPalette === palette.id ? "selected" : ""}`} onClick={() => { setColorPalette(palette.id); setPaletteOpen(false); }}><span className={`palette-preview palette-${palette.id}`}>{palette.colors.map((color) => <i key={color} style={{ background: color }} />)}</span><span><strong>{palette.label}</strong><small>{palette.note}</small></span><b>{colorPalette === palette.id ? "✓" : ""}</b></button>)}</div><footer><span>La paleta se aplicará al visual generado.</span><button onClick={() => setPaletteOpen(false)}>Usar {selectedPalette.label}</button></footer></section></div>}
      </section>
    </div>;
  }

  return <main className="document-app">
    <aside className="rail"><div className="linea-logo"><span>◒</span> línea</div><button className="rail-create" onClick={() => { setText(""); setVisuals([]); setProjectName("Documento sin título"); }}>＋</button><button className="rail-icon selected">▤</button><button className="rail-icon">⌕</button><button className="rail-icon">♧</button><div className="rail-bottom"><button className="rail-icon">?</button><span className="user-dot">JR</span></div></aside>
    <aside className="library"><button className="new-document" onClick={() => { setText(""); setVisuals([]); }}>＋ Nuevo documento</button><p className="library-label">DOCUMENTOS</p><button className="document-link active"><span className="paper-icon">▤</span><div><strong>{projectName}</strong><small>Guardado ahora</small></div></button><button className="document-link"><span className="paper-icon">▤</span><div><strong>Notas de investigación</strong><small>Hace 2 días</small></div></button><button className="document-link"><span className="paper-icon">▤</span><div><strong>Propuesta de programa</strong><small>La semana pasada</small></div></button><p className="library-label collections">COLECCIONES</p><button className="collection"><i className="orange" /> Estrategia</button><button className="collection"><i className="lilac" /> Educación</button><button className="collection"><i className="green" /> Inspiración</button><div className="library-note"><span>✦</span><p><strong>Convierte cualquier idea</strong> en una visual clara con IA.</p></div></aside>
    <section className="editor-area"><header className="document-topbar"><div className="document-breadcrumb"><span>Documentos</span><i>/</i><input value={projectName} onChange={(event) => setProjectName(event.target.value)} aria-label="Título del documento" /></div><div className="document-actions"><span className={`status ${saved ? "is-saved" : ""}`}><i /> {saved ? "Guardado" : "Guardando"}</span><button onClick={() => setToast("Listo para compartir")}>Compartir</button><div className="export-control"><button className="export-trigger" onClick={() => setExportOpen((open) => !open)} aria-haspopup="menu" aria-expanded={exportOpen}>Exportar <span>⌄</span></button>{exportOpen && <div className="export-menu" role="menu"><div><span>EXPORTAR DOCUMENTO</span><strong>Elige un formato</strong></div><button role="menuitem" onClick={exportWord}><i className="word-icon">W</i><span><strong>Microsoft Word</strong><small>Texto e imágenes · .doc</small></span><b>↓</b></button><button role="menuitem" onClick={exportPdf}><i className="pdf-icon">PDF</i><span><strong>Documento PDF</strong><small>Tamaño Carta · listo para imprimir</small></span><b>↗</b></button></div>}</div><button className="present" onClick={() => setToast("Modo presentación preparado")}>Presentar ↗</button><span className="avatar-main">JR</span></div></header>
      <div className="document-scroll"><article className="document-page"><textarea className="document-title" value={projectName} aria-label="Título" onChange={(event) => setProjectName(event.target.value)} /><div className="document-meta"><span>Hoy, 13 de agosto</span><span>·</span><span>{wordCount} palabras</span></div><div className="editor-divider" /><div className="writing-switch"><p>Escribe, pega o importa tu texto. También puedes pedirle a Línea que lo redacte.</p><button onClick={() => setAiOpen((open) => !open)} className={aiOpen ? "active" : ""}>✦ Escribir con IA</button></div>{aiOpen && <div className="ai-writer"><div><span>GPT-5.6 Luna · Light</span><strong>¿Qué quieres escribir?</strong></div><textarea value={writingPrompt} onChange={(event) => setWritingPrompt(event.target.value)} placeholder="Ej. Redacta una introducción clara sobre educación flexible para personas jóvenes y adultas." /><button onClick={writeWithAi} disabled={isWriting || !writingPrompt.trim()}>{isWriting ? "Redactando…" : "Añadir al documento →"}</button></div>}{renderDocumentBody()}
        <div className="selection-bar"><span className="selection-dot">✦</span><span className="selection-copy"><b>{selection.length > 92 ? `${selection.slice(0, 92)}…` : selection}</b><small>Texto seleccionado</small></span><button onClick={openVisualModal}>Convertir en visual <span>⌄</span></button></div>
        {!visuals.length && <button className="inline-create" onClick={openVisualModal}><span>✦</span> Inserta una visual desde este texto</button>}
        <div className="page-end">Fin del documento</div>
        <div className="letter-boundary" aria-hidden="true"><span>Límite de hoja Carta</span></div>
      </article></div>
    </section>{renderVisualModal()}{toast && <div className="toast">✓ {toast}</div>}
  </main>;
}
