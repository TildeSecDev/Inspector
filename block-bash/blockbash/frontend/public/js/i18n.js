// Simple i18n loader with localStorage-based language selection
(function(){
  const DEFAULT_LANG = 'english';
  const lang = localStorage.getItem('lang') || DEFAULT_LANG;
  let currentPage = null; // Store current page globally

  function setLang(newLang){
    localStorage.setItem('lang', newLang);
    window.location.reload();
  }

  async function loadJSON(url){
    const res = await fetch(url);
    if(!res.ok) throw new Error('i18n fetch failed: ' + url);
    return res.json();
  }

  // Load a namespace file (e.g., index.json) and return the map
  async function loadNamespace(ns){
    return loadJSON(`/languages/${lang}/${ns}.json`).catch(()=>({}));
  }

  // Replace visible text by data-i18n keys
  function applyTranslations(map){
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
  const val = map[key] || map[key.replace(/\s+/g,' ')] || (currentPage ? map[`${currentPage}.${key}`] : null) || null;
      if(val == null) return;
      if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'){
        if(el.hasAttribute('placeholder')) el.setAttribute('placeholder', val);
        else el.value = val;
      } else if(el.tagName === 'IMG' && el.hasAttribute('alt')) {
        el.setAttribute('alt', val);
      } else {
        el.textContent = val;
      }
    });
    // Title attributes
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
  const val = map[key] || (currentPage ? map[`${currentPage}.${key}`] : null);
      if(val) el.setAttribute('title', val);
    });
  }

  // Expose a minimal API
  window.i18n = {
    setLang,
    async init(namespaces){
      const maps = await Promise.all(namespaces.map(loadNamespace));
      const merged = Object.assign({}, ...maps);
      applyTranslations(merged);
      return merged;
    },
    t(key, fallback){
      // lazy map cache on first call
      if(!window.__i18nMap) return fallback !== undefined ? fallback : key;
      return window.__i18nMap[key] || (fallback !== undefined ? fallback : key);
    }
  };

  // Auto-initialize based on page
  document.addEventListener('DOMContentLoaded', async () => {
    currentPage = (document.body.getAttribute('data-page') || 'index').toLowerCase();
  const namespaces = ['common', currentPage];
  // Auto-add notifications namespace if element referencing notification dropdown exists
  if(document.getElementById('notification-btn')) namespaces.push('notifications');
    try {
      const maps = await Promise.all(namespaces.map(n => loadNamespace(n)));
      window.__i18nMap = Object.assign({}, ...maps);
      applyTranslations(window.__i18nMap);
      // RTL support (set dir attribute) for specified languages
      const rtlLangs = ['arabic'];
      if(rtlLangs.includes(lang)) {
        document.documentElement.setAttribute('dir','rtl');
        document.body.classList.add('rtl');
      } else {
        document.documentElement.setAttribute('dir','ltr');
        document.body.classList.remove('rtl');
      }
      // Wire header language selector if present
      const selectors = Array.from(document.querySelectorAll('.language-select, #language-select'));
      selectors.forEach(sel => {
        try { sel.value = lang; } catch {}
        sel.addEventListener('change', (e)=> setLang(e.target.value));
      });
    } catch(e){
      console.warn('i18n init failed', e);
    }
  });
})();
