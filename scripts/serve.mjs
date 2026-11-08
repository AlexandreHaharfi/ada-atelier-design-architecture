// Serveur local pour regarder le site construit (dossier _site) comme il sera servi par Netlify :
// « /contact » sert contact.html, « /projets/archipel » sert projets/archipel.html,
// une adresse inconnue renvoie 404.html, et l'envoi du formulaire de contact (POST) est accepté
// et affiché dans le terminal au lieu d'être transmis par courriel.
// Utilisation : npm run serve  (puis http://localhost:8080)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.resolve(process.env.SITE || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '_site'));
const PORT = Number(process.env.PORT || 8080);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.wasm': 'application/wasm', '.yml': 'text/yaml; charset=utf-8',
};

function fichier(p) {
  try { return fs.statSync(p).isFile() ? p : null; } catch { return null; }
}

// Même ordre de recherche que Netlify : fichier exact, puis « .html », puis « index.html » du dossier.
function trouver(chemin) {
  const base = path.join(RACINE, chemin);
  if (!base.startsWith(RACINE)) return null;
  return fichier(base) || fichier(base.replace(/\/$/, '') + '.html') || fichier(path.join(base, 'index.html'));
}

function envoyer(res, statut, cible) {
  res.writeHead(statut, { 'Content-Type': TYPES[path.extname(cible).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(cible).pipe(res);
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'POST') {
    let corps = '';
    req.on('data', (morceau) => { corps += morceau; });
    req.on('end', () => {
      const champs = Object.fromEntries(new URLSearchParams(corps));
      console.log('[formulaire]', champs['form-name'] || '?', JSON.stringify(champs));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!DOCTYPE html><p>Formulaire reçu (serveur local).</p>');
    });
    return;
  }
  let chemin;
  try { chemin = decodeURIComponent(url.pathname); } catch { chemin = url.pathname; }
  const cible = trouver(chemin);
  if (cible) return envoyer(res, 200, cible);
  const page404 = path.join(RACINE, '404.html');
  if (fichier(page404)) return envoyer(res, 404, page404);
  res.writeHead(404).end('Introuvable');
}).listen(PORT, () => console.log(`Site servi sur http://localhost:${PORT}`));
