// Images responsives, comme Webflow : pour chaque image d'origine, des variantes « -p-<largeur> »
// aux largeurs 500, 800, 1080, 1600, 2000, 2600 et 3200 px (seulement celles plus petites que l'original),
// puis un attribut srcset « variante 500w, …, original <largeur>w ».
// Les variantes produites par Webflow sont déjà dans src/images/variantes ; celles des nouvelles images
// sont créées au moment de la construction du site.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(RACINE, 'src');
const DOSSIER_VARIANTES = path.join(SRC, 'images', 'variantes');
const DOSSIERS_ORIGINAUX = ['projets', 'equipe', 'site'].map((d) => path.join(SRC, 'images', d));
const CACHE = path.join(RACINE, '.cache', 'dimensions-images.json');
export const LARGEURS = [500, 800, 1080, 1600, 2000, 2600, 3200];
const FORMATS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

let dimensions = {}; // « /images/projets/x.jpg » -> { largeur, hauteur }

function nomVariante(fichier, largeur) {
  const ext = path.extname(fichier);
  return path.basename(fichier, ext) + '-p-' + largeur + ext;
}

export async function preparerImages({ creerVariantes = true } = {}) {
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch {}
  const nouveau = {};
  let creees = 0;
  fs.mkdirSync(DOSSIER_VARIANTES, { recursive: true });
  for (const dossier of DOSSIERS_ORIGINAUX) {
    if (!fs.existsSync(dossier)) continue;
    for (const nom of fs.readdirSync(dossier)) {
      const ext = path.extname(nom).toLowerCase();
      if (!FORMATS.has(ext)) continue;
      const fichier = path.join(dossier, nom);
      const st = fs.statSync(fichier);
      const cle = path.relative(SRC, fichier);
      let d = cache[cle];
      if (!d || d.taille !== st.size || d.date !== Math.round(st.mtimeMs)) {
        const m = await sharp(fichier).metadata();
        const tourne = m.orientation && m.orientation >= 5;
        d = { largeur: tourne ? m.height : m.width, hauteur: tourne ? m.width : m.height, taille: st.size, date: Math.round(st.mtimeMs) };
      }
      nouveau[cle] = d;
      dimensions['/' + cle.split(path.sep).join('/')] = d;
      if (!creerVariantes || dossier.endsWith(path.sep + 'site')) continue;
      for (const largeur of LARGEURS) {
        if (largeur >= d.largeur) break;
        const cible = path.join(DOSSIER_VARIANTES, nomVariante(nom, largeur));
        if (fs.existsSync(cible)) continue;
        let img = sharp(fichier).rotate().resize({ width: largeur });
        if (ext === '.png') img = img.png({ compressionLevel: 9 });
        else if (ext === '.webp') img = img.webp({ quality: 90 });
        else img = img.jpeg({ quality: 90, mozjpeg: true });
        await img.toFile(cible);
        creees++;
      }
    }
  }
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  fs.writeFileSync(CACHE, JSON.stringify(nouveau));
  if (creees) console.log(`[images] ${creees} variante(s) créée(s)`);
}

// « /images/projets/x.jpg » -> « /images/variantes/x-p-2600.jpg » si cette version existe, sinon l'original.
export function variante(url, largeur) {
  if (!url) return url;
  const nom = nomVariante(path.posix.basename(url), largeur);
  return fs.existsSync(path.join(DOSSIER_VARIANTES, nom)) ? '/images/variantes/' + nom : url;
}

// « /images/projets/x.jpg » -> « /images/variantes/x-p-500.jpg 500w, …, /images/projets/x.jpg 2201w »
// Chaîne vide si l'image n'a pas de variante (image de moins de 500 px, SVG…), comme sur Webflow.
export function srcset(url) {
  if (!url) return '';
  const d = dimensions[url];
  if (!d) return '';
  const nom = path.posix.basename(url);
  const parties = [];
  for (const largeur of LARGEURS) {
    if (largeur >= d.largeur) break;
    if (fs.existsSync(path.join(DOSSIER_VARIANTES, nomVariante(nom, largeur)))) {
      parties.push(`/images/variantes/${nomVariante(nom, largeur)} ${largeur}w`);
    }
  }
  if (!parties.length) return '';
  parties.push(`${url} ${d.largeur}w`);
  return parties.join(', ');
}
