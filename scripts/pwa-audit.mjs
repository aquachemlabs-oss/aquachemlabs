import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const checks = [];
async function exists(file) {
  try { await fs.access(path.join(root, file)); return true; } catch { return false; }
}
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ': ' + detail : ''));
}

const manifestExists = await exists('manifest.webmanifest');
check('PWA manifest emitted', manifestExists);
if (manifestExists) {
  let manifest;
  try { manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.webmanifest'), 'utf8')); } catch {}
  check('Manifest JSON valid', Boolean(manifest));
  check('Manifest has app identity and root scope',
    Boolean(manifest?.name && manifest?.short_name && manifest?.start_url === '/' && manifest?.scope === '/'));
  for (const size of [192, 512]) {
    check(size + 'px install icon emitted', await exists('pwa-' + size + '.png'));
  }
}

const htmlFiles = [];
async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (entry.name.endsWith('.html') && entry.name !== 'offline.html') htmlFiles.push(full);
  }
}
await walk(root);
let missingHead = 0;
let missingRegister = 0;
for (const file of htmlFiles) {
  const html = await fs.readFile(file, 'utf8');
  if (!html.includes('/manifest.webmanifest')) missingHead++;
  if (!html.includes('/pwa-register.js')) missingRegister++;
}
check('Manifest linked on all published HTML pages', missingHead === 0, missingHead ? missingHead + ' page(s) missing' : htmlFiles.length + ' pages checked');
check('Service-worker registration linked on all published HTML pages', missingRegister === 0, missingRegister ? missingRegister + ' page(s) missing' : htmlFiles.length + ' pages checked');

const workerExists = await exists('service-worker.js');
check('Service worker emitted', workerExists);
if (workerExists) {
  const worker = await fs.readFile(path.join(root, 'service-worker.js'), 'utf8');
  check('HTML is not added to app-shell cache', !/APP_SHELL\s*=\s*\[[\s\S]*?\.html[^\]]*\.html/.test(worker) && !/cache\.put\(request, response\.clone\(\)\)[\s\S]*request\.mode\s*===\s*['"]navigate['"]/.test(worker),
    'navigation is network-first with offline fallback');
  check('Third-party requests excluded from caching', worker.includes("url.origin !== self.location.origin"));
}
const offlineExists = await exists('offline.html');
check('Offline fallback exists', offlineExists);
if (offlineExists) {
  const offline = await fs.readFile(path.join(root, 'offline.html'), 'utf8');
  check('Offline fallback is excluded from search indexing', /name=["']robots["'][^>]*noindex/i.test(offline));
}

if (checks.some((item) => !item.ok)) process.exitCode = 1;
else console.log('PWA audit passed (' + checks.length + ' checks).');
