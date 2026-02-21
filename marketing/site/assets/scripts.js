(function () {
  // Populate country selects using ISO country codes (same list as app)
  const COUNTRY_DATA = `
AF|Afghanistan
AX|Aland Islands
AL|Albania
DZ|Algeria
AS|American Samoa
AD|Andorra
AO|Angola
AI|Anguilla
AQ|Antarctica
AG|Antigua and Barbuda
AR|Argentina
AM|Armenia
AW|Aruba
AU|Australia
AT|Austria
AZ|Azerbaijan
BS|Bahamas
BH|Bahrain
BD|Bangladesh
BB|Barbados
BY|Belarus
BE|Belgium
BZ|Belize
BJ|Benin
BM|Bermuda
BT|Bhutan
BO|Bolivia
BQ|Bonaire Sint Eustatius and Saba
BA|Bosnia and Herzegovina
BW|Botswana
BV|Bouvet Island
BR|Brazil
IO|British Indian Ocean Territory
BN|Brunei Darussalam
BG|Bulgaria
BF|Burkina Faso
BI|Burundi
CV|Cabo Verde
KH|Cambodia
CM|Cameroon
CA|Canada
KY|Cayman Islands
CF|Central African Republic
TD|Chad
CL|Chile
CN|China
CX|Christmas Island
CC|Cocos Islands
CO|Colombia
KM|Comoros
CG|Congo
CD|Congo Democratic Republic
CK|Cook Islands
CR|Costa Rica
CI|Cote d'Ivoire
HR|Croatia
CU|Cuba
CW|Curacao
CY|Cyprus
CZ|Czechia
DK|Denmark
DJ|Djibouti
DM|Dominica
DO|Dominican Republic
EC|Ecuador
EG|Egypt
SV|El Salvador
GQ|Equatorial Guinea
ER|Eritrea
EE|Estonia
SZ|Eswatini
ET|Ethiopia
FK|Falkland Islands
FO|Faroe Islands
FJ|Fiji
FI|Finland
FR|France
GF|French Guiana
PF|French Polynesia
TF|French Southern Territories
GA|Gabon
GM|Gambia
GE|Georgia
DE|Germany
GH|Ghana
GI|Gibraltar
GR|Greece
GL|Greenland
GD|Grenada
GP|Guadeloupe
GU|Guam
GT|Guatemala
GG|Guernsey
GN|Guinea
GW|Guinea-Bissau
GY|Guyana
HT|Haiti
HM|Heard Island and McDonald Islands
VA|Holy See
HN|Honduras
HK|Hong Kong
HU|Hungary
IS|Iceland
IN|India
ID|Indonesia
IR|Iran
IQ|Iraq
IE|Ireland
IM|Isle of Man
IL|Israel
IT|Italy
JM|Jamaica
JP|Japan
JE|Jersey
JO|Jordan
KZ|Kazakhstan
KE|Kenya
KI|Kiribati
KP|North Korea
KR|South Korea
KW|Kuwait
KG|Kyrgyzstan
LA|Laos
LV|Latvia
LB|Lebanon
LS|Lesotho
LR|Liberia
LY|Libya
LI|Liechtenstein
LT|Lithuania
LU|Luxembourg
MO|Macao
MK|North Macedonia
MG|Madagascar
MW|Malawi
MY|Malaysia
MV|Maldives
ML|Mali
MT|Malta
MH|Marshall Islands
MQ|Martinique
MR|Mauritania
MU|Mauritius
YT|Mayotte
MX|Mexico
FM|Micronesia
MD|Moldova
MC|Monaco
MN|Mongolia
ME|Montenegro
MS|Montserrat
MA|Morocco
MZ|Mozambique
MM|Myanmar
NA|Namibia
NR|Nauru
NP|Nepal
NL|Netherlands
NC|New Caledonia
NZ|New Zealand
NI|Nicaragua
NE|Niger
NG|Nigeria
NU|Niue
NF|Norfolk Island
MP|Northern Mariana Islands
NO|Norway
OM|Oman
PK|Pakistan
PW|Palau
PS|Palestine
PA|Panama
PG|Papua New Guinea
PY|Paraguay
PE|Peru
PH|Philippines
PN|Pitcairn
PL|Poland
PT|Portugal
PR|Puerto Rico
QA|Qatar
RE|Reunion
RO|Romania
RU|Russian Federation
RW|Rwanda
BL|Saint Barthelemy
SH|Saint Helena Ascension and Tristan da Cunha
KN|Saint Kitts and Nevis
LC|Saint Lucia
MF|Saint Martin
PM|Saint Pierre and Miquelon
VC|Saint Vincent and the Grenadines
WS|Samoa
SM|San Marino
ST|Sao Tome and Principe
SA|Saudi Arabia
SN|Senegal
RS|Serbia
SC|Seychelles
SL|Sierra Leone
SG|Singapore
SX|Sint Maarten
SK|Slovakia
SI|Slovenia
SB|Solomon Islands
SO|Somalia
ZA|South Africa
GS|South Georgia and the South Sandwich Islands
SS|South Sudan
ES|Spain
LK|Sri Lanka
SD|Sudan
SR|Suriname
SJ|Svalbard and Jan Mayen
SE|Sweden
CH|Switzerland
SY|Syrian Arab Republic
TW|Taiwan
TJ|Tajikistan
TZ|Tanzania
TH|Thailand
TL|Timor-Leste
TG|Togo
TK|Tokelau
TO|Tonga
TT|Trinidad and Tobago
TN|Tunisia
TR|Turkey
TM|Turkmenistan
TC|Turks and Caicos Islands
TV|Tuvalu
UG|Uganda
UA|Ukraine
AE|United Arab Emirates
GB|United Kingdom
US|United States
UM|United States Minor Outlying Islands
UY|Uruguay
UZ|Uzbekistan
VU|Vanuatu
VE|Venezuela
VN|Vietnam
VG|Virgin Islands British
VI|Virgin Islands US
WF|Wallis and Futuna
EH|Western Sahara
YE|Yemen
ZM|Zambia
ZW|Zimbabwe`;

  function populateCountrySelects() {
    const selects = document.querySelectorAll('select[data-country]');
    if (!selects.length) return;
    const options = COUNTRY_DATA.split('\n')
      .map((line) => line.trim())
      .filter((line) => !!line && line.includes('|'))
      .map((line) => {
        const [code, name] = line.split('|');
        return { code: code.toUpperCase(), name };
      });
    selects.forEach((sel) => {
      // Clear existing
      while (sel.options.length > 1) sel.remove(1);
      options.forEach(({ code, name }) => {
        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = `${code} — ${name}`;
        sel.appendChild(opt);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', populateCountrySelects);
  } else {
    populateCountrySelects();
  }

  const CONSENT_STORAGE_KEY = 'kanap_cookie_consent_v1';
  const ATTRIBUTION_STORAGE_KEY = 'kanap_marketing_attribution_v1';
  const ATTRIBUTION_KEYS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'msclkid',
    'fbclid',
  ];

  let pageViewSent = false;

  function getStorageValue(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function setStorageValue(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore storage errors (private mode/restricted browser settings).
    }
  }

  function getReferrerHost() {
    try {
      if (!document.referrer) return '';
      return new URL(document.referrer).hostname || '';
    } catch {
      return '';
    }
  }

  function buildTouchFromLocation() {
    const params = new URLSearchParams(window.location.search || '');
    const touch = {};

    ATTRIBUTION_KEYS.forEach((key) => {
      const value = String(params.get(key) || '').trim();
      if (value) touch[key] = value;
    });

    const landingPath = window.location.pathname || '/';
    const referrerHost = getReferrerHost();
    const nowIso = new Date().toISOString();
    const hasQueryAttribution = ATTRIBUTION_KEYS.some((key) => !!touch[key]);

    touch.landing_path = landingPath;
    touch.referrer_host = referrerHost || '(direct)';
    touch.timestamp = nowIso;
    touch.source_type = hasQueryAttribution ? 'campaign' : (referrerHost ? 'referral' : 'direct');
    return touch;
  }

  function initializeAttribution() {
    const latestTouch = buildTouchFromLocation();
    let existing = {};
    const raw = getStorageValue(ATTRIBUTION_STORAGE_KEY);

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          existing = parsed;
        }
      } catch {
        existing = {};
      }
    }

    const firstTouch = existing.first_touch && typeof existing.first_touch === 'object'
      ? existing.first_touch
      : latestTouch;

    const next = {
      first_touch: firstTouch,
      latest_touch: latestTouch,
    };
    setStorageValue(ATTRIBUTION_STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function getAttribution() {
    const raw = getStorageValue(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return initializeAttribution();
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      // Reinitialize below.
    }
    return initializeAttribution();
  }

  function getEventAttributionParams() {
    const attribution = getAttribution();
    const first = attribution.first_touch || {};
    const latest = attribution.latest_touch || {};

    return {
      first_source: first.utm_source || first.source_type || '(direct)',
      first_medium: first.utm_medium || '(none)',
      first_campaign: first.utm_campaign || '(none)',
      latest_source: latest.utm_source || latest.source_type || '(direct)',
      latest_medium: latest.utm_medium || '(none)',
      latest_campaign: latest.utm_campaign || '(none)',
      landing_path: first.landing_path || window.location.pathname || '/',
      referrer_host: latest.referrer_host || first.referrer_host || '(direct)',
    };
  }

  function getAttributionPayload() {
    return getAttribution();
  }

  function gtagAvailable() {
    return typeof window.gtag === 'function';
  }

  function hasAnalyticsConsent() {
    return getStorageValue(CONSENT_STORAGE_KEY) === 'accepted';
  }

  function sendPageView() {
    if (!gtagAvailable() || !hasAnalyticsConsent() || pageViewSent) return;
    window.gtag('event', 'page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname,
      ...getEventAttributionParams(),
    });
    pageViewSent = true;
  }

  function updateConsentState(granted) {
    if (gtagAvailable()) {
      window.gtag('consent', 'update', {
        ad_storage: granted ? 'denied' : 'denied',
        analytics_storage: granted ? 'granted' : 'denied',
        ad_user_data: granted ? 'denied' : 'denied',
        ad_personalization: granted ? 'denied' : 'denied',
      });
    }
    if (granted) {
      sendPageView();
    }
  }

  function trackEvent(name, params) {
    if (!gtagAvailable() || !hasAnalyticsConsent()) return;
    window.gtag('event', name, {
      ...getEventAttributionParams(),
      ...(params || {}),
    });
  }

  function renderCookieBanner() {
    const stored = getStorageValue(CONSENT_STORAGE_KEY);
    if (stored === 'accepted' || stored === 'rejected') {
      updateConsentState(stored === 'accepted');
      return;
    }

    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.innerHTML = `
      <div class="cookie-banner__content">
        <p class="cookie-banner__title">Analytics cookies</p>
        <p class="cookie-banner__text">
          We use analytics cookies to understand product interest and improve the site.
          You can accept or reject non-essential tracking.
        </p>
        <div class="cookie-banner__actions">
          <button type="button" class="button button--ghost cookie-banner__btn" data-cookie-reject>Reject</button>
          <button type="button" class="button button--primary cookie-banner__btn" data-cookie-accept>Accept</button>
        </div>
        <a class="cookie-banner__link" href="/privacy.html">Read privacy policy</a>
      </div>
    `;

    const onAccept = () => {
      setStorageValue(CONSENT_STORAGE_KEY, 'accepted');
      updateConsentState(true);
      trackEvent('cookie_consent_accept', { consent_action: 'accept' });
      banner.remove();
    };
    const onReject = () => {
      setStorageValue(CONSENT_STORAGE_KEY, 'rejected');
      updateConsentState(false);
      if (gtagAvailable()) {
        window.gtag('event', 'cookie_consent_reject', { consent_action: 'reject' });
      }
      banner.remove();
    };

    banner.querySelector('[data-cookie-accept]')?.addEventListener('click', onAccept);
    banner.querySelector('[data-cookie-reject]')?.addEventListener('click', onReject);
    document.body.appendChild(banner);
  }

  function initAttributionAndConsent() {
    initializeAttribution();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderCookieBanner);
    } else {
      renderCookieBanner();
    }
  }

  initAttributionAndConsent();

  const captchaState = {
    configPromise: null,
    scriptPromise: null,
    widgets: new WeakMap(),
  };

  function defaultCaptchaConfig() {
    return {
      provider: 'turnstile',
      enabled: false,
      required: false,
      siteKey: null,
    };
  }

  function normalizeCaptchaConfig(data) {
    if (!data || typeof data !== 'object') return defaultCaptchaConfig();
    return {
      provider: data.provider === 'turnstile' ? 'turnstile' : 'turnstile',
      enabled: !!data.enabled,
      required: !!data.required,
      siteKey: typeof data.siteKey === 'string' && data.siteKey.trim() ? data.siteKey.trim() : null,
    };
  }

  async function fetchCaptchaConfig() {
    if (captchaState.configPromise) return captchaState.configPromise;

    captchaState.configPromise = fetch('/api/public/captcha-config', {
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`captcha-config ${response.status}`);
        }
        const payload = await response.json();
        return normalizeCaptchaConfig(payload);
      })
      .catch((error) => {
        console.warn('[captcha] Unable to load captcha config:', error);
        return defaultCaptchaConfig();
      });

    return captchaState.configPromise;
  }

  async function ensureTurnstileScript() {
    if (window.turnstile && typeof window.turnstile.render === 'function') return;
    if (captchaState.scriptPromise) return captchaState.scriptPromise;

    captchaState.scriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-turnstile-script]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Turnstile script failed to load')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.setAttribute('data-turnstile-script', 'true');
      script.addEventListener('load', () => resolve(), { once: true });
      script.addEventListener('error', () => reject(new Error('Turnstile script failed to load')), { once: true });
      document.head.appendChild(script);
    })
      .catch((error) => {
        captchaState.scriptPromise = null;
        throw error;
      });

    return captchaState.scriptPromise;
  }

  function ensureCaptchaSlot(form, statusElement) {
    const externalSelector = String(form.getAttribute('data-captcha-container') || '').trim();
    let externalContainer = null;

    if (externalSelector) {
      try {
        externalContainer = document.querySelector(externalSelector);
      } catch {
        externalContainer = null;
      }
    }

    let slot = externalContainer
      ? externalContainer.querySelector('[data-captcha-slot]')
      : form.querySelector('[data-captcha-slot]');
    if (slot) return slot;

    slot = document.createElement('div');
    slot.className = 'captcha-slot';
    slot.setAttribute('data-captcha-slot', 'turnstile');

    if (externalContainer) {
      externalContainer.appendChild(slot);
      return slot;
    }

    if (statusElement && statusElement.parentElement === form) {
      form.insertBefore(slot, statusElement);
    } else {
      form.appendChild(slot);
    }

    return slot;
  }

  async function ensureTurnstileWidget(form, statusElement, action) {
    const config = await fetchCaptchaConfig();
    if (!config.enabled || !config.siteKey || config.provider !== 'turnstile') {
      return null;
    }

    await ensureTurnstileScript();

    const existing = captchaState.widgets.get(form);
    if (existing) return existing;

    const slot = ensureCaptchaSlot(form, statusElement);
    slot.innerHTML = '';

    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.name = 'captchaToken';

    const widgetMount = document.createElement('div');
    slot.appendChild(widgetMount);
    slot.appendChild(hiddenInput);

    const widgetId = window.turnstile.render(widgetMount, {
      sitekey: config.siteKey,
      action,
      theme: 'light',
      callback: (token) => {
        hiddenInput.value = token || '';
      },
      'expired-callback': () => {
        hiddenInput.value = '';
      },
      'error-callback': () => {
        hiddenInput.value = '';
      },
    });

    const record = { widgetId, hiddenInput };
    captchaState.widgets.set(form, record);
    return record;
  }

  async function getCaptchaToken(form, statusElement, action) {
    const config = await fetchCaptchaConfig();
    if (!config.enabled || config.provider !== 'turnstile' || !config.siteKey) {
      return { token: '', required: false };
    }

    let widget;
    try {
      widget = await ensureTurnstileWidget(form, statusElement, action);
    } catch (error) {
      console.warn('[captcha] Unable to initialize widget:', error);
      return { token: '', required: config.required };
    }

    if (!widget) return { token: '', required: config.required };

    let token = (widget.hiddenInput.value || '').trim();
    if (!token && window.turnstile && typeof window.turnstile.getResponse === 'function') {
      token = String(window.turnstile.getResponse(widget.widgetId) || '').trim();
    }

    return { token, required: config.required };
  }

  function resetCaptcha(form) {
    const widget = captchaState.widgets.get(form);
    if (!widget) return;
    widget.hiddenInput.value = '';
    if (window.turnstile && typeof window.turnstile.reset === 'function') {
      try {
        window.turnstile.reset(widget.widgetId);
      } catch {
        // Ignore reset failures (script unload or stale widget).
      }
    }
  }

  async function readErrorMessage(response) {
    const text = await response.text();
    if (!text) return 'Request failed';
    try {
      const payload = JSON.parse(text);
      if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message.trim();
      if (Array.isArray(payload?.message) && payload.message.length > 0) {
        return String(payload.message[0]);
      }
    } catch {
      // fall through
    }
    return text;
  }

  function collectErrorSignals(node, out, depth) {
    if (depth > 6 || node == null) return;

    if (typeof node === 'string') {
      const value = node.trim();
      if (value) out.messages.push(value);
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((item) => collectErrorSignals(item, out, depth + 1));
      return;
    }

    if (typeof node !== 'object') return;

    Object.entries(node).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'code' && typeof value === 'string' && value.trim()) {
        out.codes.push(value.trim());
      }

      if (
        (lowerKey === 'message'
          || lowerKey === 'error'
          || lowerKey === 'detail'
          || lowerKey === 'description')
        && typeof value === 'string'
        && value.trim()
      ) {
        out.messages.push(value.trim());
      }

      collectErrorSignals(value, out, depth + 1);
    });
  }

  function pickBestErrorMessage(messages) {
    const blacklist = new Set(['bad request', 'request failed', '[object object]']);
    const firstUseful = messages.find((entry) => {
      const normalized = String(entry || '').trim().toLowerCase();
      return normalized && !blacklist.has(normalized);
    });
    return firstUseful || messages[0] || '';
  }

  async function readErrorDetails(response) {
    const status = Number(response?.status || 0);
    const text = await response.text();
    if (!text) {
      return { status, code: '', message: 'Request failed' };
    }

    try {
      const payload = JSON.parse(text);
      const signals = { codes: [], messages: [] };
      collectErrorSignals(payload, signals, 0);
      const code = signals.codes[0] || '';
      const message = pickBestErrorMessage(signals.messages) || text;
      return { status, code, message };
    } catch {
      return { status, code: '', message: text };
    }
  }

  function resolveTrialSignupErrorMessage(detail, code, status) {
    if (String(code || '').trim().toUpperCase() === 'SUBDOMAIN_NOT_AVAILABLE') {
      return "This subdomain name isn't available. Please try another one.";
    }

    const normalized = String(detail || '').trim().toLowerCase();
    if (!normalized) {
      return "This subdomain name isn't available. Please try another one.";
    }

    if (
      normalized.includes('slug not available')
      || normalized.includes('tenant already exists')
      || normalized.includes('subdomain not available')
      || normalized.includes('subdomain_not_available')
      || normalized.includes("isn't available")
      || (status === 409 && normalized.includes('tenant'))
      || (status === 400 && (normalized === 'bad request' || normalized === '[object object]'))
    ) {
      return "This subdomain name isn't available. Please try another one.";
    }

    return "This subdomain name isn't available. Please try another one.";
  }

  const modal = document.querySelector('.trial-modal');
  const openers = document.querySelectorAll('[data-open-trial]');
  const body = document.body;

  if (modal) {
    const closeBtn = modal.querySelector('[data-close-trial]');
    const trialForm = modal.querySelector('[data-trial-form]');
    const trialStatus = modal.querySelector('[data-trial-status]');

    function openModal() {
      modal.classList.add('open');
      body.style.overflow = 'hidden';
      trackEvent('trial_modal_open', { form_name: 'start_trial' });
      const orgInput = modal.querySelector('#org');
      if (orgInput) orgInput.focus();
      if (trialForm && trialStatus) {
        ensureTurnstileWidget(trialForm, trialStatus, 'start_trial').catch((error) => {
          console.warn('[captcha] Trial captcha widget initialization failed:', error);
        });
      }
    }

    function closeModal() {
      modal.classList.remove('open');
      body.style.overflow = '';
      if (trialStatus) trialStatus.textContent = '';
      if (trialForm) {
        trialForm.reset();
        resetCaptcha(trialForm);
        const submitBtn = trialForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.removeAttribute('disabled');
      }
    }

    openers.forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        openModal();
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('open')) {
        closeModal();
      }
    });

    if (trialForm && trialStatus) {
      trialForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitBtn = trialForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.setAttribute('disabled', 'true');
        }

        trialStatus.textContent = 'Creating your workspace...';
        const captcha = await getCaptchaToken(trialForm, trialStatus, 'start_trial');
        if (captcha.required && !captcha.token) {
          trialStatus.textContent = 'Please complete the CAPTCHA challenge before submitting.';
          if (submitBtn) submitBtn.removeAttribute('disabled');
          return;
        }

        const payload = {
          org: trialForm.org.value.trim(),
          slug: trialForm.slug.value.trim(),
          email: trialForm.email.value.trim(),
          country_iso: (trialForm.country_iso?.value || '').toString().toUpperCase().trim(),
          attribution: getAttributionPayload(),
          captchaToken: captcha.token || undefined,
        };
        trackEvent('trial_submit', { form_name: 'start_trial' });

        try {
          const response = await fetch('/api/public/start-trial', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const details = await readErrorDetails(response);
            const error = new Error(details.message || 'Request failed');
            error.code = details.code;
            error.status = details.status;
            throw error;
          }

          const data = await response.json();
          if (data && data.ok) {
            if (trialForm) {
              Array.from(trialForm.elements).forEach((el) => {
                if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement || el instanceof HTMLButtonElement) {
                  el.disabled = true;
                }
              });
            }
            if (data.activation_url) {
              trackEvent('trial_success', { activation_delivery: 'manual_link' });
              trialStatus.innerHTML =
                '<span class="alert">Email service is not configured. Use the link below to activate your workspace manually.</span>';
              const manual = document.createElement('p');
              manual.style.marginTop = '0.5rem';
              manual.innerHTML = `Activation link: <a href="${data.activation_url}">${data.activation_url}</a>`;
              trialStatus.appendChild(manual);
            } else {
              trackEvent('trial_success', { activation_delivery: 'email' });
              trialStatus.innerHTML = '<span class="alert">Check your inbox to activate your workspace.</span>';
            }
            return;
          }
          throw new Error('Unexpected response format');
        } catch (error) {
          console.error(error);
          const detail = error instanceof Error ? error.message : '';
          const code = typeof error?.code === 'string' ? error.code : '';
          const status = Number(error?.status || 0);
          if (/captcha/i.test(detail) || String(code).toLowerCase().includes('captcha')) {
            trialStatus.textContent = 'CAPTCHA verification failed. Please retry the challenge.';
          } else {
            trialStatus.textContent = resolveTrialSignupErrorMessage(detail, code, status);
          }
          trackEvent('trial_error', {
            form_name: 'start_trial',
            error_code: code || 'unknown',
            error_status: status || 0,
          });
          resetCaptcha(trialForm);
          if (submitBtn) {
            submitBtn.removeAttribute('disabled');
          }
        }
      });
    }
  }

  const enterpriseModal = document.querySelector('.enterprise-invoice-modal');
  const enterpriseOpeners = document.querySelectorAll('[data-open-enterprise-invoice], [data-stripe-link="enterprise-support"]');

  if (enterpriseModal) {
    const closeBtn = enterpriseModal.querySelector('[data-close-enterprise-invoice]');
    const enterpriseForm = enterpriseModal.querySelector('[data-enterprise-invoice-form]');
    const enterpriseStatus = enterpriseModal.querySelector('[data-enterprise-invoice-status]');

    const releaseBodyScrollIfNoOpenModal = () => {
      const trialOpen = !!(modal && modal.classList.contains('open'));
      const enterpriseOpen = enterpriseModal.classList.contains('open');
      if (!trialOpen && !enterpriseOpen) {
        body.style.overflow = '';
      }
    };

    const openEnterpriseModal = () => {
      enterpriseModal.classList.add('open');
      body.style.overflow = 'hidden';
      trackEvent('invoice_modal_open', { form_name: 'support_invoice' });
      const companyInput = enterpriseModal.querySelector('#enterprise_company_name');
      if (companyInput) companyInput.focus();
      if (enterpriseForm && enterpriseStatus) {
        ensureTurnstileWidget(enterpriseForm, enterpriseStatus, 'support_invoice').catch((error) => {
          console.warn('[captcha] Enterprise support captcha widget initialization failed:', error);
        });
      }
    };

    const closeEnterpriseModal = () => {
      enterpriseModal.classList.remove('open');
      releaseBodyScrollIfNoOpenModal();
      if (enterpriseStatus) enterpriseStatus.textContent = '';
      if (enterpriseForm) {
        enterpriseForm.reset();
        resetCaptcha(enterpriseForm);
        const submitBtn = enterpriseForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.removeAttribute('disabled');
        Array.from(enterpriseForm.elements).forEach((el) => {
          if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement || el instanceof HTMLButtonElement) {
            el.disabled = false;
          }
        });
      }
    };

    enterpriseOpeners.forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        openEnterpriseModal();
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', closeEnterpriseModal);
    }

    enterpriseModal.addEventListener('click', (event) => {
      if (event.target === enterpriseModal) {
        closeEnterpriseModal();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && enterpriseModal.classList.contains('open')) {
        closeEnterpriseModal();
      }
    });

    if (enterpriseForm && enterpriseStatus) {
      enterpriseForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitBtn = enterpriseForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.setAttribute('disabled', 'true');

        enterpriseStatus.textContent = 'Preparing your invoice request...';
        const captcha = await getCaptchaToken(enterpriseForm, enterpriseStatus, 'support_invoice');
        if (captcha.required && !captcha.token) {
          enterpriseStatus.textContent = 'Please complete the CAPTCHA challenge before submitting.';
          if (submitBtn) submitBtn.removeAttribute('disabled');
          return;
        }

        const formData = new FormData(enterpriseForm);
        const requiredValue = (name) => String(formData.get(name) || '').trim();
        const optionalValue = (name) => {
          const value = String(formData.get(name) || '').trim();
          return value || undefined;
        };

        const payload = {
          company_name: requiredValue('company_name'),
          contact_name: requiredValue('contact_name'),
          billing_email: requiredValue('billing_email'),
          country: requiredValue('country'),
          vat_id: optionalValue('vat_id'),
          address_line1: optionalValue('address_line1'),
          address_line2: optionalValue('address_line2'),
          city: optionalValue('city'),
          postal_code: optionalValue('postal_code'),
          attribution: getAttributionPayload(),
          captchaToken: captcha.token || undefined,
        };
        trackEvent('invoice_submit', { form_name: 'support_invoice' });

        try {
          const response = await fetch('/api/public/request-support-invoice', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const message = await readErrorMessage(response);
            throw new Error(message || 'Request failed');
          }

          const data = await response.json();
          if (data && data.ok) {
            Array.from(enterpriseForm.elements).forEach((el) => {
              if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement || el instanceof HTMLButtonElement) {
                el.disabled = true;
              }
            });
            const hostedInvoiceUrl = typeof data.hosted_invoice_url === 'string' ? data.hosted_invoice_url : '';
            if (hostedInvoiceUrl) {
              trackEvent('invoice_success', { invoice_url: 'present' });
              enterpriseStatus.innerHTML =
                `<span class="alert">Invoice request submitted. We sent it to your billing email. <a href="${hostedInvoiceUrl}" target="_blank" rel="noopener noreferrer">Open invoice</a>.</span>`;
            } else {
              trackEvent('invoice_success', { invoice_url: 'absent' });
              enterpriseStatus.innerHTML =
                '<span class="alert">Invoice request submitted. Please check your billing email for invoice details.</span>';
            }
            return;
          }
          throw new Error('Unexpected response format');
        } catch (error) {
          console.error(error);
          const detail = error instanceof Error ? error.message : '';
          if (/captcha/i.test(detail)) {
            enterpriseStatus.textContent = 'CAPTCHA verification failed. Please retry the challenge.';
          } else if (detail) {
            enterpriseStatus.textContent = detail;
          } else {
            enterpriseStatus.textContent = 'We could not submit your invoice request. Please try again or contact support@kanap.net.';
          }
          trackEvent('invoice_error', { form_name: 'support_invoice' });
          resetCaptcha(enterpriseForm);
          if (submitBtn) submitBtn.removeAttribute('disabled');
        }
      });
    }
  }

  const contactForm = document.querySelector('[data-contact-form]');
  const contactStatus = document.querySelector('[data-contact-status]');

  if (contactForm && contactStatus) {
    ensureTurnstileWidget(contactForm, contactStatus, 'contact').catch((error) => {
      console.warn('[captcha] Contact captcha widget initialization failed:', error);
    });

    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.setAttribute('disabled', 'true');

      contactStatus.textContent = 'Sending your message...';
      const captcha = await getCaptchaToken(contactForm, contactStatus, 'contact');
      if (captcha.required && !captcha.token) {
        contactStatus.textContent = 'Please complete the CAPTCHA challenge before sending your message.';
        if (submitBtn) submitBtn.removeAttribute('disabled');
        return;
      }

      const payload = {
        name: contactForm.name.value.trim(),
        email: contactForm.email.value.trim(),
        company: contactForm.company.value.trim(),
        message: contactForm.message.value.trim(),
        attribution: getAttributionPayload(),
        captchaToken: captcha.token || undefined,
      };
      trackEvent('contact_submit', { form_name: 'contact' });

      try {
        const response = await fetch('/api/public/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const message = await readErrorMessage(response);
          throw new Error(message || 'Request failed');
        }

        const data = await response.json();
        if (data && data.ok) {
          trackEvent('contact_success', { form_name: 'contact' });
          contactStatus.innerHTML =
            '<span class="alert">Thank you! We will reply within one business day.</span>';
          contactForm.reset();
          return;
        }
        throw new Error('Unexpected response format');
      } catch (error) {
        console.error(error);
        const detail = error instanceof Error ? error.message : '';
        if (/captcha/i.test(detail)) {
          contactStatus.textContent = 'CAPTCHA verification failed. Please retry the challenge.';
        } else {
          contactStatus.textContent = 'We could not send your message. Please try again or email support@kanap.net directly.';
        }
        trackEvent('contact_error', { form_name: 'contact' });
        resetCaptcha(contactForm);
      } finally {
        if (submitBtn) submitBtn.removeAttribute('disabled');
      }
    });
  }


  // Screenshot lightbox
  (function initLightbox() {
    var overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.style.display = 'none';
    var img = document.createElement('img');
    overlay.appendChild(img);
    document.body.appendChild(overlay);
    var open = false;

    function close() {
      if (!open) return;
      open = false;
      overlay.classList.remove('active');
      setTimeout(function () { overlay.style.display = 'none'; }, 200);
    }

    overlay.addEventListener('click', function () {
      close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    document.querySelectorAll('.screenshot-img').forEach(function (el) {
      el.addEventListener('click', function () {
        trackEvent('screenshot_open', { alt_text: el.alt || 'unknown' });
        img.src = el.src;
        img.alt = el.alt;
        overlay.style.display = 'flex';
        open = true;
        // Double rAF ensures the browser paints display:flex at opacity 0
        // before transitioning to opacity 1
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            overlay.classList.add('active');
          });
        });
      });
    });
  })();

  const activationContainer = document.querySelector('[data-activation]');
  const activationMessage = activationContainer?.querySelector('[data-activation-message]');
  const activationActions = activationContainer?.querySelector('[data-activation-actions]');

  if (activationContainer && activationMessage) {
    const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash);
    const queryParams = new URLSearchParams(window.location.search);
    // TODO: remove query-string fallback after one release.
    const token = hashParams.get('token') || queryParams.get('token');
    if (token && (window.location.hash || window.location.search)) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    if (!token) {
      activationMessage.textContent = 'Activation token is missing. Create a new workspace from the home page.';
      if (activationActions) activationActions.removeAttribute('hidden');
      return;
    }

    const redirectAfter = (tenantUrl, resetToken) => {
      const base = tenantUrl.replace(/\/$/, '');
      const fragment = new URLSearchParams({ token: resetToken, from: 'trial' });
      const target = `${base}/reset-password#${fragment.toString()}`;
      activationMessage.textContent = 'Tenant created. Redirecting you to set your password...';
      window.setTimeout(() => {
        window.location.href = target;
      }, 1200);
    };

    (async () => {
      activationMessage.textContent = 'Activating your workspace...';
      try {
        const response = await fetch('/api/public/activate-trial', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const detail = await response.text();
          throw new Error(detail || 'Activation failed');
        }

        const data = await response.json();
        if (data && data.tenant_url && data.reset_token) {
          redirectAfter(data.tenant_url, data.reset_token);
        } else {
          throw new Error('Unexpected response format');
        }
      } catch (error) {
        console.error(error);
        activationMessage.textContent = 'We could not activate your workspace. The link may have expired. Create a new workspace from the home page.';
        if (activationActions) activationActions.removeAttribute('hidden');
      }
    })();
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const offerLink = target.closest('a[href$=\"offer.html\"]');
    if (offerLink) {
      trackEvent('pricing_cta_click', { cta_type: 'offer_link' });
      return;
    }
    const contactLink = target.closest('a[href$=\"contact.html\"]');
    if (contactLink) {
      trackEvent('contact_cta_click', { cta_type: 'contact_link' });
    }
  });
})();
