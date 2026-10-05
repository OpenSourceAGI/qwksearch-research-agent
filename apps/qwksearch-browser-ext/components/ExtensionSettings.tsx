import { useEffect, useState } from 'react';
import { BookOpen, Keyboard, Layers } from 'lucide-react';
import SearchSettings from './SearchSettings';
import { getOpenInTab, setOpenInTab } from '@/lib/extension-settings';
import { WELCOME_PAGE } from '@/lib/welcome';

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
        checked ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function LinkRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-gray-800 hover:bg-gray-100"
    >
      {icon}
      {label}
    </button>
  );
}

export default function ExtensionSettings() {
  const [openInTab, setOpenInTabState] = useState(false);

  useEffect(() => {
    getOpenInTab().then(setOpenInTabState);
  }, []);

  const open = (url: string) => chrome.tabs.create({ url });

  return (
    <div className="space-y-4">
      <section className="space-y-3 p-4 text-sm">
        <h2 className="font-semibold text-gray-900">Extension</h2>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium text-gray-800">Open in a full tab</div>
            <div className="text-xs text-gray-500">
              The toolbar icon and Ctrl+Q open QwkSearch as a full browser tab instead of the side panel.
            </div>
          </div>
          <Switch
            label="Open in a full tab"
            checked={openInTab}
            onChange={(next) => {
              setOpenInTabState(next);
              setOpenInTab(next);
            }}
          />
        </div>
        <div className="-mx-2">
          <LinkRow
            icon={<Layers size={15} />}
            label="Tab organizer settings (AI connection, Notion, export & import)"
            onClick={() => open(chrome.runtime.getURL('app.html#settings'))}
          />
          <LinkRow
            icon={<Keyboard size={15} />}
            label="Keyboard shortcuts"
            onClick={() => open('chrome://extensions/shortcuts')}
          />
          <LinkRow
            icon={<BookOpen size={15} />}
            label="Welcome and feature guide"
            onClick={() => open(chrome.runtime.getURL(WELCOME_PAGE))}
          />
        </div>
      </section>
      <section className="border-t border-gray-200">
        <h2 className="px-4 pt-4 text-sm font-semibold text-gray-900">AI chat</h2>
        <SearchSettings />
      </section>
    </div>
  );
}
