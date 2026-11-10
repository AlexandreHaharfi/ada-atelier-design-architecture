// Construction du site de l'Atelier Design Architecture (anciennement sur Webflow).
// Les pages reprennent à l'identique le HTML publié par Webflow (mêmes classes, même structure),
// pour que la feuille de style et le script d'origine (webflow.css, webflow.js) fonctionnent comme avant.
import markdownIt from 'markdown-it';
import { preparerImages, srcset, variante } from './scripts/images.js';

const md = markdownIt({ html: false, linkify: false, typographer: false });
// Un simple retour à la ligne dans un paragraphe devient une espace (sinon « compacter » collerait les mots).
md.renderer.rules.softbreak = () => ' ';

// Chemin public façon Webflow : « /contact.html » -> « /contact », « /index.html » -> « / ».
function cheminWebflow(url) {
  if (!url) return '';
  return url.replace(/\.html$/, '').replace(/\/index$/, '') || '/';
}

// Le HTML publié par Webflow ne contient aucun blanc entre les balises. Les gabarits sont indentés
// pour rester lisibles : on retire ici les blancs contenant un saut de ligne entre deux balises
// (sans toucher au contenu des balises script, style, pre et textarea).
function compacter(html) {
  return html
    .split(/(<(script|style|pre|textarea)\b[\s\S]*?<\/\2>)/i)
    .map((morceau, i) => {
      if (i % 3 === 1) return morceau; // bloc brut conservé tel quel
      if (i % 3 === 2) return ''; // nom de balise capturé par la regex
      return morceau.replace(/>\s*\n\s*</g, '><');
    })
    .join('')
    .replace(/^\s+/, '');
}

export default function (eleventyConfig) {
  for (const dossier of ['css', 'js', 'fonts', 'images', 'admin']) {
    eleventyConfig.addPassthroughCopy({ [`src/${dossier}`]: dossier });
  }
  eleventyConfig.addPassthroughCopy({ 'src/robots.txt': 'robots.txt' });

  eleventyConfig.setNunjucksEnvironmentOptions({ autoescape: true, trimBlocks: true, lstripBlocks: true });

  // Année affichée dans le pied de page (celle de la construction du site).
  eleventyConfig.addGlobalData('annee', () => new Date().getFullYear());

  // Variantes d'images (création des manquantes) avant chaque construction.
  eleventyConfig.on('eleventy.before', async () => { await preparerImages(); });

  // Texte enrichi des projets (Markdown) -> HTML du bloc « w-richtext ».
  // Les paragraphes et titres vides (un simple caractère invisible laissé par l'éditeur de Webflow) sont retirés :
  // ils ajoutaient des lignes blanches au-dessus ou au-dessous des informations des projets.
  eleventyConfig.addFilter('texteRiche', (texte) =>
    (texte ? md.render(texte).replace(/<(p|h[1-6])>[\s‍ ]*<\/\1>\s*/g, '') : ''));
  eleventyConfig.addFilter('srcset', (url) => srcset(url));
  // Images de fond (vignettes des catégories, diaporama des projets) : Webflow y plaçait le fichier original,
  // souvent de 3 000 à 6 000 px ; on sert sa version réduite par Webflow (2 000 ou 2 600 px), identique à l'écran
  // et deux fois plus légère, pour rester dans la bande passante de l'hébergement gratuit.
  eleventyConfig.addFilter('fond', (url, largeur) => variante(url, largeur));
  eleventyConfig.addFilter('cheminWebflow', cheminWebflow);
  // Données d'une image pour la visionneuse de webflow.js (même format que Webflow).
  eleventyConfig.addFilter('lightbox', (url, groupe) => JSON.stringify({ items: [{ url, type: 'image' }], group: groupe }, null, 2));
  // Moteur de recherche (Pagefind) : la description de la page sert de résumé dans les résultats.
  eleventyConfig.addFilter('metaRecherche', (ligne) =>
    ligne.includes('name="description"') ? ligne.replace('name="description"', 'name="description" data-pagefind-meta="description[content]"') : ligne);

  // Projets d'une catégorie, dans l'ordre exact de Webflow :
  // tri par « ordre » croissant (projets sans numéro en premier, égalités par date de création),
  // ou, sans tri défini, du plus récent au plus ancien.
  eleventyConfig.addFilter('projetsDe', (projets, type, tri) => {
    const liste = projets.filter((p) => p.type === type);
    if (tri === 'ordre') {
      return liste.sort((a, b) => {
        const oa = a.ordre ?? null, ob = b.ordre ?? null;
        if (oa === null && ob !== null) return -1;
        if (ob === null && oa !== null) return 1;
        if (oa !== ob) return oa - ob;
        return a.cree_le.localeCompare(b.cree_le);
      });
    }
    return liste.sort((a, b) => b.cree_le.localeCompare(a.cree_le));
  });

  // Lien vers la page courante : Webflow ajoute aria-current="page" et la classe w--current.
  eleventyConfig.addShortcode('actif', function (href) {
    return cheminWebflow(this.page?.url) === href ? ' aria-current="page"' : '';
  });
  eleventyConfig.addShortcode('classeActive', function (href) {
    return cheminWebflow(this.page?.url) === href ? ' w--current' : '';
  });

  eleventyConfig.addTransform('compacter', function (contenu) {
    return (this.page.outputPath || '').endsWith('.html') ? compacter(contenu) : contenu;
  });

  return {
    dir: { input: 'src', includes: '_includes', data: '_data', output: '_site' },
    templateFormats: ['njk'],
    htmlTemplateEngine: 'njk',
  };
}
