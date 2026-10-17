/* Lightweight conversion event signals for the existing GTM dataLayer. No form values or personal data are collected. */
(function () {
  'use strict';
  var form = document.querySelector('form[name="quote-request"]');
  if (form) {
    var params = new URLSearchParams(window.location.search);
    var product = params.get('product');
    var productField = form.querySelector('[name="product_interest"]');
    if (product && productField) {
      var matchingOption = Array.prototype.find.call(productField.options, function (option) {
        return option.text.trim().toLowerCase() === product.trim().toLowerCase();
      });
      if (matchingOption) productField.value = matchingOption.value;
      var requirement = form.querySelector('[name="requirement"]');
      if (requirement && !requirement.value.trim()) {
        requirement.value = 'I need a quote for ' + product + '. Please advise on suitability, specifications and pricing.';
      }
    }
    var sourceField = form.querySelector('[name="source_page"]');
    if (sourceField) {
      try {
        var referrer = document.referrer ? new URL(document.referrer) : null;
        sourceField.value = referrer && referrer.origin === window.location.origin ? referrer.pathname : 'direct-or-external';
      } catch (_) {
        sourceField.value = 'direct-or-external';
      }
    }
  }
  function pushEvent(eventName, details) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: eventName, page_path: window.location.pathname }, details || {}));
  }
  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a[data-cta-type]') : null;
    if (!link) return;
    pushEvent('conversion_cta_click', {
      cta_type: link.getAttribute('data-cta-type') || 'unknown',
      cta_location: link.getAttribute('data-cta-location') || 'unspecified',
      cta_label: (link.textContent || '').trim().slice(0, 80)
    });
  });
  document.addEventListener('submit', function (event) {
    var submittedForm = event.target;
    if (submittedForm && submittedForm.matches && submittedForm.matches('form[name="quote-request"]')) {
      pushEvent('quote_form_submit_attempt', { form_name: 'quote-request' });
    }
  });
})();
