import { useCallback, useEffect, useState } from 'react';
import { fetchSession, type QwkSearchUser } from '@/lib/qwksearch-auth';
import { API_BASE } from '@/lib/grab-url-shim';

/**
 * The signed-in QwkSearch user, re-read whenever the panel regains focus or a
 * qwksearch.com tab finishes loading, since signing in happens in another tab.
 */
export function useQwkSearchSession() {
  const [user, setUser] = useState<QwkSearchUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setUser(await fetchSession());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const onTabUpdated = (_id: number, change: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      if (change.status === 'complete' && tab.url?.startsWith(API_BASE)) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    chrome.tabs.onUpdated.addListener(onTabUpdated);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
      chrome.tabs.onUpdated.removeListener(onTabUpdated);
    };
  }, [refresh]);

  return { user, loading, refresh };
}
