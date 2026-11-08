// Ajoute un projet au site dans le même format que les projets venus de Webflow.
// Utilisation : node scripts/nouveau-projet.mjs fiche.json
// fiche.json :
// {
//   "nom": "Villa M", "localisation": "Lattes", "type": "Habitat Individuel", "ordre": 5, "date": "2026-11-08",
//   "couverture": "/chemin/couverture.jpg",
//   "photos": ["/chemin/1.jpg", "/chemin/2.jpg"],
//   "informations": { "Programme": "Maison individuelle", "Statut": "Livraison 2027", "Superficie": "SDP 180m²",
//                     "Maitrise d'Ouvrage": "…", "Maitrise d'Oeuvre": "Nathalie GUERIN - ADA", "Photographe": "…" }
// }
// Les images sont copiées dans src/images/projets sous un nom de type Webflow (« <identifiant>_<nom>.jpg »),
// redressées selon leur orientation et ramenées à 3200 px de large au plus si besoin.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMAGES = path.join(RACINE, 'src', 'images', 'projets');
const CONTENU = path.join(RACINE, 'src', 'content', 'projets');
const TYPES = ['Habitat Collectif', 'Habitat Groupé', 'Habitat Individuel', 'Bureau (Architecture)', 'Bureau (Design)', "Entrée d'immeuble", 'Résidence étudiante'];
const LARGEUR_MAX = 3200;
const POIDS_MAX = 4 * 1024 * 1024; // limite de Webflow pour une image

// Même logique que les adresses Webflow : « Le Clos de l'Hermitage » -> « le-clos-de-lhermitage ».
function slugifier(texte) {
  return texte.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/œ/gi, 'oe').replace(/æ/gi, 'ae')
    .toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Identifiant de 24 caractères hexadécimaux, comme ceux des fichiers Webflow (date + aléatoire).
function identifiant() {
  return Math.floor(Date.now() / 1000).toString(16).padStart(8, '0') + crypto.randomBytes(8).toString('hex');
}

const copiees = new Map(); // même fichier source -> même image (couverture reprise dans les photos)

async function copierImage(source) {
  const deja = copiees.get(path.resolve(source));
  if (deja) return deja;
  const ext = path.extname(source).toLowerCase().replace('.jpeg', '.jpg');
  const nom = identifiant() + '_' + (slugifier(path.basename(source, path.extname(source))) || 'image') + ext;
  const cible = path.join(IMAGES, nom);
  const meta = await sharp(source).metadata();
  const largeur = meta.orientation >= 5 ? meta.height : meta.width;
  if (largeur > LARGEUR_MAX || fs.statSync(source).size > POIDS_MAX || (meta.orientation && meta.orientation !== 1)) {
    let img = sharp(source).rotate().resize({ width: Math.min(largeur, LARGEUR_MAX), withoutEnlargement: true });
    img = ext === '.png' ? img.png({ compressionLevel: 9 }) : ext === '.webp' ? img.webp({ quality: 85 }) : img.jpeg({ quality: 85, mozjpeg: true });
    await img.toFile(cible);
  } else {
    fs.copyFileSync(source, cible);
  }
  copiees.set(path.resolve(source), '/images/projets/' + nom);
  return '/images/projets/' + nom;
}

// Texte « Informations » au format des fiches existantes.
function informations(infos) {
  if (!infos) return '';
  const lignes = [];
  for (const [intitule, valeur] of Object.entries(infos)) {
    if (intitule === "Maitrise d'Oeuvre" || intitule === 'Architecte') lignes.push(`**${intitule} :** ${valeur}`);
    else if (intitule === 'Programme') lignes.push(`**Programme**  :  ${valeur}`);
    else if (intitule === 'Statut') lignes.push(`**Statut**  : ${valeur}`);
    else lignes.push(`**${intitule}** : ${valeur}`);
  }
  return lignes.join('\n\n') + '\n\n‍';
}

const fiche = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!fiche.nom || !TYPES.includes(fiche.type)) {
  console.error('Il faut un « nom » et un « type » parmi : ' + TYPES.join(', '));
  process.exit(1);
}
const slug = fiche.slug || slugifier(fiche.nom);
const fichier = path.join(CONTENU, slug + '.json');
if (fs.existsSync(fichier)) { console.error('Un projet « ' + slug + ' » existe déjà.'); process.exit(1); }

const projet = { nom: fiche.nom, localisation: fiche.localisation || '', type: fiche.type };
if (fiche.ordre != null) projet.ordre = fiche.ordre;
if (fiche.date) projet.date = fiche.date;
projet.couverture = await copierImage(fiche.couverture || fiche.photos[0]);
projet.photos = [];
for (const photo of fiche.photos || []) projet.photos.push(await copierImage(photo));
projet.informations = typeof fiche.informations === 'string' ? fiche.informations : informations(fiche.informations);
projet.cree_le = new Date().toISOString();
fs.writeFileSync(fichier, JSON.stringify(projet, null, 2) + '\n');
console.log(`Projet créé : src/content/projets/${slug}.json (${projet.photos.length} photos) -> /projets/${slug}`);
