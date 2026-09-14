(function () {
  function initMenu() {
    var toggle = document.querySelector('[data-menu-toggle]');
    var menu = document.querySelector('[data-mobile-menu]');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      menu.classList.toggle('hidden', open);
      var label = toggle.querySelector('.sr-only');
      var icon = toggle.querySelector('[data-menu-icon]');
      if (label) label.textContent = open ? 'Open navigation' : 'Close navigation';
      if (icon) icon.textContent = open ? '☰' : '×';
    });
  }

  function initCatalog(catalog) {
    var search = catalog.querySelector('[data-catalog-search]');
    var items = Array.prototype.slice.call(catalog.querySelectorAll('[data-catalog-item]'));
    var count = catalog.querySelector('[data-result-count]');
    var empty = catalog.querySelector('[data-empty-state]');
    var filters = Array.prototype.slice.call(catalog.querySelectorAll('[data-filter-group]'));
    var state = {};

    function applyFilters() {
      var query = search ? search.value.toLowerCase().trim() : '';
      var visible = 0;

      items.forEach(function (item) {
        var matchesSearch = !query || (item.getAttribute('data-search') || '').toLowerCase().indexOf(query) !== -1;
        var matchesFilters = Object.keys(state).every(function (group) {
          var value = state[group];
          if (!value || value === 'all') return true;
          var values = group === 'kind'
            ? (item.getAttribute('data-kind') || '').split(/\s+/)
            : (item.getAttribute('data-categories') || '').split(/\s+/);
          return values.indexOf(value) !== -1;
        });
        var show = matchesSearch && matchesFilters;
        item.hidden = !show;
        if (show) visible += 1;
      });

      if (count) count.textContent = visible + (visible === 1 ? ' result' : ' results');
      if (empty) empty.hidden = visible !== 0;
    }

    filters.forEach(function (control) {
      var group = control.getAttribute('data-filter-group');
      var isSelect = control.tagName === 'SELECT';
      if (!state[group] && (isSelect || control.getAttribute('aria-pressed') === 'true')) {
        state[group] = isSelect ? control.value : control.getAttribute('data-filter-value');
      }

      control.addEventListener(isSelect ? 'change' : 'click', function () {
        var value = isSelect ? control.value : control.getAttribute('data-filter-value');
        state[group] = value;
        if (!isSelect) {
          filters.filter(function (candidate) {
            return candidate.getAttribute('data-filter-group') === group;
          }).forEach(function (candidate) {
            candidate.setAttribute('aria-pressed', String(candidate === control));
          });
        }
        applyFilters();
      });
    });

    if (search) search.addEventListener('input', applyFilters);
    applyFilters();
  }

  function initShareControls() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-share-button]'), function (button) {
      var originalLabel = button.textContent.trim();
      var status = document.getElementById(button.getAttribute('aria-describedby'));

      function showCopied() {
        button.textContent = 'link copied';
        if (status) status.textContent = 'Link copied to clipboard.';
        window.setTimeout(function () {
          button.textContent = originalLabel;
        }, 2200);
      }

      function copyLink() {
        var url = window.location.href;
        if (navigator.clipboard && window.isSecureContext) {
          return navigator.clipboard.writeText(url).then(showCopied);
        }

        var field = document.createElement('textarea');
        field.value = url;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        var copied = document.execCommand('copy');
        document.body.removeChild(field);
        if (copied) {
          showCopied();
          return Promise.resolve();
        }
        return Promise.reject(new Error('Clipboard access was unavailable.'));
      }

      button.addEventListener('click', function () {
        var description = document.querySelector('meta[name="description"]');
        var shareData = {
          title: document.title,
          text: description ? description.getAttribute('content') : '',
          url: window.location.href
        };

        if (navigator.share) {
          navigator.share(shareData).catch(function (error) {
            if (error && error.name === 'AbortError') return;
            copyLink().catch(function () {
              if (status) status.textContent = 'Could not copy the link. Select it from your browser address bar.';
            });
          });
          return;
        }

        copyLink().catch(function () {
          if (status) status.textContent = 'Could not copy the link. Select it from your browser address bar.';
        });
      });
    });
  }

  function initReveal() {
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    if (!items.length || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    items.forEach(function (item) { item.classList.add('reveal-ready'); });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (item) { observer.observe(item); });
  }

  function initWorkFocus() {
    var focus = new URLSearchParams(window.location.search).get('focus');
    if (!focus) return;
    var target = document.querySelector('[data-work-slug="' + focus.replace(/[^a-z0-9-]/gi, '') + '"]');
    if (!target) return;
    target.classList.add('work-focused');
    window.setTimeout(function () {
      target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    }, 30);
  }

  function updateConsentUI() {
    var status = window.analyticsConsent ? window.analyticsConsent.getStatus() : null;
    Array.prototype.forEach.call(document.querySelectorAll('[data-consent-status]'), function (element) {
      element.textContent = status === 'granted' ? 'accepted' : status === 'denied' ? 'declined' : 'not chosen';
    });
  }

  function initConsentControls() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-consent-grant]'), function (button) {
      button.addEventListener('click', function () {
        if (window.analyticsConsent) window.analyticsConsent.grant();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-consent-deny]'), function (button) {
      button.addEventListener('click', function () {
        if (window.analyticsConsent) window.analyticsConsent.deny();
      });
    });
    updateConsentUI();
  }

  window.updateConsentUI = updateConsentUI;

  function init() {
    initMenu();
    Array.prototype.forEach.call(document.querySelectorAll('[data-filter-catalog]'), initCatalog);
    initShareControls();
    initReveal();
    initWorkFocus();
    initConsentControls();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
