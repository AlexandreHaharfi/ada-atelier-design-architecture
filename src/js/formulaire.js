/* Envoi du formulaire de contact à Netlify Forms, sans quitter la page.
   Reprend le comportement du module « forms » de webflow.js : texte « Patientez... » sur le bouton
   pendant l'envoi, puis formulaire masqué et message de succès affiché (ou message d'erreur). */
(function () {
  document.addEventListener('submit', function (evt) {
    var form = evt.target;
    if (!form.matches || !form.matches('form[data-netlify]')) return;
    evt.preventDefault();
    var wrap = form.closest('div.w-form');
    var done = wrap ? wrap.querySelector(':scope > .w-form-done') : null;
    var fail = wrap ? wrap.querySelector(':scope > .w-form-fail') : null;
    var btn = form.querySelector('input[type="submit"]');
    var label = btn ? btn.value : '';
    if (btn) {
      btn.disabled = true;
      if (btn.getAttribute('data-wait')) btn.value = btn.getAttribute('data-wait');
    }
    if (fail) fail.style.display = 'none';
    var corps = new URLSearchParams(new FormData(form)).toString();
    fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corps })
      .then(function (rep) { return rep.ok; }, function () { return false; })
      .then(function (ok) {
        if (btn) { btn.disabled = false; btn.value = label; }
        if (ok) {
          form.style.display = 'none';
          if (done) { done.style.display = 'block'; done.focus && done.focus(); }
        } else if (fail) {
          fail.style.display = 'block';
        }
      });
  }, true);
})();
