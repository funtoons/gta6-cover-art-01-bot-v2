// Vice Lights Cover Atelier — boot and wiring (fresh, written from the brief).
// Connects the editor controls to the cover renderer, handles uploads,
// drag-to-pan on the preview, PNG export, and ?shot= staging.

import { drawCover, LAYOUTS, GRADES, LETTERINGS, FRAMES } from './cover.js';
import {
  freshState, setLayout, applyTemplate, spreadPhotos, loadImageFile,
  loadSample, loadBothSamples, SAMPLES, TEMPLATES,
} from './editor.js';
import { runShot } from './shots.js';

const state = freshState();
const canvas = document.getElementById('preview');
const statusEl = document.getElementById('status');
const $ = (id) => document.getElementById(id);

const EXPORT_SIZES = [
  { w: 1080, h: 1080, label: '1080 × 1080' },
  { w: 1080, h: 1350, label: '1080 × 1350' },
  { w: 1920, h: 1080, label: '1920 × 1080' },
];

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function render() {
  const { w, h } = state.exportSize;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w; canvas.height = h;
  }
  drawCover(canvas.getContext('2d'), state, w, h);
  refreshPanelControls();
}

function chipRow(el, items, current, onPick) {
  if (!el) return;
  el.innerHTML = '';
  Object.entries(items).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (key === current ? ' active' : '');
    b.textContent = typeof def === 'string' ? def : def.label;
    b.setAttribute('aria-pressed', String(key === current));
    b.addEventListener('click', () => { onPick(key); render(); });
    el.appendChild(b);
  });
}

function buildControls() {
  chipRow($('layoutRow'), LAYOUTS, state.layout, (k) => { setLayout(state, k); buildControls(); });
  chipRow($('templateRow'), TEMPLATES, null, (k) => {
    applyTemplate(state, k);
    syncTextInputs();
    buildControls();
    setStatus('Template applied: ' + TEMPLATES[k].label);
  });
  chipRow($('gradeRow'), GRADES, state.grade, (k) => { state.grade = k; });
  chipRow($('letteringRow'), LETTERINGS, state.lettering, (k) => { state.lettering = k; });
  chipRow($('frameRow'), FRAMES, state.frame, (k) => { state.frame = k; });
  const colourRow = $('colourRow');
  if (colourRow) {
    const colours = { '#ffffff': 'White', '#ffe259': 'Sunset yellow', '#ff2fb3': 'Neon pink', '#00e5ff': 'Cyan' };
    chipRow(colourRow, colours, state.titleColor, (k) => { state.titleColor = k; });
  }
}

function syncTextInputs() {
  if ($('title')) $('title').value = state.title;
  if ($('subtitle')) $('subtitle').value = state.subtitle;
  if ($('footer')) $('footer').value = state.footer;
  if ($('titleSize')) $('titleSize').value = String(state.titleSize);
  if ($('titlePos')) $('titlePos').value = state.titlePos;
}

function refreshPanelControls() {
  const sel = $('panelSelect');
  if (sel && sel.options.length !== state.panels.length) {
    sel.innerHTML = '';
    state.panels.forEach((_, i) => {
      const o = document.createElement('option');
      o.value = String(i); o.textContent = 'Panel ' + (i + 1);
      sel.appendChild(o);
    });
  }
  if (sel) sel.value = String(state.selectedPanel);
  const photoSel = $('panelPhoto');
  if (photoSel) {
    const current = photoSel.value;
    photoSel.innerHTML = '';
    state.photoNames.forEach((name, i) => {
      const o = document.createElement('option');
      o.value = String(i); o.textContent = name;
      photoSel.appendChild(o);
    });
    const p = state.panels[state.selectedPanel];
    photoSel.value = String(p ? p.photo : 0);
    if (current && photoSel.value === '') photoSel.value = current;
  }
  const p = state.panels[state.selectedPanel];
  if (!p) return;
  if ($('zoom')) $('zoom').value = String(p.zoom);
  if ($('tilt')) $('tilt').value = String(p.tilt);
  if ($('fitToggle')) $('fitToggle').checked = p.fit !== false;
  if ($('flipToggle')) $('flipToggle').checked = !!p.flip;
}

