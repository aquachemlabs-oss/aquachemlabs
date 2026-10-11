/* Lightweight PWA registration. The site remains fully usable without service workers. */
(() => {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
      .catch((error) => {
        // Do not interrupt the website if PWA registration is unavailable.
        if (location.hostname === 'localhost') console.info('PWA registration skipped:', error);
      });
  }, { once: true });
})();
