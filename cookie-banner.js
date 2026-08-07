(function () {
    var MEASUREMENT_ID = 'G-8N64KW0ELL';
    var CONSENT_KEY = 'cookie_consent';
    var analyticsStarted = false;
    var analyticsDisabled = false;

    function readConsent() {
        try {
            return window.localStorage.getItem(CONSENT_KEY);
        } catch (e) {
            return null;
        }
    }

    function writeConsent(status) {
        try {
            window.localStorage.setItem(CONSENT_KEY, status);
        } catch (e) {}
    }

    function defineGtag() {
        window.dataLayer = window.dataLayer || [];
        if (typeof window.gtag !== 'function') {
            window.gtag = function () {
                window.dataLayer.push(arguments);
            };
        }
    }

    function getPageType() {
        var bodyType = document.body && document.body.getAttribute('data-page-type');
        if (bodyType) return bodyType;

        var path = window.location.pathname.toLowerCase();

        if (path === '/' || path === '/index.html') return 'home';
        if (path === '/use-cases/' || path === '/use-cases/index.html') return 'use_case_index';
        if (path.indexOf('/use-cases/') === 0) return 'use_case';
        if (path === '/products/' || path === '/products/index.html') return 'product_index';
        if (/\/(batch[^/]*|key-rush)\.html$/.test(path)) return 'product';
        if (path.endsWith('/privacy.html')) return 'privacy';
        if (path.endsWith('/manifesto.html')) return 'manifesto';
        if (path.endsWith('/404.html')) return 'not_found';
        return 'other';
    }

    function loadAnalytics() {
        if (analyticsStarted || analyticsDisabled || readConsent() !== 'granted') {
            return;
        }

        analyticsStarted = true;
        defineGtag();

        window.gtag('consent', 'default', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
        });
        window.gtag('consent', 'update', {
            analytics_storage: 'granted',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
        });
        window.gtag('js', new Date());
        window.gtag('config', MEASUREMENT_ID, {
            page_type: getPageType()
        });

        var script = document.createElement('script');
        script.id = 'google-analytics-tag';
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
        script.onerror = function () {
            analyticsStarted = false;
            script.remove();
        };
        document.head.appendChild(script);
    }

    function analyticsCookieNames() {
        return document.cookie.split(';').map(function (part) {
            return part.split('=')[0].trim();
        }).filter(function (name) {
            return /^(_ga|_gid|_gat)/.test(name);
        });
    }

    function deleteAnalyticsCookies() {
        var host = window.location.hostname;
        var domains = ['', host, '.' + host, '3thousand30.com', '.3thousand30.com'];

        analyticsCookieNames().forEach(function (name) {
            domains.forEach(function (domain) {
                var cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; path=/; SameSite=Lax';
                if (domain) cookie += '; domain=' + domain;
                document.cookie = cookie;
            });
        });
    }

    function notifyConsentUI() {
        if (typeof window.updateConsentUI === 'function') {
            window.updateConsentUI();
        }
    }

    function closeBanner() {
        var banner = document.getElementById('cookie-banner');
        if (banner) banner.style.display = 'none';
    }

    function grantConsent() {
        writeConsent('granted');
        analyticsDisabled = false;
        loadAnalytics();
        closeBanner();
        notifyConsentUI();
    }

    function denyConsent() {
        writeConsent('denied');
        analyticsDisabled = true;

        if (analyticsStarted && typeof window.gtag === 'function') {
            window.gtag('consent', 'update', {
                analytics_storage: 'denied',
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied'
            });
        }

        deleteAnalyticsCookies();
        closeBanner();
        notifyConsentUI();
    }

    function sendAnalyticsEvent(eventName, parameters) {
        if (analyticsDisabled || readConsent() !== 'granted') {
            return;
        }

        loadAnalytics();
        if (typeof window.gtag === 'function') {
            parameters = parameters || {};
            parameters.transport_type = 'beacon';
            window.gtag('event', eventName, parameters);
        }
    }

    function linkLabel(link) {
        var container = link.closest('[data-analytics-name], article, .group');
        var namedElement = container && container.querySelector('[data-analytics-name], h1, h2, h3');
        var image = link.querySelector('img[alt]');
        var label = link.getAttribute('data-analytics-name') ||
            (namedElement && (namedElement.getAttribute('data-analytics-name') || namedElement.textContent)) ||
            link.textContent ||
            (image && image.alt) ||
            link.getAttribute('aria-label') ||
            '';

        return label.replace(/\s+/g, ' ').trim().slice(0, 120);
    }

    function initLinkTracking() {
        document.addEventListener('click', function (event) {
            var link = event.target.closest && event.target.closest('a[href]');
            if (!link) return;

            var url;
            try {
                url = new URL(link.href, window.location.href);
            } catch (e) {
                return;
            }

            if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

            var sameOrigin = url.origin === window.location.origin;
            var path = url.pathname.toLowerCase();
            var parameters = {
                link_url: url.href,
                link_text: linkLabel(link),
                source_path: window.location.pathname,
                destination_host: url.hostname
            };

            var explicitEvent = link.getAttribute('data-analytics-event');
            if (explicitEvent) {
                sendAnalyticsEvent(explicitEvent, parameters);
                return;
            }

            if (url.hostname === 'apps.microsoft.com') {
                sendAnalyticsEvent('store_click', parameters);
            } else if (sameOrigin && /\/(batch[^/]*|key-rush)\.html$/.test(path)) {
                sendAnalyticsEvent('product_click', parameters);
            } else if (sameOrigin && (path === '/products/' || path.endsWith('/products/index.html'))) {
                sendAnalyticsEvent('product_catalog_click', parameters);
            } else if (sameOrigin && path.indexOf('/use-cases/') === 0 && path !== '/use-cases/') {
                sendAnalyticsEvent('use_case_click', parameters);
            } else if (sameOrigin && (path === '/use-cases/' || path.endsWith('/use-cases/index.html'))) {
                sendAnalyticsEvent('use_case_catalog_click', parameters);
            } else if (!sameOrigin) {
                sendAnalyticsEvent('outbound_click', parameters);
            }
        });
    }

    function initCookieBanner() {
        if (!document.body) {
            return window.requestAnimationFrame(initCookieBanner);
        }

        initLinkTracking();

        var consent = readConsent();
        if (consent === 'granted') {
            loadAnalytics();
            return;
        }
        if (consent === 'denied' || document.getElementById('cookie-banner')) {
            return;
        }

        var banner = document.createElement('div');
        banner.id = 'cookie-banner';
        banner.className = 'fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pointer-events-none';
        banner.setAttribute('aria-live', 'polite');
        banner.innerHTML =
            '<div class="max-w-4xl mx-auto pointer-events-auto">' +
                '<div class="border bg-black p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4" style="border-color: rgba(0,255,65,0.3);">' +
                    '<div class="flex-1">' +
                        '<span class="text-retro-green text-xs opacity-60 block mb-1">&gt; analytics_consent.prompt</span>' +
                        '<p class="text-gray-400 text-xs leading-relaxed">We use Google Analytics to understand which pages and product links are useful. Analytics loads only if you accept. <a href="/privacy.html" class="text-retro-amber hover:text-white transition-colors underline decoration-dotted underline-offset-2">privacy policy →</a></p>' +
                    '</div>' +
                    '<div class="flex gap-3 shrink-0">' +
                        '<button id="cookie-accept" class="border border-retro-green text-retro-green text-xs px-4 py-2 hover:bg-retro-green hover:text-black transition-colors duration-200">accept</button>' +
                        '<button id="cookie-decline" class="border text-gray-500 text-xs px-4 py-2 hover:border-gray-400 hover:text-gray-300 transition-colors duration-200" style="border-color: rgba(168,168,168,0.3);">decline</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.appendChild(banner);

        document.getElementById('cookie-accept').addEventListener('click', grantConsent);
        document.getElementById('cookie-decline').addEventListener('click', denyConsent);
    }

    window.analyticsConsent = {
        getStatus: readConsent,
        grant: grantConsent,
        deny: denyConsent,
        track: sendAnalyticsEvent
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCookieBanner);
    } else {
        initCookieBanner();
    }
}());
