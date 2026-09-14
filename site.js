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
    var dialog = document.querySelector('[data-share-dialog]');
    if (!dialog) return;

    var closeButton = dialog.querySelector('[data-share-close]');
    var copyButton = dialog.querySelector('[data-share-copy]');
    var nativeButton = dialog.querySelector('[data-share-native]');
    var status = dialog.querySelector('[data-share-status]');
    var shareData;

    function currentShareData() {
      var canonical = document.querySelector('link[rel="canonical"]');
      var description = document.querySelector('meta[name="description"]');
      var heading = document.querySelector('h1');
      var title = heading ? heading.textContent.trim() : document.title;
      return {
        title: title,
        text: description ? description.getAttribute('content') : '',
        url: canonical ? canonical.href : window.location.href
      };
    }

    function setStatus(message) {
      if (status) status.textContent = message;
    }

    function closeDialog() {
      if (dialog.open) dialog.close();
    }

    function copyLink() {
      var url = shareData.url;
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(url).then(function () {
          setStatus('Link copied to clipboard.');
        });
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
        setStatus('Link copied to clipboard.');
        return Promise.resolve();
      }
      return Promise.reject(new Error('Clipboard access was unavailable.'));
    }

    function prepareDialog() {
      shareData = currentShareData();
      var message = shareData.title + '\n' + shareData.url;
      dialog.querySelector('[data-share-x]').href = 'https://x.com/intent/tweet?text=' + encodeURIComponent(shareData.title) + '&url=' + encodeURIComponent(shareData.url);
      dialog.querySelector('[data-share-reddit]').href = 'https://www.reddit.com/submit?url=' + encodeURIComponent(shareData.url) + '&title=' + encodeURIComponent(shareData.title);
      dialog.querySelector('[data-share-whatsapp]').href = 'https://wa.me/?text=' + encodeURIComponent(message);
      dialog.querySelector('[data-share-email]').href = 'mailto:?subject=' + encodeURIComponent(shareData.title) + '&body=' + encodeURIComponent(message);
      setStatus('');
      nativeButton.hidden = !navigator.share;
    }

    Array.prototype.forEach.call(document.querySelectorAll('[data-share-button]'), function (button) {
      button.addEventListener('click', function () {
        prepareDialog();
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
      });
    });

    closeButton.addEventListener('click', closeDialog);
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) closeDialog();
    });
    copyButton.addEventListener('click', function () {
      copyLink().catch(function () {
        setStatus('Could not copy the link. Select it from your browser address bar.');
      });
    });
    nativeButton.addEventListener('click', function () {
      navigator.share(shareData).then(closeDialog).catch(function (error) {
        if (!error || error.name !== 'AbortError') setStatus('Could not open the system share options.');
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