function bindInputs() {
  const on = (id, event, fn) => { const el = $(id); if (el) el.addEventListener(event, fn); };
  on('title', 'input', (e) => { state.title = e.target.value; render(); });
  on('subtitle', 'input', (e) => { state.subtitle = e.target.value; render(); });
  on('footer', 'input', (e) => { state.footer = e.target.value; render(); });
  on('titleSize', 'input', (e) => { state.titleSize = Number(e.target.value); render(); });
  on('titlePos', 'change', (e) => { state.titlePos = e.target.value; render(); });
  on('panelSelect', 'change', (e) => { state.selectedPanel = Number(e.target.value); render(); });
  on('panelPhoto', 'change', (e) => {
    state.panels[state.selectedPanel].photo = Number(e.target.value); render();
  });
  on('zoom', 'input', (e) => { state.panels[state.selectedPanel].zoom = Number(e.target.value); render(); });
  on('tilt', 'input', (e) => { state.panels[state.selectedPanel].tilt = Number(e.target.value); render(); });
  on('fitToggle', 'change', (e) => { state.panels[state.selectedPanel].fit = e.target.checked; render(); });
  on('flipToggle', 'change', (e) => { state.panels[state.selectedPanel].flip = e.target.checked; render(); });
  on('photoInput', 'change', async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 4);
    if (!files.length) return;
    const imgs = [];
    for (const f of files) imgs.push(await loadImageFile(URL.createObjectURL(f)));
    state.photos = imgs;
    state.photoNames = files.map((f) => f.name);
    spreadPhotos(state);
    setStatus(files.length + ' photo(s) loaded — stored only in this browser.');
    render();
  });
  SAMPLES.forEach((s) => {
    on('sample-' + s.id, 'click', async () => {
      await loadSample(state, s.id);
      setStatus('Sample loaded: ' + s.label);
      render();
    });
  });
  on('sample-both', 'click', async () => {
    await loadBothSamples(state);
    setStatus('Both samples loaded — panels use different photos.');
    render();
  });
  EXPORT_SIZES.forEach((size, i) => {
    on('export-' + i, 'click', () => exportCover(size));
  });
  // Drag on the preview pans the selected panel; wheel zooms it.
  // Pointer capture keeps the drag alive even if the cursor leaves the canvas.
  let dragging = false, lastX = 0, lastY = 0;
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const p = state.panels[state.selectedPanel];
    if (!p) return;
    p.panX += (e.clientX - lastX) / 240;
    p.panY += (e.clientY - lastY) / 240;
    lastX = e.clientX; lastY = e.clientY;
    render();
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = state.panels[state.selectedPanel];
    if (!p) return;
    p.zoom = Math.min(3, Math.max(0.5, p.zoom - Math.sign(e.deltaY) * 0.1));
    render();
  }, { passive: false });
}

function exportCover(size) {
  const off = document.createElement('canvas');
  off.width = size.w; off.height = size.h;
  drawCover(off.getContext('2d'), state, size.w, size.h);
  off.toBlob((blob) => {
    if (!blob) { setStatus('Export failed — try again.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-lights-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Exported ${size.w} × ${size.h} PNG — ${Math.round(blob.size / 1024)} KiB.`);
  }, 'image/png');
}

window.__atelier = {
  state,
  render,
  exportCover,
  exportSize: (w, h) => {
    state.exportSize = { w, h, label: w + ' × ' + h };
    render();
  },
};

buildControls();
bindInputs();
syncTextInputs();

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, async (scene) => {
    if (scene.photo === 'both') await loadBothSamples(state);
    else await loadSample(state, scene.photo);
    state.title = scene.caption;
    state.subtitle = scene.subtitle;
    setLayout(state, scene.layout);
    state.grade = scene.grade;
    state.lettering = scene.lettering;
    state.frame = scene.frame;
    const [w, h] = scene.size.split('x').map(Number);
    state.exportSize = { w, h, label: w + ' × ' + h };
    syncTextInputs();
    buildControls();
    render();
  });
} else {
  loadBothSamples(state).then(() => { render(); setStatus('Samples loaded — pick a layout, a template, then export.'); });
  render();
}
