
export const UNINSTALL_URL = 'https://ringlochid.me/leotabs/uninstalled/';

export async function handleInstalled(browser, details) {
  // Register on updates too, so existing installations get the current exit page.
  // No identifiers, browsing data or version parameters are added to this URL.
  const tasks = [browser.runtime.setUninstallURL(UNINSTALL_URL)];
  if (details.reason === 'install') {
    tasks.push(browser.tabs.create({ url: browser.runtime.getURL('app.html') + '#onboarding' }));
  }
  await Promise.all(tasks);
}
