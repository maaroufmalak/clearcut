// Brush history stores paths, not full image snapshots, to limit memory use.
export function createBrushEditor({ stage, canvas, toolbar, toggle, options, size, sizeLabel, undo, reset, cursor, notice, onActivate }) {
  const ctx = canvas.getContext('2d');
  let base = null, strokes = [], current = null, enabled = false, generation = 0;
  const update = () => {
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.textContent = enabled ? 'Done brushing' : 'Erase with brush';
    options.hidden = !enabled;
    canvas.classList.toggle('brushing', enabled);
    undo.disabled = !strokes.length || !!current;
    reset.disabled = !strokes.length || !!current;
    sizeLabel.textContent = `${size.value} px`;
    if (!enabled) cursor.hidden = true;
  };
  function fit() {
    if (!base) return;
    const ratio = Math.min(stage.clientWidth / canvas.width, stage.clientHeight / canvas.height);
    canvas.style.width = `${canvas.width * ratio}px`;
    canvas.style.height = `${canvas.height * ratio}px`;
    cursor.hidden = true;
  }
  const observer = new ResizeObserver(fit);
  observer.observe(stage);
  function drawSegment(stroke, from, to) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = stroke.radius * 2;
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.beginPath();
    if (from === to) { ctx.arc(to.x, to.y, stroke.radius, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke(); }
    ctx.restore();
  }
  function repaint() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!base) return;
    ctx.drawImage(base, 0, 0);
    for (const stroke of strokes) {
      drawSegment(stroke, stroke.points[0], stroke.points[0]);
      for (let i = 1; i < stroke.points.length; i++) drawSegment(stroke, stroke.points[i - 1], stroke.points[i]);
    }
  }
  function end(cancel = false) {
    if (!current) return;
    const stroke = current; current = null;
    if (canvas.hasPointerCapture(stroke.pointerId)) canvas.releasePointerCapture(stroke.pointerId);
    if (cancel) repaint(); else strokes.push(stroke);
    notice.textContent = cancel ? 'Stroke cancelled.' : 'Brush edit applied. Your download includes this edit.';
    update();
  }
  function location(event) {
    const box = canvas.getBoundingClientRect();
    const stageBox = stage.getBoundingClientRect();
    cursor.style.width = cursor.style.height = `${size.value}px`;
    cursor.style.left = `${event.clientX - stageBox.left}px`;
    cursor.style.top = `${event.clientY - stageBox.top}px`;
    cursor.hidden = !enabled || event.pointerType === 'touch';
    return { x: (event.clientX - box.left) * canvas.width / box.width, y: (event.clientY - box.top) * canvas.height / box.height };
  }
  canvas.addEventListener('pointerdown', event => {
    if (!enabled || !base || current || event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    const point = location(event);
    current = { pointerId: event.pointerId, radius: Number(size.value) / 2 * canvas.width / canvas.getBoundingClientRect().width, points: [point] };
    canvas.setPointerCapture(event.pointerId);
    drawSegment(current, point, point); update();
  });
  canvas.addEventListener('pointermove', event => {
    if (!enabled) return;
    const point = location(event);
    if (!current || current.pointerId !== event.pointerId) return;
    event.preventDefault();
    drawSegment(current, current.points.at(-1), point); current.points.push(point);
  });
  canvas.addEventListener('pointerup', event => { if (current?.pointerId === event.pointerId) end(); });
  canvas.addEventListener('pointercancel', event => { if (current?.pointerId === event.pointerId) end(true); });
  canvas.addEventListener('lostpointercapture', () => { if (current) end(true); });
  canvas.addEventListener('pointerleave', () => { cursor.hidden = true; });
  toggle.onclick = () => { enabled = !enabled; if (enabled) onActivate(); else end(); update(); fit(); };
  size.oninput = update;
  undo.onclick = () => { end(); strokes.pop(); repaint(); notice.textContent = 'Last brush stroke undone.'; update(); };
  reset.onclick = () => { end(true); strokes = []; repaint(); notice.textContent = 'All brush edits cleared. Original AI result restored.'; update(); };
  update();
  return {
    canvas,
    async load(blob) {
      const ticket = ++generation;
      const bitmap = await createImageBitmap(blob);
      if (ticket !== generation) { bitmap.close(); return false; }
      end(true); base?.close(); base = bitmap; strokes = []; enabled = false;
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      repaint(); fit(); update(); notice.textContent = '';
      return true;
    },
    show(visible) {
      canvas.hidden = !visible; toolbar.hidden = !base;
      if (!visible) { end(); enabled = false; update(); }
      if (visible) fit();
    },
    clear() {
      ++generation; end(true); base?.close(); base = null; strokes = []; enabled = false;
      canvas.width = canvas.height = 1; canvas.hidden = toolbar.hidden = true; update();
    },
    finish: () => end(),
  };
}
