import { useEffect, useState } from 'react';
import { Maximize2 } from 'lucide-react';

/**
 * The LeoTabs tab organizer, embedded. LeoTabs is a plain-JS extension page
 * (`app.html`, copied into the build from `leotabs/extension`), so it is framed
 * rather than rewritten. `?window=` tells it which browser window's tabs to show,
 * since a framed page has no tab of its own to ask.
 */
export default function OrganizerFrame() {
  const [windowId, setWindowId] = useState<number | null>(null);

  useEffect(() => {
    chrome.windows.getCurrent().then((w) => setWindowId(w.id ?? -1));
  }, []);

  const openLibrary = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('app.html') });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-1 pb-1 text-xs text-gray-500">
        <span>Organize open tabs, collections and spaces</span>
        <button
          type="button"
          onClick={openLibrary}
          title="Open the full library (Alt+Shift+Q)"
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-gray-200 hover:text-gray-800"
        >
          <Maximize2 size={12} />
          Full library
        </button>
      </div>
      {windowId !== null && (
        <iframe
          title="Tab organizer"
          src={`app.html${windowId > 0 ? `?window=${windowId}` : ''}`}
          className="min-h-0 w-full flex-1 rounded-md border border-gray-200 bg-white"
        />
      )}
    </div>
  );
}
