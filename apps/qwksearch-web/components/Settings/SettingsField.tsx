'use client';

import { UIConfigField } from '../../lib/config/types';
import { useEffect, useState } from 'react';
import grab from 'grab-url';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '../ui/select';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { Link2, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { copyAnchorLink } from './anchors';
import {
  SettingsField as SettingsFieldRenderer,
  type SettingsClassNames,
  type SettingsFieldRenderProps,
  type SettingsFieldRenderers,
  type SettingsValue,
} from 'shadcn-settings';

const fieldAnchorId = (dataAdd: string, fieldKey: string) =>
  `${dataAdd}-${fieldKey}`;

// Class-name overrides that keep the shadcn-settings renderer looking like the
// rest of the app (light-200 / dark-primary tokens, muted helper text).
const APP_FIELD_CLASSNAMES: SettingsClassNames = {
  root: 'rounded-xl border border-light-200 bg-light-primary/80 dark:border-dark-200 dark:bg-dark-primary/80',
  title: 'text-black dark:text-white',
  description: 'text-black/50 dark:text-white/50',
};

const emitClientConfigChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('client-config-changed'));
  }
};

// ---------------------------------------------------------------------------
// Theme picker — app-specific variant injected into the shared renderer.
// ---------------------------------------------------------------------------

const themeNames = [
  "modern-minimal", "elegant-luxury", "cyberpunk", "twitter",
  "mocha-mousse", "amethyst-haze", "notebook", "doom-64",
  "catppuccin", "graphite", "perpetuity", "kodama-grove",
  "cosmic-night", "tangerine", "nature", "bold-tech",
  "amber-minimal", "supabase", "neo-brutalism", "quantum-rose",
  "solar-dusk", "bubblegum", "pink-lemonade", "claymorphism",
  "pastel-dreams",
];

const themeColors: Record<string, { primary: string; secondary: string }> = {
  "modern-minimal": { primary: "#3b82f6", secondary: "#f3f4f6" },
  "elegant-luxury": { primary: "#9b2c2c", secondary: "#fdf2d6" },
  "cyberpunk": { primary: "#ff00c8", secondary: "#f0f0ff" },
  "twitter": { primary: "#1e9df1", secondary: "#0f1419" },
  "mocha-mousse": { primary: "#A37764", secondary: "#BAAB92" },
  "bubblegum": { primary: "#d04f99", secondary: "#8acfd1" },
  "amethyst-haze": { primary: "#8a79ab", secondary: "#dfd9ec" },
  "pink-lemonade": { primary: "#a84370", secondary: "#f1c4e6" },
  "notebook": { primary: "#606060", secondary: "#dedede" },
  "doom-64": { primary: "#b71c1c", secondary: "#556b2f" },
  "catppuccin": { primary: "#8839ef", secondary: "#ccd0da" },
  "graphite": { primary: "#606060", secondary: "#e0e0e0" },
  "perpetuity": { primary: "#06858e", secondary: "#d9eaea" },
  "kodama-grove": { primary: "#8d9d4f", secondary: "#decea0" },
  "cosmic-night": { primary: "#6e56cf", secondary: "#e4dfff" },
  "tangerine": { primary: "#e05d38", secondary: "#f3f4f6" },
  "quantum-rose": { primary: "#e6067a", secondary: "#ffd6ff" },
  "nature": { primary: "#2e7d32", secondary: "#e8f5e9" },
  "bold-tech": { primary: "#8b5cf6", secondary: "#f3f0ff" },
  "amber-minimal": { primary: "#f59e0b", secondary: "#f3f4f6" },
  "supabase": { primary: "#72e3ad", secondary: "#fdfdfd" },
  "neo-brutalism": { primary: "#ff3333", secondary: "#ffff00" },
  "solar-dusk": { primary: "#B45309", secondary: "#E4C090" },
  "claymorphism": { primary: "#6366f1", secondary: "#d6d3d1" },
  "pastel-dreams": { primary: "#a78bfa", secondary: "#e9d8fd" },
};

