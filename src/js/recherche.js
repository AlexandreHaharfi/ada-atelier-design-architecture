/* Recherche du site (remplace la recherche intégrée de Webflow).
   Lit « ?query=… », interroge l'index Pagefind et affiche au plus 10 résultats,
   chacun avec le titre de la page, son adresse et sa description, comme sur Webflow. */
(function () {
  var requete = (new URLSearchParams(window.location.search).get('query') || '').trim();
  var zone = document.querySelector('[data-resultats]');
  var champ = document.querySelector('.w-container form input[name="query"]');
  if (champ && requete) champ.value = requete;
  if (!zone || !requete) return;
  var vide = zone.innerHTML;
  zone.style.visibility = 'hidden';

  function echapper(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }[c];
    });
  }
  function sansAccents(t) { return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  // Met en gras les mots recherchés (sans tenir compte des majuscules ni des accents).
  function surligner(texte) {
    var mots = sansAccents(requete).split(/\s+/).filter(function (m) { return m.length > 1; });
    var plat = sansAccents(texte);
    var marques = new Array(texte.length).fill(false);
    mots.forEach(function (m) {
      var i = plat.indexOf(m);
      while (i !== -1) { for (var k = i; k < i + m.length; k++) marques[k] = true; i = plat.indexOf(m, i + m.length); }
    });
    var html = '', dedans = false;
    for (var i = 0; i < texte.length; i++) {
      if (marques[i] && !dedans) { html += '<b>'; dedans = true; }
      if (!marques[i] && dedans) { html += '</b>'; dedans = false; }
      html += echapper(texte[i]);
    }
    return html + (dedans ? '</b>' : '');
  }
  function cheminPublic(url) {
    return url.replace(/\.html$/, '').replace(/\/index$/, '') || '/';
  }

  import('/_pagefind/pagefind.js')
    .then(function (pagefind) { return pagefind.search(requete); })
    .then(function (res) { return Promise.all(res.results.slice(0, 10).map(function (r) { return r.data(); })); })
    .then(function (pages) {
      if (!pages.length) { zone.innerHTML = vide; return; }
      var html = '<div>';
      pages.forEach(function (p) {
        var chemin = cheminPublic(p.url);
        var adresse = window.location.origin + chemin;
        var resume = p.meta && p.meta.description ? surligner(p.meta.description) : (p.excerpt || '').replace(/<mark>/g, '<b>').replace(/<\/mark>/g, '</b>');
        html += '<div><a href="' + echapper(chemin) + '">' + echapper((p.meta && p.meta.title) || chemin) + '</a>'
          + '<div>' + echapper(adresse) + '</div><p>' + resume + '</p></div>';
      });
      zone.innerHTML = html + '</div>';
    })
    .catch(function () { zone.innerHTML = vide; })
    .then(function () { zone.style.visibility = ''; });
})();
