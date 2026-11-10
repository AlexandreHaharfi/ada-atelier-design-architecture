/* Envoi du formulaire de contact à FormSubmit (formsubmit.co), sans quitter la page.
   Reprend le comportement du module « forms » de webflow.js : texte « Patientez... » sur le bouton
   pendant l'envoi, puis formulaire masqué et message de succès affiché (ou message d'erreur). */
(function () {
  document.addEventListener('submit', function (evt) {
    var form = evt.target;
    if (!form.getAttribute || form.getAttribute('data-envoi') !== 'formsubmit') return;
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
    var donnees = {};
    new FormData(form).forEach(function (valeur, cle) { donnees[cle] = valeur; });
    // Point d'envoi « ajax » de FormSubmit : réponse en JSON au lieu d'une page de remerciement.
    var adresse = form.action.replace('://formsubmit.co/', '://formsubmit.co/ajax/');
    fetch(adresse, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(donnees)
    })
      .then(function (rep) { return rep.ok ? rep.json() : null; })
      .then(function (json) { return !!json && String(json.success) === 'true'; }, function () { return false; })
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
