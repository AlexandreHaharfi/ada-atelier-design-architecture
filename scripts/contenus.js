// Lecture des contenus éditables (un fichier JSON par projet ou par collaborateur).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CONTENU = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content');

export function lireCollection(nom) {
  const dossier = path.join(CONTENU, nom);
  return fs.readdirSync(dossier)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ slug: path.basename(f, '.json'), ...JSON.parse(fs.readFileSync(path.join(dossier, f), 'utf8')) }))
    .filter((e) => !e.brouillon)
    .sort((a, b) => a.cree_le.localeCompare(b.cree_le));
}
