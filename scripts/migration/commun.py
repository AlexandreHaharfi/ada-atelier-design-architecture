"""Outils communs à la migration depuis Webflow (exécutés une seule fois)."""
import os, re, json, unicodedata, urllib.parse, html

RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ADA = os.path.dirname(RACINE)
SRC = os.path.join(RACINE, 'src')
CACHE = os.path.join(RACINE, '.cache', 'webflow')
EXPORT = os.path.join(ADA, 'webflow-export')
SITE_ID = '670675e1b0addf477a3713c8'
DB_ID = '670680d6548dcdb6540671aa'

def donnees():
    return json.load(open(os.path.join(ADA, 'sauvegarde-webflow-2026-11-08', 'donnees-webflow.json'), encoding='utf-8'))

def slugifier(texte):
    t = unicodedata.normalize('NFKD', texte)
    t = ''.join(c for c in t if not unicodedata.combining(c))
    t = t.lower()
    t = re.sub(r'[^a-z0-9]+', '-', t).strip('-')
    return re.sub(r'-{2,}', '-', t)

VARIANTE = re.compile(r'^(?P<base>.+?)-p-(?P<w>\d+)(?P<ext>\.[A-Za-z0-9]+)$')

def nom_sur(nom_webflow):
    """« 672a…_©Sophie Belloni-Vitou-72.jpg » -> « 672a…_sophie-belloni-vitou-72.jpg ».
    Les variantes « …-p-500.jpg » gardent leur suffixe."""
    nom = urllib.parse.unquote(nom_webflow)
    m = VARIANTE.match(nom)
    suffixe = ''
    if m:
        nom = m.group('base') + m.group('ext'); suffixe = '-p-' + m.group('w')
    racine, ext = os.path.splitext(nom)
    if '_' in racine and re.match(r'^[0-9a-f]{24}_', racine):
        ident, reste = racine.split('_', 1)
        base = ident + '_' + (slugifier(reste) or 'image')
    else:
        base = slugifier(racine)
    return base + suffixe + ext.lower()

def chemin_cache(url):
    p = urllib.parse.urlparse(url)
    return os.path.join(CACHE, p.netloc, urllib.parse.unquote(p.path).lstrip('/'))

def echapper(texte):
    """Échappement identique à celui du HTML publié par Webflow."""
    return html.escape(texte, quote=True).replace('&#x27;', '&#x27;')

ORIGINE_SITE = 'https://cdn.prod.website-files.com/' + SITE_ID + '/'
ORIGINE_CMS = 'https://cdn.prod.website-files.com/' + DB_ID + '/'

def url_absolue(ref):
    """Ramène une référence de l'export (« ../../assets/cdn.prod…/x.jpg ») ou du CDN à l'URL d'origine."""
    ref = ref.strip().strip('"').strip("'")
    m = re.search(r'assets/([^/]+)/(.+)$', ref)
    if m and not ref.startswith('http'):
        hote, chemin = m.group(1), m.group(2)
        if hote == 'd3e54v103j8qbb.cloudfront.net' and chemin.startswith('js/jquery'):
            return 'https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js'
        return 'https://' + hote + '/' + urllib.parse.quote(urllib.parse.unquote(chemin), safe='/@')
    return ref

def chemin_local(url):
    """URL d'origine (Webflow) -> chemin public du nouveau site, ou None si ce n'est pas une ressource gérée."""
    url = url_absolue(url)
    if url.startswith('https://d3e54v103j8qbb.cloudfront.net/img/background-image.svg'):
        return '/images/site/background-image.svg'
    if url.startswith('https://d3e54v103j8qbb.cloudfront.net/js/jquery'):
        return '/js/jquery-3.5.1.min.js'
    for origine in (ORIGINE_SITE, ORIGINE_CMS):
        if url.startswith(origine):
            reste = url[len(origine):]
            if reste.startswith('css/'): return '/css/webflow.css'
            if reste.startswith('js/'): return '/js/webflow.js'
            nom = nom_sur(reste.split('?')[0])
            if VARIANTE.match(urllib.parse.unquote(reste)):
                return '/images/variantes/' + nom
            if origine == ORIGINE_SITE:
                return '/images/site/' + nom
            if os.path.exists(os.path.join(SRC, 'images', 'equipe', nom)):
                return '/images/equipe/' + nom
            return '/images/projets/' + nom
    return None
