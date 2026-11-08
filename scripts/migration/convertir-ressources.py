"""Feuille de styles, scripts, images du site et polices pour le nouveau site."""
import os, re, sys, shutil, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *

def copier(url, dest_public):
    src = chemin_cache(url_absolue(url))
    dest = os.path.join(SRC, dest_public.lstrip('/'))
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    shutil.copy2(src, dest)

# 1. Images et variantes du dossier « site » (logo, diaporama, icônes, favicon)
dossier_site = os.path.join(CACHE, 'cdn.prod.website-files.com', SITE_ID)
for f in sorted(os.listdir(dossier_site)):
    p = os.path.join(dossier_site, f)
    if os.path.isdir(p) or f.lower().endswith('.otf'): continue
    url = ORIGINE_SITE + urllib.parse.quote(f)
    copier(url, chemin_local(url))
copier('https://d3e54v103j8qbb.cloudfront.net/img/background-image.svg', '/images/site/background-image.svg')

# 2. Scripts : jQuery et moteur Webflow, inchangés
copier('https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js', '/js/jquery-3.5.1.min.js')
shutil.copy2(glob.glob(os.path.join(dossier_site, 'js', 'webflow.*.js'))[0], os.path.join(SRC, 'js', 'webflow.js'))

# 3. Feuille de styles d'origine : URL réécrites, polices de démonstration retirées
css = open(glob.glob(os.path.join(dossier_site, 'css', '*.css'))[0], encoding='utf-8').read()
avant = css.count('@font-face')
css = re.sub(r"@font-face\s*\{[^}]*Proximanova[^}]*\}\s*", '', css)
def repl2(m):
    g = m.groups()
    u = next(x for x in g if x is not None).strip()
    if u.startswith('data:'): return m.group(0)
    loc = chemin_local(u)
    if not loc: raise SystemExit('URL CSS non gérée : ' + u)
    return 'url("' + loc + '")'
def repl(m):
    u = m.group(2) if m.group(2) is not None else (m.group(3) if m.group(3) is not None else m.group(4).strip())
    if u.startswith('data:'): return m.group(0)
    loc = chemin_local(u)
    if not loc: raise SystemExit('URL CSS non gérée : ' + u)
    return 'url("' + loc + '")'
css = re.sub(r'url\(\s*(?:"([^"]*)"|\'([^\']*)\'|([^)]*))\s*\)', lambda m: repl2(m), css)
os.makedirs(os.path.join(SRC, 'css'), exist_ok=True)
open(os.path.join(SRC, 'css', 'webflow.css'), 'w', encoding='utf-8').write(css)
print('CSS :', avant - css.count('@font-face'), 'règles @font-face Proxima Nova retirées')

# 4. Polices : Lato (fichiers de Google Fonts) et Onest calibrée pour remplacer Proxima Nova
lato = open(os.path.join(RACINE, '.cache', 'lato-local.css'), encoding='utf-8').read()
correspondance = {100: 100, 300: 200, 400: 370, 500: 465, 600: 560, 700: 845, 900: 900}
faces = []
for w, ow in correspondance.items():
    faces.append("@font-face {\n  font-family: 'Proximanova';\n"
                 f"  src: url('/fonts/onest/onest-proximanova-{w}.woff2') format('woff2');\n"
                 f"  font-weight: {w};\n  font-style: normal;\n  font-display: swap;\n"
                 "  size-adjust: 93.6%;\n  ascent-override: 98.29%;\n  descent-override: 31.84%;\n  line-gap-override: 0%;\n}")
entete = ("/* Lato : fichiers servis par Google Fonts (v25), hébergés ici pour ne plus dépendre de Google. */\n")
entete2 = ("/* « Proximanova » : le site Webflow utilisait des fichiers de démonstration de Proxima Nova\n"
           "   (sans accents, licence non valable pour le web). Ils sont remplacés par Onest (licence OFL),\n"
           "   instanciée graisse par graisse pour égaler l'épaisseur de trait de Proxima Nova, avec une\n"
           "   taille et des métriques ajustées pour garder les mêmes largeurs et hauteurs de ligne.\n"
           "   Graisse demandée -> graisse Onest : " + ', '.join(f'{a}->{b}' for a, b in correspondance.items()) + " */\n")
open(os.path.join(SRC, 'css', 'polices.css'), 'w', encoding='utf-8').write(entete + lato + '\n' + entete2 + '\n'.join(faces) + '\n')
print('Polices : Lato', lato.count('@font-face'), 'faces ; Proximanova', len(faces), 'faces')
print('Images du site :', len(os.listdir(os.path.join(SRC, 'images', 'site'))))
