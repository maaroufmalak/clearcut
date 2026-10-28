import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const manifest = JSON.parse(await readFile(new URL('./resources.json', import.meta.url), 'utf8'));
const root = new URL('../public/model/', import.meta.url);
await mkdir(root, { recursive: true });
const selected = Object.fromEntries(Object.entries(manifest).filter(([key]) => key === '/models/isnet_quint8' || key === '/onnxruntime-web/ort-wasm-simd-threaded.wasm' || key === '/onnxruntime-web/ort-wasm-simd-threaded.mjs'));
if (Object.keys(selected).length !== 3) throw new Error('Expected model and two runtime resources.');
const chunks = [...new Map(Object.values(selected).flatMap(r => r.chunks).map(c => [c.name, c])).values()];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
let total = 0;
for (const chunk of chunks) {
  const target = new URL(chunk.name, root);
  try { if (hash(await readFile(target)) === chunk.hash) { total++; continue; } } catch {}
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(`https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/${chunk.name}`, { signal: AbortSignal.timeout(120000) });
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (hash(bytes) !== chunk.hash) throw new Error('Model asset integrity mismatch');
      await writeFile(target, bytes); lastError = null; break;
    } catch (error) { lastError = error; }
  }
  if (lastError) throw lastError;
  console.log(`Verified AI asset ${++total}/${chunks.length}`);
}
await writeFile(new URL('resources.json', root), JSON.stringify(selected));
console.log(`AI assets ready at ${fileURLToPath(root)}`);
