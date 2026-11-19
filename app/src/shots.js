// Fixed scenes for screenshots: ?shot=cover shows the exported-style cover
// alone, ?shot=editor shows the editor with a sample photo loaded.
// Query keys: photo (boulevard|pier|both), caption, subtitle, layout, grade,
// lettering, frame, size (1080x1080 | 1080x1350 | 1920x1080).
// window.__shotReady is set once the scene has painted.

export async function runShot(shot, query, setup) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photo = query.get('photo') ?? 'both';
  const caption = query.get('caption') ?? 'Neon Nights';
  const subtitle = query.get('subtitle') ?? 'Downtown After Dark';
  const layout = query.get('layout') ?? 'trio';
  const grade = query.get('grade') ?? 'neon';
  const lettering = query.get('lettering') ?? 'neon';
  const frame = query.get('frame') ?? 'neon';
  const size = query.get('size') ?? '1080x1080';
  await setup({ photo, caption, subtitle, layout, grade, lettering, frame, size });
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
