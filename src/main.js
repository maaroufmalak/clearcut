import './style.css';
import { createIcons, Scan, ArrowUpRight, Image, ImageUp, Plus, ShieldCheck, LockKeyhole, Palette, Download } from 'lucide';
import { validateFile, fitDimensions, outputName } from './image-utils';
createIcons({ icons: { Scan, ArrowUpRight, Image, ImageUp, Plus, ShieldCheck, LockKeyhole, Palette, Download } });
const $ = id => document.getElementById(id);
const state = { worker: null, busy: false, original: null, result: null, fileName: 'photo', color: 'transparent', mode: 'original', urls: [], timer: null, job: 0 };
function url(blob) { const value = URL.createObjectURL(blob); state.urls.push(value); return value; }
function showError(message) { $('error').textContent = message; $('error').hidden = false; }
function setBusy(busy) {
  state.busy = busy;
  $('choose-button').disabled = busy;
  $('sample-button').disabled = busy;
  $('file-input').disabled = busy;
  $('status-area').hidden = !busy;
  $('processing-overlay').hidden = !busy;
  $('stage').setAttribute('aria-busy', String(busy));
  if (!busy) clearTimeout(state.timer);
}
function terminate() { state.worker?.terminate(); state.worker = null; clearTimeout(state.timer); }
function render() {
  $('result-tab').disabled = !state.result;
  const resultVisible = state.mode === 'result' && state.result;
  if (state.original) $('preview').src = resultVisible ? state.result : state.original;
  $('stage').style.backgroundColor = resultVisible && state.color !== 'transparent' ? state.color : '';
  $('stage').classList.toggle('checker', !resultVisible || state.color === 'transparent');
  $('original-tab').setAttribute('aria-pressed', String(state.mode === 'original'));
  $('result-tab').setAttribute('aria-pressed', String(state.mode === 'result'));
  $('original-tab').classList.toggle('active', state.mode === 'original');
  $('result-tab').classList.toggle('active', state.mode === 'result');
}
async function prepare(file) {
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error('This photo could not be opened. Try exporting it as JPG or PNG.'); }
  const size = fitDimensions(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size.width; canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) { bitmap.close(); throw new Error('Your browser could not create an image canvas. Try another browser.'); }
  ctx.drawImage(bitmap, 0, 0, size.width, size.height); bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  canvas.width = canvas.height = 1;
  if (!blob) throw new Error('This image is too large for your device. Try a smaller photo.');
  return { blob, ...size };
}
async function processFile(file) {
  if (state.busy) return;
  $('error').hidden = true;
  const error = validateFile(file);
  if (error) return showError(error);
  const job = ++state.job;
  setBusy(true);
  $('status').textContent = 'Opening your photo…';
  $('progress').removeAttribute('value');
  $('result-controls').hidden = true;
  try {
    const prepared = await prepare(file);
    if (job !== state.job) return;
    state.urls.forEach(URL.revokeObjectURL); state.urls = [];
    state.original = url(prepared.blob); state.result = null; state.fileName = file.name || 'photo'; state.mode = 'original';
    $('preview').alt = 'Your selected photo';
    $('sample-tag').hidden = true; $('empty-caption').hidden = true;
    $('image-meta').textContent = `${prepared.width} × ${prepared.height} px${prepared.resized ? ' · resized for your device' : ''}`;
    $('stage-title').textContent = state.fileName.length > 35 ? state.fileName.slice(0, 32) + '…' : state.fileName;
    render();
    $('status').textContent = 'Loading the AI model. The first run downloads about 56 MB…';
    if (!state.worker) state.worker = new Worker(new URL('./removal.worker.js', import.meta.url), { type: 'module' });
    const fail = () => {
      if (job !== state.job) return;
      terminate(); setBusy(false);
      showError('Processing could not finish. Check your connection, try a smaller photo, or use an up-to-date desktop browser. Choose the photo again to retry.');
    };
    state.worker.onerror = fail;
    state.worker.onmessage = ({ data }) => {
      if (job !== state.job) return;
      if (data.type === 'progress') {
        if (data.key.startsWith('fetch:')) {
          const percent = data.total ? Math.round(data.current / data.total * 100) : 0;
          $('status').textContent = percent < 100 ? `Downloading AI files… ${percent}% of current file` : 'Starting the AI model…';
          if (data.total && percent < 100) $('progress').value = percent; else $('progress').removeAttribute('value');
        } else { $('status').textContent = 'Removing the background on your device…'; $('progress').removeAttribute('value'); }
      } else if (data.type === 'done') {
        state.result = url(data.blob); state.mode = 'result';
        $('preview').alt = 'Your photo with the background removed';
        $('result-controls').hidden = false; setBusy(false); render();
        $('status').textContent = 'Your cutout is ready.';
        $('download-button').focus({ preventScroll: true });
      } else if (data.type === 'error') { console.warn('Background removal failed:', data.message); fail(); }
    };
    state.worker.postMessage({ file: prepared.blob, publicPath: new URL('./model/', document.baseURI).href });
    state.timer = setTimeout(() => { if (state.busy) { terminate(); setBusy(false); showError('This is taking too long on your device. Try a smaller photo or a desktop browser, then choose your photo again.'); } }, 300_000);
  } catch (error) { if (job === state.job) { setBusy(false); $('result-controls').hidden = !state.result; showError(error.message || 'Could not open this image. Try another photo.'); } }
}
$('choose-button').onclick = () => $('file-input').click();
$('file-input').onchange = e => { const file = e.target.files[0]; e.target.value = ''; if (file) processFile(file); };
$('sample-button').onclick = async () => {
  if (state.busy) return;
  $('sample-button').disabled = true;
  try { const response = await fetch(new URL('./sample.png', document.baseURI)); if (!response.ok) throw new Error(); const blob = await response.blob(); await processFile(new File([blob], 'plant-sample.png', { type: 'image/png' })); }
  catch { showError('The sample could not load. Please choose a photo from your device.'); }
  finally { $('sample-button').disabled = state.busy; }
};
for (const event of ['dragenter', 'dragover']) $('drop-zone').addEventListener(event, e => { e.preventDefault(); if (!state.busy) $('drop-zone').classList.add('drag-over'); });
for (const event of ['dragleave', 'drop']) $('drop-zone').addEventListener(event, e => { e.preventDefault(); $('drop-zone').classList.remove('drag-over'); });
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); });
document.addEventListener('paste', e => { const file = [...(e.clipboardData?.files || [])].find(f => f.type.startsWith('image/')); if (file) { e.preventDefault(); processFile(file); } });
$('cancel-button').onclick = () => { ++state.job; terminate(); setBusy(false); $('result-controls').hidden = !state.result; $('error').hidden = true; };
$('original-tab').onclick = () => { state.mode = 'original'; render(); };
$('result-tab').onclick = () => { state.mode = 'result'; render(); };
function setColor(color) {
  state.color = color;
  document.querySelectorAll('[data-color]').forEach(button => { const selected = button.dataset.color === color; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected)); });
  $('download-note').textContent = `${color === 'transparent' ? 'Transparent' : 'Color'} background · no watermark`;
  state.mode = 'result'; render();
}
document.querySelectorAll('[data-color]').forEach(button => button.onclick = () => setColor(button.dataset.color));
$('custom-color').oninput = e => setColor(e.target.value);
$('download-button').onclick = async () => {
  if (!state.result) return;
  $('download-button').disabled = true;
  try {
    let downloadUrl = state.result;
    if (state.color !== 'transparent') {
      const bitmap = await createImageBitmap(await (await fetch(state.result)).blob());
      const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = state.color; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0); bitmap.close();
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      canvas.width = canvas.height = 1;
      if (!blob) throw new Error('Could not create your download. Try the transparent option.');
      downloadUrl = URL.createObjectURL(blob);
    }
    const a = document.createElement('a'); a.href = downloadUrl; a.download = outputName(state.fileName); document.body.append(a); a.click(); a.remove();
    if (downloadUrl !== state.result) setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
  } catch (error) { showError(error.message || 'The download failed. Please try again.'); }
  finally { $('download-button').disabled = false; }
};
window.addEventListener('beforeunload', () => { terminate(); state.urls.forEach(URL.revokeObjectURL); });
