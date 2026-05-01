(function () {
    function initCookieBanner() {
        if (!document.body) {
            return window.requestAnimationFrame(initCookieBanner);
        }

        if (document.getElementById('cookie-banner')) {
            return;
        }

        var banner = document.createElement('div');
        banner.id = 'cookie-banner';
        banner.className = 'fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pointer-events-none';
        banner.style.display = 'none';
        banner.setAttribute('aria-live', 'polite');
        banner.innerHTML =
            '<div class="max-w-4xl mx-auto pointer-events-auto">' +
                '<div class="border bg-black p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4" style="border-color: rgba(0,255,65,0.3);">' +
                    '<div class="flex-1">' +
                        '<span class="text-retro-green text-xs opacity-60 block mb-1">&gt; analytics_consent.prompt</span>' +
                        '<p class="text-gray-400 text-xs leading-relaxed">We use Google Analytics to understand how visitors use this site. You can decline and nothing will be tracked. <a href="privacy.html" class="text-retro-amber hover:text-white transition-colors underline decoration-dotted underline-offset-2">privacy policy →</a></p>' +
                    '</div>' +
                    '<div class="flex gap-3 shrink-0">' +
                        '<button id="cookie-accept" class="border border-retro-green text-retro-green text-xs px-4 py-2 hover:bg-retro-green hover:text-black transition-colors duration-200">accept</button>' +
                        '<button id="cookie-decline" class="border text-gray-500 text-xs px-4 py-2 hover:border-gray-400 hover:text-gray-300 transition-colors duration-200" style="border-color: rgba(168,168,168,0.3);">decline</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.appendChild(banner);

        function updateAnalyticsConsent(status) {
            if (typeof gtag === 'function') {
                gtag('consent', 'update', { analytics_storage: status });
            }
        }

        function closeBanner() {
            banner.style.display = 'none';
        }

        var consent = null;
        try {
            consent = window.localStorage.getItem('cookie_consent');
        } catch (e) {
            consent = null;
        }

        if (consent === 'granted') {
            updateAnalyticsConsent('granted');
        } else if (consent === 'denied') {
            updateAnalyticsConsent('denied');
        } else {
            banner.style.display = 'block';
        }

        var acceptButton = document.getElementById('cookie-accept');
        var declineButton = document.getElementById('cookie-decline');

        if (acceptButton) {
            acceptButton.addEventListener('click', function () {
                try {
                    localStorage.setItem('cookie_consent', 'granted');
                } catch (e) {}
                updateAnalyticsConsent('granted');
                closeBanner();
                if (typeof window.updateConsentUI === 'function') window.updateConsentUI();
            });
        }

        if (declineButton) {
            declineButton.addEventListener('click', function () {
                try {
                    localStorage.setItem('cookie_consent', 'denied');
                } catch (e) {}
                updateAnalyticsConsent('denied');
                closeBanner();
                if (typeof window.updateConsentUI === 'function') window.updateConsentUI();
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCookieBanner);
    } else {
        initCookieBanner();
    }
}());
