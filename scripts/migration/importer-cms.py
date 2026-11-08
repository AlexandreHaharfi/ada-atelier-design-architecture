"""Convertit le CMS Webflow (sauvegarde du 8 nov. 2026) en fichiers JSON
lisibles par le site et par l'interface d'administration :
  src/content/projets/<slug>.json, src/content/collaborateurs/<slug>.json
et copie les images originales (src/images/projets, src/images/equipe) ainsi
que les variantes déjà calculées par Webflow (src/images/variantes)."""
import os, re, sys, json, shutil, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *

d = donnees()
TYPES = {}
for f in d['cms']['projets']['collection']['fields']:
    if f['slug'] == 'type-de-projet':
        TYPES = {o['id']: o['name'] for o in f['validations']['options']}

def md_echapper(t):
    t = t.replace('\\', '\\\\')
    t = re.sub(r'([*_`\[\]<>])', r'\\\1', t)
    return t

def md_debut(t):
    # empêche qu'un début de paragraphe soit lu comme un titre ou une liste
    if re.match(r'^(#{1,6}\s|[-+]\s|\d+[.)]\s|>)', t):
        t = '\\' + t
    return t

def rt_vers_markdown(noeuds):
    par_id = {n['_id']: n for n in noeuds}
    enfants = set(c for n in noeuds for c in n.get('children', []))
    racines = [n for n in noeuds if n['_id'] not in enfants]
    def enligne(ids):
        sortie = ''
        for i in ids:
            n = par_id[i]
            if n.get('text'):
                sortie += md_echapper(n['v'])
            elif n.get('type') == 'Strong':
                inner = enligne(n.get('children', []))
                coeur = inner.strip(' ')
                avant = inner[:len(inner) - len(inner.lstrip(' '))]
                apres = inner[len(inner.rstrip(' ')):]
                sortie += avant + ('**' + coeur + '**' if coeur else '') + apres
            elif n.get('type') == 'Emphasis':
                sortie += '_' + enligne(n.get('children', [])).strip() + '_'
            elif n.get('type') == 'LineBreak':
                sortie += '\\\n'
            else:
                raise SystemExit('Nœud en ligne inconnu : ' + json.dumps(n)[:200])
        return sortie
    blocs = []
    for r in racines:
        if r.get('type') == 'Paragraph':
            blocs.append(md_debut(enligne(r.get('children', []))))
        elif r.get('type') == 'Heading':
            niveau = int(r['tag'][1])
            blocs.append('#' * niveau + ' ' + enligne(r.get('children', [])))
        else:
            raise SystemExit('Bloc inconnu : ' + json.dumps(r)[:200])
    return '\n\n'.join(blocs)

copiees = set()
def copier_image(ref, dossier):
    """Copie l'original et ses variantes Webflow ; renvoie le chemin public."""
    url = urllib.parse.quote(urllib.parse.unquote(ref['url']), safe=':/')
    nom = nom_sur(url.rsplit('/', 1)[1])
    dest = os.path.join(SRC, 'images', dossier, nom)
    if dest not in copiees:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(chemin_cache(url), dest); copiees.add(dest)
        for v in (ref.get('file') or {}).get('variants') or []:
            vurl = 'https://cdn.prod.website-files.com/' + DB_ID + '/' + urllib.parse.quote(urllib.parse.unquote(v['fileName']))
            vdest = os.path.join(SRC, 'images', 'variantes', nom_sur(v['fileName']))
            os.makedirs(os.path.dirname(vdest), exist_ok=True)
            shutil.copy2(chemin_cache(vurl), vdest)
    return '/images/' + dossier + '/' + nom

def ecrire(chemin, obj):
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2); f.write('\n')

dossier_p = os.path.join(SRC, 'content', 'projets')
shutil.rmtree(dossier_p, ignore_errors=True)
for it in d['cms']['projets']['items']:
    if it.get('_archived') or it.get('_draft'): continue
    p = {
        'nom': it['name'],
        'localisation': it['localisation'],
        'type': TYPES[it['type-de-projet']],
        'ordre': it.get('ordre-d-affichage'),
        'date': (it.get('date-du-projet') or '')[:10] or None,
        'couverture': copier_image(it['cover'], 'projets'),
        'photos': [copier_image(x, 'projets') for x in it.get('photos-du-projet') or []],
        'informations': rt_vers_markdown(it.get('informations-du-projet') or []),
        'cree_le': it['created-on'],
    }
    p = {k: v for k, v in p.items() if v is not None}
    ecrire(os.path.join(dossier_p, it['slug'] + '.json'), p)

dossier_c = os.path.join(SRC, 'content', 'collaborateurs')
shutil.rmtree(dossier_c, ignore_errors=True)
for it in d['cms']['collaborateurs']['items']:
    if it.get('_archived') or it.get('_draft'): continue
    ecrire(os.path.join(dossier_c, it['slug'] + '.json'), {
        'nom': it['name'],
        'photo': copier_image(it['photo'], 'equipe'),
        'description': rt_vers_markdown(it.get('description') or []),
        'cree_le': it['created-on'],
    })
print(len(os.listdir(dossier_p)), 'projets,', len(os.listdir(dossier_c)), 'collaborateur(s),', len(copiees), 'images originales')
