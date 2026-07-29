/**
 * AdStream embed script. Served at GET /ad/embed.js and loaded via
 * <script async src=".../ad/embed.js" data-adstream-unit="...">.
 *
 * Design goals (per the architecture plan):
 *  - never block page rendering (runs after DOMContentLoaded, uses fetch not document.write)
 *  - lightweight (no dependencies, minimal logic)
 *  - lazy-loads via IntersectionObserver so off-screen ad slots don't
 *    fetch/spend budget until they're actually about to be seen
 *  - supports multiple ad units on one page — this script runs once
 *    and handles every [data-adstream-unit] div it finds
 */
(function () {
  'use strict';

  var currentScript = document.currentScript;
  var apiBase = currentScript.src.replace(/\/embed\.js.*$/, '');

  function renderCreative(container, impressionId, creative) {
    var link = document.createElement('a');
    link.href = apiBase + '/click?imp=' + encodeURIComponent(impressionId);
    link.target = '_blank';
    link.rel = 'noopener sponsored';
    link.style.display = 'block';
    link.style.textDecoration = 'none';

    if (creative.type === 'text') {
      var headline = document.createElement('div');
      headline.textContent = creative.headline || '';
      headline.style.fontWeight = 'bold';
      link.appendChild(headline);
      if (creative.bodyText) {
        var body = document.createElement('div');
        body.textContent = creative.bodyText;
        link.appendChild(body);
      }
    } else {
      var img = document.createElement('img');
      img.src = creative.assetUrl;
      img.alt = creative.headline || 'Advertisement';
      img.style.maxWidth = '100%';
      img.style.display = 'block';
      if (creative.width) img.width = creative.width;
      if (creative.height) img.height = creative.height;
      link.appendChild(img);
    }

    container.innerHTML = '';
    container.appendChild(link);
  }

  function loadAd(container) {
    var unitKey = container.getAttribute('data-adstream-unit') || currentScript.getAttribute('data-adstream-unit');
    if (!unitKey) return;

    var params = new URLSearchParams({ unit: unitKey });
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) params.set('tz', tz);

    fetch(apiBase + '/serve?' + params.toString(), { credentials: 'omit' })
      .then(function (res) {
        if (res.status === 204) return null;
        return res.json();
      })
      .then(function (json) {
        if (json && json.success && json.data) {
          renderCreative(container, json.data.impressionId, json.data.creative);
        }
      })
      .catch(function () {
        // Fail silently — an ad slot that doesn't load should not surface
        // an error on the publisher's page.
      });
  }

  function init() {
    var containers = document.querySelectorAll('[id^="adstream-"]');
    if (containers.length === 0) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              loadAd(entry.target);
              observer.unobserve(entry.target);
            }
          });
        },
        { rootMargin: '200px' }
      );
      containers.forEach(function (el) {
        el.setAttribute('data-adstream-unit', el.id.replace('adstream-', ''));
        observer.observe(el);
      });
    } else {
      // No IntersectionObserver support — load immediately rather than not at all.
      containers.forEach(function (el) {
        el.setAttribute('data-adstream-unit', el.id.replace('adstream-', ''));
        loadAd(el);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