const formatThemeName = (name: string) =>
  name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const SettingsThemeSelect = ({
  field,
  anchorId,
  titleAddon,
}: SettingsFieldRenderProps) => {
  const { theme, setTheme } = useTheme();
  const [colorTheme, setColorTheme] = useState("modern-minimal");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("color-theme");
    if (saved && themeNames.includes(saved)) setColorTheme(saved);
  }, []);

  const handleColorThemeChange = (newTheme: string) => {
    setColorTheme(newTheme);
    localStorage.setItem("color-theme", newTheme);
    document.cookie = `color-theme=${newTheme}; path=/; max-age=31536000`;
    themeNames.forEach(t => document.documentElement.classList.remove(`theme-${t}`));
    document.documentElement.classList.add(`theme-${newTheme}`);
    emitClientConfigChanged();
  };

  if (!mounted) return null;

  const colors = themeColors[colorTheme];

  return (
    <section
      id={anchorId}
      className="scroll-mt-4 rounded-xl border border-light-200 bg-light-primary/80 p-4 lg:p-6 transition-colors dark:border-dark-200 dark:bg-dark-primary/80"
    >
      <div className="space-y-3 lg:space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="flex items-center gap-1.5 text-sm text-black dark:text-white">
              {field.name}
              {titleAddon}
            </h4>
            <p className="text-[11px] lg:text-xs text-black/50 dark:text-white/50">
              {field.description}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle light/dark"
          >
            {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
        </div>
        <Select value={colorTheme} onValueChange={handleColorThemeChange}>
          <SelectTrigger className="w-full bg-light-primary dark:bg-dark-primary border-light-200 dark:border-dark-200 text-black dark:text-white">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div
                  className="w-3 h-3 rounded-full border border-black/10"
                  style={{ backgroundColor: colors?.primary }}
                />
                <div
                  className="w-3 h-3 rounded-full border border-black/10"
                  style={{ backgroundColor: colors?.secondary }}
                />
              </div>
              <span>{formatThemeName(colorTheme)}</span>
            </div>
          </SelectTrigger>
          <SelectContent className="bg-light-primary dark:bg-dark-primary border-light-200 dark:border-dark-200 max-h-72 overflow-y-auto">
            {themeNames.map((name) => {
              const c = themeColors[name];
              return (
                <SelectItem
                  key={name}
                  value={name}
                  className="text-black dark:text-white focus:bg-light-200 dark:focus:bg-dark-200"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div
                        className="w-3 h-3 rounded-full border border-black/10"
                        style={{ backgroundColor: c.primary }}
                      />
                      <div
                        className="w-3 h-3 rounded-full border border-black/10"
                        style={{ backgroundColor: c.secondary }}
                      />
                    </div>
                    <span>{formatThemeName(name)}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </section>
  );
};

const CUSTOM_RENDERERS: SettingsFieldRenderers = {
  theme: SettingsThemeSelect,
};

// A small copy-link button rendered next to each field's title, matching the
// previous AnchorTitle affordance.
const AnchorLinkButton = ({ anchorId }: { anchorId: string }) => (
  <button
    type="button"
    onClick={() => copyAnchorLink(anchorId)}
    title="Copy link to this section"
    className="group/anchor inline-flex cursor-pointer items-center"
  >
    <Link2
      size={12}
      className="shrink-0 opacity-0 transition-opacity group-hover/anchor:opacity-60"
    />
  </button>
);

// ---------------------------------------------------------------------------

const SettingsField = ({
  field,
  value,
  dataAdd,
}: {
  field: UIConfigField;
  value: any;
  dataAdd: string;
}) => {
  const [val, setVal] = useState<SettingsValue>(value);
  const { setTheme } = useTheme();
  const anchorId = fieldAnchorId(dataAdd, field.key);

  // Persist a committed value: client-scoped fields write to localStorage,
  // server-scoped fields POST to the config API. Errors are surfaced via a
  // toast and never rejected, so the renderer's spinner always clears.
  const handleCommit = async (newValue: SettingsValue) => {
    try {
      if (field.scope === 'client') {
        localStorage.setItem(field.key, String(newValue ?? ''));
        if (field.key === 'theme' && typeof newValue === 'string') {
          setTheme(newValue);
        }
        emitClientConfigChanged();
      } else {
        await grab('config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: `${dataAdd}.${field.key}`,
            value: newValue,
          }),
        });
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration.');
    }
  };

  return (
    <SettingsFieldRenderer
      field={field as unknown as SettingsFieldRenderProps['field']}
      value={val}
      onChange={setVal}
      onCommit={handleCommit}
      anchorId={anchorId}
      titleAddon={<AnchorLinkButton anchorId={anchorId} />}
      classNames={APP_FIELD_CLASSNAMES}
      renderers={CUSTOM_RENDERERS}
    />
  );
};

export default SettingsField;
