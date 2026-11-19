// Vice Lights Cover Atelier — cover rendering (fresh, written from the brief).
// Draws multi-panel GTA-poster-style covers on a canvas: panels, grades,
// lettering, sunburst / palm / skyline decorations, and the caption band.

export const LAYOUTS = {
  hero: { label: 'Hero', panels: 1 },
  split: { label: 'Split', panels: 2 },
  trio: { label: 'Trio', panels: 3 },
  grid: { label: 'Grid', panels: 4 },
  diagonal: { label: 'Diagonal Split', panels: 2 },
  poster: { label: 'Poster', panels: 1 },
};

export const GRADES = {
  sunset: { label: 'Sunset', top: '#ff9a3d', bottom: '#ff2e63', alpha: 0.30 },
  neon: { label: 'Neon Night', top: '#ff2fb3', bottom: '#00e5ff', alpha: 0.32 },
  golden: { label: 'Golden Hour', top: '#ffd166', bottom: '#ff7b00', alpha: 0.28 },
  mono: { label: 'Mono Noir', top: '#000000', bottom: '#ffffff', alpha: 0.0 },
  vicepink: { label: 'Vice Pink', top: '#ff5da2', bottom: '#b388ff', alpha: 0.34 },
  teal: { label: 'Teal Vice', top: '#00e5c7', bottom: '#0b3d91', alpha: 0.32 },
};

export const LETTERINGS = {
  outline: 'Bold Outline',
  gradient: 'Gradient Block',
  neon: 'Neon Glow',
};

export const FRAMES = { white: '#ffffff', black: '#111111', neon: '#ff2fb3' };

export function panelCount(layout) {
  return (LAYOUTS[layout] || LAYOUTS.hero).panels;
}

// Panel geometry as fractions of the canvas. Diagonal panels are polygons.
export function layoutShapes(layout, W, H) {
  const g = 0.018; // gutter fraction
  const gx = W * g, gy = H * g;
  if (layout === 'split') {
    return [
      { x: gx, y: gy, w: W / 2 - gx * 1.5, h: H - gy * 2 },
      { x: W / 2 + gx / 2, y: gy, w: W / 2 - gx * 1.5, h: H - gy * 2 },
    ];
  }
  if (layout === 'trio') {
    return [
      { x: gx, y: gy, w: W * 0.60 - gx * 1.5, h: H - gy * 2 },
      { x: W * 0.60 + gx / 2, y: gy, w: W * 0.40 - gx * 1.5, h: H / 2 - gy * 1.5 },
      { x: W * 0.60 + gx / 2, y: H / 2 + gy / 2, w: W * 0.40 - gx * 1.5, h: H / 2 - gy * 1.5 },
    ];
  }
  if (layout === 'grid') {
    const cw = W / 2 - gx * 1.5, ch = H / 2 - gy * 1.5;
    return [
      { x: gx, y: gy, w: cw, h: ch },
      { x: W / 2 + gx / 2, y: gy, w: cw, h: ch },
      { x: gx, y: H / 2 + gy / 2, w: cw, h: ch },
      { x: W / 2 + gx / 2, y: H / 2 + gy / 2, w: cw, h: ch },
    ];
  }
  if (layout === 'diagonal') {
    // A slanted divider, not a corner-to-corner cut: both panels stay full
    // height, so a face at the top of either photo stays inside its panel.
    const topX = W * 0.52, botX = W * 0.40;
    return [
      { poly: [[gx, gy], [topX, gy], [botX, H - gy], [gx, H - gy]] },
      { poly: [[topX, gy], [W - gx, gy], [W - gx, H - gy], [botX, H - gy]] },
    ];
  }
  if (layout === 'poster') {
    return [{ x: gx, y: gy, w: W - gx * 2, h: H * 0.70 - gy * 2 }];
  }
  return [{ x: gx, y: gy, w: W - gx * 2, h: H - gy * 2 }];
}

