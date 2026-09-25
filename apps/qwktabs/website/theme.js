
// Local appearance preference, with no network calls.
(() => {
  const key = 'leotabs-site-theme';
  const normalise = value => ['light', 'dark'].includes(value) ? value : 'system';
  let preference = 'system';
  try { preference = normalise(localStorage.getItem(key)); } catch {}
  const apply = value => {
    preference = normalise(value);
    if (preference === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = preference;
    const select = document.querySelector('#theme');
    if (select) select.value = preference;
  };
  apply(preference);
  document.addEventListener('DOMContentLoaded', () => {
    const select = document.querySelector('#theme');
    if (!select) return;
    select.value = preference;
    select.closest('.theme-control').hidden = false;
    select.addEventListener('change', () => {
      apply(select.value);
      try {
        if (preference === 'system') localStorage.removeItem(key);
        else localStorage.setItem(key, preference);
      } catch {}
    });
  });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) apply(event.newValue);
  });
})();
