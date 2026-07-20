import {
  PasswordUIConfigField,
  SelectUIConfigField,
  StringUIConfigField,
  SwitchUIConfigField,
  TextareaUIConfigField,
  ThemeUIConfigField,
  UIConfigField,
} from '../../lib/config/types';
import { useState, useEffect } from 'react';
import grab from 'grab-url';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { Eye, EyeOff, Loader2, Moon, Sun } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { AnchorTitle } from './anchors';

const fieldAnchorId = (dataAdd: string, fieldKey: string) =>
  `${dataAdd}-${fieldKey}`;

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

const FieldLinks = ({ links }: { links?: { name: string; url: string }[] }) => {
  if (!links?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {links.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] lg:text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline"
        >
          {link.name}
        </a>
      ))}
    </div>
  );
};

const emitClientConfigChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('client-config-changed'));
  }
};

const SettingsSelect = ({
  field,
  value,
  setValue,
  dataAdd,
}: {
  field: SelectUIConfigField;
  value?: any;
  setValue: (value: any) => void;
  dataAdd: string;
}) => {
  const [loading, setLoading] = useState(false);
  const { setTheme } = useTheme();

  const handleSave = async (newValue: any) => {
    setLoading(true);
    setValue(newValue);
    try {
      if (field.scope === 'client') {
        localStorage.setItem(field.key, newValue);
        if (field.key === 'theme') {
          setTheme(newValue);
        }
        emitClientConfigChanged();
      } else {
        await grab('config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: `${dataAdd}.${field.key}`,
            value: newValue,
          }),
        });
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration.');
    } finally {
      setTimeout(() => setLoading(false), 150);
    }
  };

  return (
    <section
      id={fieldAnchorId(dataAdd, field.key)}
      className="scroll-mt-4 rounded-xl border border-light-200 bg-light-primary/80 p-4 lg:p-6 transition-colors dark:border-dark-200 dark:bg-dark-primary/80"
    >
      <div className="space-y-3 lg:space-y-5">
        <div>
          <h4 className="text-sm lg:text-sm text-black dark:text-white">
            <AnchorTitle anchorId={fieldAnchorId(dataAdd, field.key)}>
              {field.name}
            </AnchorTitle>
          </h4>
          <p className="text-[11px] lg:text-xs text-black/50 dark:text-white/50">
            {field.description}
          </p>
          <FieldLinks links={field.links} />
        </div>
        <Select
          value={value}
          onValueChange={(newValue) => handleSave(newValue)}
          disabled={loading}
        >
          <SelectTrigger className="w-full bg-light-primary dark:bg-dark-primary border-light-200 dark:border-dark-200 text-black dark:text-white">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent className="bg-light-primary dark:bg-dark-primary border-light-200 dark:border-dark-200">
            {field.options
              .filter((option) => option.value !== '')
              .map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-black dark:text-white focus:bg-light-200 dark:focus:bg-dark-200"
                >
                  {option.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  );
};

const SettingsInput = ({
  field,
  value,
  setValue,
  dataAdd,
}: {
  field: StringUIConfigField;
  value?: any;
  setValue: (value: any) => void;
  dataAdd: string;
}) => {
  const [loading, setLoading] = useState(false);

  const handleSave = async (newValue: any) => {
    setLoading(true);
    setValue(newValue);
    try {
      if (field.scope === 'client') {
        localStorage.setItem(field.key, newValue);
        emitClientConfigChanged();
      } else {
        await grab('config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: `${dataAdd}.${field.key}`,
            value: newValue,
          }),
        });
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration.');
    } finally {
      setTimeout(() => setLoading(false), 150);
    }
  };

  return (
    <section
      id={fieldAnchorId(dataAdd, field.key)}
      className="scroll-mt-4 rounded-xl border border-light-200 bg-light-primary/80 p-4 lg:p-6 transition-colors dark:border-dark-200 dark:bg-dark-primary/80"
    >
      <div className="space-y-3 lg:space-y-5">
        <div>
          <h4 className="text-sm lg:text-sm text-black dark:text-white">
            <AnchorTitle anchorId={fieldAnchorId(dataAdd, field.key)}>
              {field.name}
            </AnchorTitle>
          </h4>
          <p className="text-[11px] lg:text-xs text-black/50 dark:text-white/50">
            {field.description}
          </p>
          <FieldLinks links={field.links} />
        </div>
        <div className="relative">
          <input
            value={value ?? field.default ?? ''}
            onChange={(event) => setValue(event.target.value)}
            onBlur={(event) => handleSave(event.target.value)}
            className="w-full rounded-lg border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary px-3 py-2 lg:px-4 lg:py-3 pr-10 !text-xs lg:!text-[13px] text-black/80 dark:text-white/80 placeholder:text-black/40 dark:placeholder:text-white/40 focus-visible:outline-none focus-visible:border-light-300 dark:focus-visible:border-dark-300 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            placeholder={field.placeholder}
            type="text"
            disabled={loading}
          />
          {loading && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40">
              <Loader2 className="h-4 w-4 animate-spin" />
            </span>
          )}
        </div>
      </div>
    </section>
  );
};

