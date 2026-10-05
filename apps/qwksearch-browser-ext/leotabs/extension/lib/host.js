// SPDX-License-Identifier: MPL-2.0
// LeoTabs ships inside the QwkSearch extension, whose manifest declares a side
// panel. There the side panel owns the toolbar button and QwkSearch owns the
// first-install page, so LeoTabs leaves both alone. The standalone manifest
// (extension/manifest.json) has no side panel and keeps the original behaviour.
export const isEmbedded = browser => Boolean(browser.runtime?.getManifest?.()?.side_panel);

// The toolbar icon and title LeoTabs restores when a window has no current
// collection: whatever the running manifest declares, so the host's own branding
// comes back rather than the lion.
const STANDALONE_ICONS = {16:'icons/16.png',20:'icons/20.png',24:'icons/24.png',32:'icons/32.png'};
export function defaultAction(browser) {
  const action = browser.runtime?.getManifest?.()?.action;
  return {
    path: action?.default_icon && typeof action.default_icon === 'object' ? action.default_icon : STANDALONE_ICONS,
    title: action?.default_title || 'Open LeoTabs library',
  };
}
