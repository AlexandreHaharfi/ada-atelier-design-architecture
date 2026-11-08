"""Télécharge depuis le CDN de Webflow toutes les ressources du site publié
(liste du manifeste de l'export de mai 2026) et toutes les variantes d'images
du CMS (données du Designer sauvegardées le 8 nov. 2026).
Cache : .cache/webflow/<hôte>/<chemin décodé>"""
import json, os, sys, urllib.parse, urllib.request, concurrent.futures as cf
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ADA = os.path.dirname(RACINE)
CACHE = os.path.join(RACINE, '.cache', 'webflow')
manifeste = json.load(open(os.path.join(ADA, 'webflow-export', 'export-manifest.json')))
donnees = json.load(open(os.path.join(ADA, 'sauvegarde-webflow-2026-11-08', 'donnees-webflow.json')))
urls = set(a['source'] for a in manifeste['assets'])
DB = 'https://cdn.prod.website-files.com/670680d6548dcdb6540671aa/'
def images_cms(o):
    if isinstance(o, dict):
        if 'fileId' in o and isinstance(o.get('file'), dict):
            f = o['file']
            if o.get('url'): urls.add(urllib.parse.quote(urllib.parse.unquote(o['url']), safe=':/'))
            for v in f.get('variants', []) or []:
                urls.add(DB + urllib.parse.quote(urllib.parse.unquote(v['fileName'])))
        for v in o.values(): images_cms(v)
    elif isinstance(o, list):
        for v in o: images_cms(v)
images_cms(donnees['cms'])
def chemin(u):
    p = urllib.parse.urlparse(u)
    return os.path.join(CACHE, p.netloc, urllib.parse.unquote(p.path).lstrip('/'))
def get(u):
    dest = chemin(u)
    if os.path.exists(dest) and os.path.getsize(dest) > 0: return None
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    try:
        q = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
        data = urllib.request.urlopen(q, timeout=90).read()
        open(dest, 'wb').write(data); return None
    except Exception as e:
        return f'{u} : {e}'
with cf.ThreadPoolExecutor(16) as ex:
    erreurs = [r for r in ex.map(get, sorted(urls)) if r]
json.dump({'urls': sorted(urls)}, open(os.path.join(CACHE, 'index.json'), 'w'), ensure_ascii=False, indent=1)
print(len(urls), 'ressources,', len(erreurs), 'erreurs')
print('\n'.join(erreurs[:20]))