const SettingsPasswordInput = ({
  field,
  value,
  setValue,
  dataAdd,
}: {
  field: PasswordUIConfigField;
  value?: any;
  setValue: (value: any) => void;
  dataAdd: string;
}) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSave = async (newValue: any) => {
    setLoading(true);
    setValue(newValue);
    try {
      if (field.scope === 'client') {
        localStorage.setItem(field.key, newValue);
        emitClientConfigChanged();
      } else {
        await grab('config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: `${dataAdd}.${field.key}`, value: newValue }),
        });
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration.');
    } finally {
      setTimeout(() => setLoading(false), 150);
    }
  };

  return (
    <section
      id={fieldAnchorId(dataAdd, field.key)}
      className="scroll-mt-4 rounded-xl border border-light-200 bg-light-primary/80 p-4 lg:p-6 transition-colors dark:border-dark-200 dark:bg-dark-primary/80"
    >
      <div className="space-y-3 lg:space-y-5">
        <div>
          <h4 className="text-sm lg:text-sm text-black dark:text-white">
            <AnchorTitle anchorId={fieldAnchorId(dataAdd, field.key)}>
              {field.name}
            </AnchorTitle>
          </h4>
          <p className="text-[11px] lg:text-xs text-black/50 dark:text-white/50">
            {field.description}
          </p>
          <FieldLinks links={field.links} />
        </div>
        <div className="relative">
          <input
            value={value ?? field.default ?? ''}
            onChange={(event) => setValue(event.target.value)}
            onBlur={(event) => handleSave(event.target.value)}
            className="w-full rounded-lg border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary px-3 py-2 lg:px-4 lg:py-3 pr-16 !text-xs lg:!text-[13px] text-black/80 dark:text-white/80 placeholder:text-black/40 dark:placeholder:text-white/40 focus-visible:outline-none focus-visible:border-light-300 dark:focus-visible:border-dark-300 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            placeholder={field.placeholder}
            type={showPassword ? 'text' : 'password'}
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-black/40 hover:text-black/70 dark:text-white/40 dark:hover:text-white/70 transition-colors"
            title={showPassword ? 'Hide' : 'Show'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          {loading && (
            <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40">
              <Loader2 className="h-4 w-4 animate-spin" />
            </span>
          )}
        </div>
      </div>
    </section>
  );
};

const SettingsTextarea = ({
  field,
  value,
  setValue,
  dataAdd,
}: {
  field: TextareaUIConfigField;
  value?: any;
  setValue: (value: any) => void;
  dataAdd: string;
}) => {
  const [loading, setLoading] = useState(false);

  const handleSave = async (newValue: any) => {
    setLoading(true);
    setValue(newValue);
    try {
      if (field.scope === 'client') {
        localStorage.setItem(field.key, newValue);
        emitClientConfigChanged();
      } else {
        await grab('config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: `${dataAdd}.${field.key}`,
            value: newValue,
          }),
        });
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration.');
    } finally {
      setTimeout(() => setLoading(false), 150);
    }
  };

  return (
    <section
      id={fieldAnchorId(dataAdd, field.key)}
      className="scroll-mt-4 rounded-xl border border-light-200 bg-light-primary/80 p-4 lg:p-6 transition-colors dark:border-dark-200 dark:bg-dark-primary/80"
    >
      <div className="space-y-3 lg:space-y-5">
        <div>
          <h4 className="text-sm lg:text-sm text-black dark:text-white">
            <AnchorTitle anchorId={fieldAnchorId(dataAdd, field.key)}>
              {field.name}
            </AnchorTitle>
          </h4>
          <p className="text-[11px] lg:text-xs text-black/50 dark:text-white/50">
            {field.description}
          </p>
          <FieldLinks links={field.links} />
        </div>
        <div className="relative">
          <textarea
            value={value ?? field.default ?? ''}
            onChange={(event) => setValue(event.target.value)}
            onBlur={(event) => handleSave(event.target.value)}
            className="w-full rounded-lg border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary px-3 py-2 lg:px-4 lg:py-3 pr-10 !text-xs lg:!text-[13px] text-black/80 dark:text-white/80 placeholder:text-black/40 dark:placeholder:text-white/40 focus-visible:outline-none focus-visible:border-light-300 dark:focus-visible:border-dark-300 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            placeholder={field.placeholder}
            rows={4}
            disabled={loading}
          />
          {loading && (
            <span className="pointer-events-none absolute right-3 translate-y-3 text-black/40 dark:text-white/40">
              <Loader2 className="h-4 w-4 animate-spin" />
            </span>
          )}
        </div>
      </div>
    </section>
  );
};

