import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the Linea visual workspace", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Línea — convierte ideas en visuales<\/title>/i);
  assert.match(html, /Convierte tu idea en una visual/);
  assert.match(html, /Generar visual/);
  assert.match(html, /Onboarding \/ Sprint 01/);
  assert.doesNotMatch(html, /Your site is taking shape/);
});

test("keeps the product free of the starter preview", async () => {
  await assert.rejects(access(new URL("app/_sites-preview", root)));
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /VisualCanvas/);
});
