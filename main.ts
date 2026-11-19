// Vice Lights Cover Atelier — hand-in program (Node 22, standard library only).
// The app itself is plain static files under app/ (app/index.html plus its ES
// modules, sample photos, no libraries, no network requests). This program is
// only the delivery step: it copies app/ and screenshots/ from beside this
// file into the output directory and writes /output/dossier.json, the summary
// the judge reads, using the vendored make.fun library (vendor/makefun-app.ts).
//
// Try the app first with `node serve.ts`, then open http://localhost:8080.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const targetDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(targetDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(targetDir, 'app'), { recursive: true });
mkdirSync(join(targetDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(targetDir, 'screenshots'), { recursive: true });
}

// Caps mirror the scorer's own limits (reference/gate.json): the text cap
// shapes the dossier bytes; the rest refuse an entry the scorer would refuse
// — more than 4 screenshots or one over 256 KiB; more than 993 files in app/
// or 48 MiB of app files in all; or an app/ path over 1000 bytes. app/ counts
// beside /output's own 1000-entry cap, with screenshots/ and dossier.json.
// The dossier must be byte-for-byte what buildDossier writes from the
// finished output tree, so it is computed after both copies above.
const dossierText = buildDossier(targetDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(targetDir, 'dossier.json'), dossierText);
