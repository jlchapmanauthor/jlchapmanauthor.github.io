/* J.L. Chapman: visitor-approved, privacy-aware GA4.
   Analytics isn't loaded until the visitor consents. */
(() => {
  'use strict';
  const MEASUREMENT_ID = 'G-6WGC231R13';
  const CONSENT_KEY = 'jlc_analytics_choice_v1';
  const banner = document.getElementById('analytics-consent');
  const accept = document.getElementById('analytics-allow');
  const decline = document.getElementById('analytics-decline');
  const preferences = document.getElementById('analytics-preferences');
  if (!banner || !accept || !decline || !preferences) return;

  let enabled = false;
  let initialized = false;

  function savedChoice() {
    try {
      const choice = window.localStorage.getItem(CONSENT_KEY);
      return choice === 'yes' || choice === 'no' ? choice : null;
    } catch {
      return null;
    }
  }

  function storeChoice(value) {
    try { window.localStorage.setItem(CONSENT_KEY, value); }
    catch { /* The site still works if local storage is unavailable. */ }
  }

  function enableAnalytics() {
    if (enabled) return;
    enabled = true;
    window['ga-disable-' + MEASUREMENT_ID] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    // Explicit GA4 consent, including Google's regional consent signals.
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    if (!initialized) {
      initialized = true;
      window.gtag('js', new Date());
      window.gtag('config', MEASUREMENT_ID, {
        send_page_view: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false
      });
      const tag = document.createElement('script');
      tag.async = true;
      tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
      document.head.appendChild(tag);
    } else {
      window.gtag('consent', 'update', { analytics_storage: 'granted' });
    }
  }

  function disableAnalytics() {
    enabled = false;
    window['ga-disable-' + MEASUREMENT_ID] = true;
    if (initialized && typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
    }
  }

  function setChoice(value) {
    storeChoice(value);
    if (value === 'yes') enableAnalytics();
    else disableAnalytics();
    banner.hidden = true;
    preferences.setAttribute('aria-label', 'Change analytics preferences (currently ' +
      (value === 'yes' ? 'allowed' : 'declined') + ')');
  }

  accept.addEventListener('click', () => setChoice('yes'));
  decline.addEventListener('click', () => setChoice('no'));
  preferences.addEventListener('click', () => {
    banner.hidden = false;
    accept.focus();
  });

  function track(eventName, parameters) {
    if (!enabled || typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, parameters);
  }

  // Track only book purchase links, not every outgoing link.
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-analytics="amazon-buy"]');
    if (!link) return;
    track('amazon_buy_click', {
      book_title: link.dataset.bookTitle,
      book_id: link.dataset.bookId,
      link_url: link.href
    });
  });

  // The Nightmare Mode script updates aria-pressed on the button itself.
  // This listener is registered after that script, so the updated state is available.
  const nightmare = document.getElementById('nightmare-toggle');
  if (nightmare) {
    nightmare.addEventListener('click', () => {
      if (nightmare.getAttribute('aria-pressed') === 'true') {
        track('nightmare_mode_enabled', { feature_name: 'Nightmare Mode' });
      }
    });
  }

  const choice = savedChoice();
  if (choice === 'yes') {
    enableAnalytics();
    banner.hidden = true;
  } else if (choice === 'no') {
    disableAnalytics();
    banner.hidden = true;
  } else {
    banner.hidden = false;
  }
})();