function shapeBounds(s) {
  if (s.poly) {
    const xs = s.poly.map((p) => p[0]), ys = s.poly.map((p) => p[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
  return s;
}

function clipShape(ctx, s) {
  ctx.beginPath();
  if (s.poly) {
    ctx.moveTo(s.poly[0][0], s.poly[0][1]);
    for (let i = 1; i < s.poly.length; i++) ctx.lineTo(s.poly[i][0], s.poly[i][1]);
    ctx.closePath();
  } else {
    ctx.rect(s.x, s.y, s.w, s.h);
  }
  ctx.clip();
}

function drawPhotoIn(ctx, img, shape, panel, gradeKey) {
  const b = shapeBounds(shape);
  ctx.save();
  clipShape(ctx, shape);
  // Backdrop so "fit" mode never shows bare canvas behind the photo.
  const bg = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
  bg.addColorStop(0, '#1b1030'); bg.addColorStop(1, '#3d0f2e');
  ctx.fillStyle = bg; ctx.fillRect(b.x, b.y, b.w, b.h);
  if (img && img.naturalWidth) {
    const zoom = panel.zoom || 1;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scaleFit = Math.min(b.w / iw, b.h / ih);
    const scaleFill = Math.max(b.w / iw, b.h / ih);
    const scale = (panel.fit === false ? scaleFill : scaleFit) * zoom;
    const dw = iw * scale, dh = ih * scale;
    const cx = b.x + b.w / 2 + (panel.panX || 0) * b.w * 0.2;
    const cy = b.y + b.h / 2 + (panel.panY || 0) * b.h * 0.2;
    // Fit mode: fill the panel's empty edges with a blurred, darkened copy
    // of the same photo, so there is never a flat dark band beside it.
    if (panel.fit !== false) {
      ctx.save();
      ctx.filter = 'blur(22px) brightness(0.6) saturate(1.25)';
      const bw = iw * scaleFill, bh = ih * scaleFill;
      ctx.drawImage(img, cx - bw / 2, cy - bh / 2, bw, bh);
      ctx.restore();
    }
    ctx.translate(cx, cy);
    if (panel.tilt) ctx.rotate(((panel.tilt || 0) * Math.PI) / 180);
    if (panel.flip) ctx.scale(-1, 1);
    // Mono Noir is the only grade applied as a photo filter, so the photo
    // keeps exactly the same fit framing as every other grade.
    if (gradeKey === 'mono') ctx.filter = 'grayscale(1) contrast(1.12)';
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.filter = 'none';
  }
  ctx.restore();
}

function gradeWash(ctx, shape, gradeKey) {
  const grade = GRADES[gradeKey] || GRADES.sunset;
  const b = shapeBounds(shape);
  ctx.save();
  clipShape(ctx, shape);
  if (gradeKey === 'mono') {
    ctx.fillStyle = 'rgba(20,20,30,0.08)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
  } else {
    const wash = ctx.createLinearGradient(b.x, b.y, b.x + b.w * 0.35, b.y + b.h);
    wash.addColorStop(0, grade.top);
    wash.addColorStop(1, grade.bottom);
    ctx.globalAlpha = grade.alpha;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = wash;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = grade.alpha * 0.45;
    ctx.fillStyle = wash;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.globalAlpha = 1;
  }
  // Vignette: darkens the panel edges, keeps faces bright in the middle.
  const vg = ctx.createRadialGradient(
    b.x + b.w / 2, b.y + b.h / 2, Math.min(b.w, b.h) * 0.35,
    b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h) * 0.75,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = vg;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.restore();
}

function drawSunburst(ctx, x, y, r, colour) {
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = colour;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a - 0.06) * r, y + Math.sin(a - 0.06) * r);
    ctx.lineTo(x + Math.cos(a + 0.06) * r, y + Math.sin(a + 0.06) * r);
    ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.arc(x, y, r * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = colour; ctx.fill();
  ctx.restore();
}

function drawPalm(ctx, x, y, s, colour) {
  // Palm silhouette drawn as strokes, not filled blobs: a curved trunk and
  // five drooping fronds, so it reads as a palm at any size.
  ctx.save();
  ctx.strokeStyle = colour; ctx.lineWidth = Math.max(3, s * 0.055);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s * 0.10, y - s * 0.5, x + s * 0.26, y - s * 0.72);
  ctx.stroke();
  const topX = x + s * 0.26, topY = y - s * 0.72;
  ctx.lineWidth = Math.max(2, s * 0.04);
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.05 + i * 0.19);
    ctx.beginPath(); ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * s * 0.5, topY - Math.sin(a) * s * 0.30,
      topX + Math.cos(a) * s * 0.68, topY + s * 0.30,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawSkyline(ctx, x, y, w, h, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  const heights = [0.5, 0.8, 0.35, 0.95, 0.6, 0.75, 0.45, 0.9, 0.55, 0.7];
  const bw = w / heights.length;
  heights.forEach((f, i) => {
    const bh = h * f;
    ctx.fillRect(x + i * bw + 1, y + h - bh, bw - 2, bh);
  });
  ctx.restore();
}

function fitFont(ctx, text, maxW, startPx, family, weight) {
  let px = startPx;
  while (px > 18) {
    ctx.font = `${weight} ${px}px ${family}`;
    if (ctx.measureText(text).width <= maxW) break;
    px -= 4;
  }
  return px;
}

export function drawCaption(ctx, state, W, H, band) {
  const family = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
  const pad = W * 0.045;
  const maxW = W - pad * 2;
  const title = (state.title || 'VICE LIGHTS').toUpperCase();
  // With a subtitle underneath, lift the title so subtitle and footer never collide.
  const yBase = band
    ? band.y + band.h * 0.42
    : (state.titlePos === 'top' ? H * 0.16 : (state.subtitle ? H * 0.80 : H * 0.86));
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const px = fitFont(ctx, title, maxW, (state.titleSize || 96) * (W / 1080), family, 900);
  const y = yBase;
  const colour = state.titleColor || '#ffffff';
  if (state.lettering === 'gradient') {
    const grad = ctx.createLinearGradient(pad, y - px / 2, W - pad, y + px / 2);
    grad.addColorStop(0, '#ffe259'); grad.addColorStop(0.5, '#ff7e5f'); grad.addColorStop(1, '#ff2fb3');
    ctx.fillStyle = grad;
    ctx.lineWidth = Math.max(4, px * 0.09); ctx.strokeStyle = '#1a0b2e';
    ctx.strokeText(title, W / 2, y);
    ctx.fillText(title, W / 2, y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(pad, y + px * 0.42, maxW, px * 0.08);
  } else if (state.lettering === 'neon') {
    ctx.shadowColor = '#ff2fb3'; ctx.shadowBlur = px * 0.35;
    ctx.lineWidth = Math.max(3, px * 0.05); ctx.strokeStyle = '#ff2fb3';
    ctx.strokeText(title, W / 2, y);
    ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = px * 0.18;
    ctx.fillStyle = colour;
    ctx.fillText(title, W / 2, y);
    ctx.shadowBlur = 0;
  } else {
    ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = px * 0.12; ctx.shadowOffsetY = px * 0.05;
    ctx.lineWidth = Math.max(5, px * 0.11); ctx.strokeStyle = '#111111';
    ctx.lineJoin = 'round';
    ctx.strokeText(title, W / 2, y);
    ctx.fillStyle = colour;
    ctx.fillText(title, W / 2, y);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  }
  if (state.subtitle) {
    const spx = Math.max(20, px * 0.30);
    ctx.font = `700 ${spx}px Arial, sans-serif`;
    ctx.fillStyle = '#ffe259';
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 6;
    ctx.fillText(state.subtitle.toUpperCase(), W / 2, y + px * 0.62);
    ctx.shadowBlur = 0;
  }
  if (state.footer) {
    ctx.font = `700 ${Math.max(16, W * 0.018)}px Arial, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(state.footer, W / 2, H - H * 0.035);
  }
  ctx.restore();
}

export function drawCover(ctx, state, W, H) {
  const frame = FRAMES[state.frame] || FRAMES.white;
  // Base: deep dusk gradient so gutters read as poster borders, not bare canvas.
  const base = ctx.createLinearGradient(0, 0, W, H);
  base.addColorStop(0, '#160a2e'); base.addColorStop(0.55, '#3d0f3a'); base.addColorStop(1, '#ff7e3d');
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);

  const shapes = layoutShapes(state.layout, W, H);
  const photos = state.photos || [];
  shapes.forEach((shape, i) => {
    const panel = (state.panels && state.panels[i]) || { photo: i % Math.max(1, photos.length), fit: true, zoom: 1 };
    const img = photos[panel.photo] || photos[0] || null;
    drawPhotoIn(ctx, img, shape, panel, state.grade);
    gradeWash(ctx, shape, state.grade);
    // Thick poster gutter around every panel: stroke the polygon itself
    // for diagonal panels, the rectangle for the rest.
    ctx.save(); clipShape(ctx, shape);
    ctx.lineWidth = Math.max(4, W * 0.011);
    ctx.strokeStyle = frame;
    if (shape.poly) {
      ctx.beginPath();
      ctx.moveTo(shape.poly[0][0], shape.poly[0][1]);
      for (let i = 1; i < shape.poly.length; i++) ctx.lineTo(shape.poly[i][0], shape.poly[i][1]);
      ctx.closePath(); ctx.stroke();
    } else {
      ctx.strokeRect(shape.x + ctx.lineWidth / 2, shape.y + ctx.lineWidth / 2, shape.w - ctx.lineWidth, shape.h - ctx.lineWidth);
    }
    ctx.restore();
  });

  // Decorations, drawn over the panels but clear of faces (corners / band).
  const b0 = shapeBounds(shapes[0]);
  if (state.layout !== 'poster') {
    drawSunburst(ctx, b0.x + b0.w * 0.10, b0.y + b0.h * 0.10, Math.min(W, H) * 0.055, '#ffd166');
    // Palm grows from the bottom-left corner, silhouetted against the
    // caption strip — never over a face.
    drawPalm(ctx, W * 0.03, H * 0.97, Math.min(W, H) * 0.13, 'rgba(10,8,20,0.85)');
  }

  if (state.layout === 'poster') {
    const bandY = H * 0.72;
    const band = { x: 0, y: bandY, w: W, h: H - bandY };
    const bg = ctx.createLinearGradient(0, bandY, 0, H);
    bg.addColorStop(0, '#12082a'); bg.addColorStop(1, '#4a0e4e');
    ctx.fillStyle = bg; ctx.fillRect(band.x, band.y, band.w, band.h);
    // Skyline sits at the top of the band; the title block starts below it.
    drawSkyline(ctx, W * 0.05, bandY, W * 0.9, band.h * 0.26, 'rgba(255,209,102,0.9)');
    drawCaption(ctx, state, W, H, { y: bandY + band.h * 0.30, h: band.h * 0.70 });
  } else if (state.titlePos === 'top') {
    drawCaption(ctx, state, W, H, null);
  } else {
    // Bottom caption strip: translucent dark band so lettering pops on any photo.
    const stripH = H * 0.20;
    const grad = ctx.createLinearGradient(0, H - stripH, 0, H);
    grad.addColorStop(0, 'rgba(10,5,25,0)');
    grad.addColorStop(1, 'rgba(10,5,25,0.78)');
    ctx.fillStyle = grad; ctx.fillRect(0, H - stripH, W, stripH);
    drawCaption(ctx, state, W, H, null);
  }
  // Outer frame.
  ctx.lineWidth = Math.max(5, W * 0.012);
  ctx.strokeStyle = frame;
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
}
