// Vice Lights Cover Atelier — editor state (fresh, written from the brief).
// Owns the cover state: photos, per-panel crop/pan/zoom, layouts and the
// one-click templates. Rendering itself lives in cover.js.

import { panelCount } from './cover.js';

export const SAMPLES = [
  { id: 'boulevard', label: 'Boulevard sample', url: 'samples/boulevard.jpg' },
  { id: 'pier', label: 'Pier sample', url: 'samples/pier.jpg' },
];

export const TEMPLATES = {
  sunsetHero: {
    label: 'Sunset Hero', layout: 'hero', grade: 'sunset', lettering: 'outline',
    frame: 'white', title: 'Sunset Hero', subtitle: 'Vice City Nights', titleColor: '#ffffff',
  },
  neonNights: {
    label: 'Neon Nights', layout: 'trio', grade: 'neon', lettering: 'neon',
    frame: 'neon', title: 'Neon Nights', subtitle: 'Downtown After Dark', titleColor: '#ffffff',
  },
  goldenBoulevard: {
    label: 'Golden Boulevard', layout: 'split', grade: 'golden', lettering: 'gradient',
    frame: 'white', title: 'Golden Boulevard', subtitle: 'Cruising Into Sunset', titleColor: '#ffe259',
  },
  monoWanted: {
    label: 'Mono Wanted', layout: 'grid', grade: 'mono', lettering: 'outline',
    frame: 'black', title: 'Most Wanted', subtitle: 'Four Faces, One City', titleColor: '#ffffff',
  },
};

export function blankPanel(photoIndex) {
  return { photo: photoIndex, zoom: 1, panX: 0, panY: 0, fit: true, flip: false, tilt: 0 };
}

export function freshState() {
  return {
    layout: 'trio',
    grade: 'neon',
    lettering: 'neon',
    frame: 'neon',
    title: 'Neon Nights',
    subtitle: 'Downtown After Dark',
    footer: 'VICE LIGHTS • EST. 2026',
    titleSize: 96,
    titlePos: 'bottom',
    titleColor: '#ffffff',
    photos: [],
    photoNames: [],
    panels: [blankPanel(0), blankPanel(1), blankPanel(0)],
    selectedPanel: 0,
    exportSize: { w: 1080, h: 1080, label: '1080 × 1080' },
  };
}

// Keep the panel list in step with the layout: add fresh panels or trim extras.
export function syncPanels(state) {
  const n = panelCount(state.layout);
  while (state.panels.length < n) state.panels.push(blankPanel(state.panels.length % Math.max(1, state.photos.length || 1)));
  state.panels.length = n;
  if (state.selectedPanel >= n) state.selectedPanel = 0;
  return state;
}

export function applyTemplate(state, key) {
  const t = TEMPLATES[key];
  if (!t) return state;
  Object.assign(state, {
    layout: t.layout, grade: t.grade, lettering: t.lettering, frame: t.frame,
    title: t.title, subtitle: t.subtitle, titleColor: t.titleColor,
  });
  return syncPanels(state);
}

export function setLayout(state, layout) {
  state.layout = layout;
  return syncPanels(state);
}

// Vary the photo per panel instead of repeating one photo everywhere:
// panels cycle through the loaded photos in order.
export function spreadPhotos(state) {
  const n = Math.max(1, state.photos.length);
  state.panels.forEach((p, i) => { p.photo = i % n; });
  return state;
}

export function loadImageFile(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load ' + url));
    img.src = url;
  });
}

export async function loadSample(state, id) {
  const sample = SAMPLES.find((s) => s.id === id) || SAMPLES[0];
  const img = await loadImageFile(sample.url);
  state.photos = [img];
  state.photoNames = [sample.label];
  state.panels = [blankPanel(0), blankPanel(0), blankPanel(0)];
  syncPanels(state);
  spreadPhotos(state);
  return state;
}

export async function loadBothSamples(state) {
  // Load in a fixed order so panel 1 is always Boulevard and panel 2 Pier.
  const imgs = [];
  for (const s of SAMPLES) imgs.push(await loadImageFile(s.url));
  state.photos = imgs;
  state.photoNames = SAMPLES.map((s) => s.label);
  syncPanels(state);
  spreadPhotos(state);
  return state;
}