const SettingsSwitch = ({
  field,
  value,
  setValue,
  dataAdd,
}: {
  field: SwitchUIConfigField;
  value?: any;
  setValue: (value: any) => void;
  dataAdd: string;
}) => {
  const [loading, setLoading] = useState(false);

  const handleSave = async (newValue: boolean) => {
    setLoading(true);
    setValue(newValue);
    try {
      if (field.scope === 'client') {
        localStorage.setItem(field.key, String(newValue));
        emitClientConfigChanged();
      } else {
        await grab('config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: `${dataAdd}.${field.key}`,
            value: newValue,
          }),
        });
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration.');
    } finally {
      setTimeout(() => setLoading(false), 150);
    }
  };

  const isChecked = value === true || value === 'true';

  return (
    <section
      id={fieldAnchorId(dataAdd, field.key)}
      className="scroll-mt-4 rounded-xl border border-light-200 bg-light-primary/80 p-4 lg:p-6 transition-colors dark:border-dark-200 dark:bg-dark-primary/80"
    >
      <div className="flex flex-row items-center space-x-3 lg:space-x-5 w-full justify-between">
        <div>
          <h4 className="text-sm lg:text-sm text-black dark:text-white">
            <AnchorTitle anchorId={fieldAnchorId(dataAdd, field.key)}>
              {field.name}
            </AnchorTitle>
          </h4>
          <p className="text-[11px] lg:text-xs text-black/50 dark:text-white/50">
            {field.description}
          </p>
          <FieldLinks links={field.links} />
        </div>
        <Switch
          checked={isChecked}
          onCheckedChange={handleSave}
          disabled={loading}
          className="h-6 w-12"
        />
      </div>
    </section>
  );
};

const SettingsThemeSelect = ({
  field,
  setValue,
  dataAdd,
}: {
  field: ThemeUIConfigField;
  value?: any;
  setValue: (value: any) => void;
  dataAdd: string;
}) => {
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
    setValue(newTheme);
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
      id={fieldAnchorId(dataAdd, field.key)}
      className="scroll-mt-4 rounded-xl border border-light-200 bg-light-primary/80 p-4 lg:p-6 transition-colors dark:border-dark-200 dark:bg-dark-primary/80"
    >
      <div className="space-y-3 lg:space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm text-black dark:text-white">
              <AnchorTitle anchorId={fieldAnchorId(dataAdd, field.key)}>
                {field.name}
              </AnchorTitle>
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

const SettingsField = ({
  field,
  value,
  dataAdd,
}: {
  field: UIConfigField;
  value: any;
  dataAdd: string;
}) => {
  const [val, setVal] = useState(value);

  switch (field.type) {
    case 'theme':
      return (
        <SettingsThemeSelect
          field={field}
          value={val}
          setValue={setVal}
          dataAdd={dataAdd}
        />
      );
    case 'select':
      return (
        <SettingsSelect
          field={field}
          value={val}
          setValue={setVal}
          dataAdd={dataAdd}
        />
      );
    case 'string':
      return (
        <SettingsInput
          field={field}
          value={val}
          setValue={setVal}
          dataAdd={dataAdd}
        />
      );
    case 'password':
      return (
        <SettingsPasswordInput
          field={field}
          value={val}
          setValue={setVal}
          dataAdd={dataAdd}
        />
      );
    case 'textarea':
      return (
        <SettingsTextarea
          field={field}
          value={val}
          setValue={setVal}
          dataAdd={dataAdd}
        />
      );
    case 'switch':
      return (
        <SettingsSwitch
          field={field}
          value={val}
          setValue={setVal}
          dataAdd={dataAdd}
        />
      );
    default:
      return <div>Unsupported field type: {field.type}</div>;
  }
};

export default SettingsField;
