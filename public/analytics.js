// Google Analytics 4: collect visits on the production hostname only.
(() => {
  if (window.location.hostname !== 'arakawa-suigai-viewer.vercel.app') return;
  const measurementId = 'G-T0QZT180EM';
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
})();
