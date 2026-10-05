
// Being unsuitable for a library is different from being unmanageable.
export function utilityTab(url = '') {
  return /^(?:chrome|edge):\/\/(?:newtab|new-tab-page|settings|extensions|history|downloads)(?:[/?#]|$)/i.test(url)
    || /^about:(?:blank|newtab)(?:[?#]|$)/i.test(url);
}
export function manageableURL(url = '') {
  return /^(?:https?|file|chrome|edge|chrome-extension|extension):/i.test(url) || /^about:(?:blank|newtab)/i.test(url);
}

export function duplicateKey(tab) {
  const url = tab.resourceUrl || tab.pendingUrl || tab.url || '';
  if (!manageableURL(url)) return null;
  if (/^(?:chrome|edge):\/\/(?:newtab|new-tab-page)\/?$/i.test(url) || /^about:newtab$/i.test(url)) return 'browser-new-tab';
  return url;
}
