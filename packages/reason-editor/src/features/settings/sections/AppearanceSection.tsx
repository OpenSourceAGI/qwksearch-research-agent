/**
 * @module AppearanceSection
 * @description Settings panel for theme (light/dark/system) and default
 * sidebar view mode. Rendered as one tab inside the Settings dialog.
 */
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Label } from '../../../app-ui/label';
import { RadioGroup, RadioGroupItem } from '../../../app-ui/radio-group';
import { Separator } from '../../../app-ui/separator';
import { ThemeDropdown } from '../../../app-theme/theme-dropdown';

interface AppearanceSectionProps {
  defaultSidebarView: 'tree' | 'outline' | 'split' | 'last-used';
  onDefaultSidebarViewChange?: (view: 'tree' | 'outline' | 'split' | 'last-used') => void;
}

const themes = [
  { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" />, description: 'Clean and bright interface' },
  { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" />, description: 'Easy on the eyes in low light' },
  { value: 'system', label: 'System', icon: <Monitor className="h-4 w-4" />, description: 'Sync with your system preferences' },
];

export const AppearanceSection = ({ defaultSidebarView, onDefaultSidebarViewChange }: AppearanceSectionProps) => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Appearance</h2>
        <p className="text-sm text-muted-foreground">Choose how REASON looks to you</p>
      </div>

      <Separator />

      <div className="space-y-4">
        <Label className="text-base">Theme</Label>
        <RadioGroup value={theme} onValueChange={setTheme} className="space-y-3">
          {themes.map((t) => (
            <div key={t.value} className="flex items-start space-x-3">
              <RadioGroupItem value={t.value} id={t.value} className="mt-1" />
              <label htmlFor={t.value} className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-muted-foreground">{t.icon}</div>
                  <span className="font-medium">{t.label}</span>
                </div>
                <p className="text-sm text-muted-foreground">{t.description}</p>
              </label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-4">
        <Label className="text-base">Color Theme</Label>
        <p className="text-sm text-muted-foreground mb-2">Choose from various color themes to customize your interface</p>
        <div className="flex items-center">
          <ThemeDropdown />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <Label className="text-base">Default Sidebar View</Label>
        <p className="text-sm text-muted-foreground mb-2">Choose the default view when opening the application</p>
        <RadioGroup
          value={defaultSidebarView}
          onValueChange={(v) => onDefaultSidebarViewChange?.(v as 'tree' | 'outline' | 'split' | 'last-used')}
          className="space-y-3"
        >
          {[
            { value: 'tree', label: 'Documents Tree', desc: 'Show only the document tree' },
            { value: 'outline', label: 'Outline Only', desc: 'Show only the headings outline' },
            { value: 'split', label: 'Split View', desc: 'Show both tree and outline side by side' },
            { value: 'last-used', label: 'Remember Last Used', desc: 'Use the view you had open last time' },
          ].map((opt) => (
            <div key={opt.value} className="flex items-start space-x-3">
              <RadioGroupItem value={opt.value} id={opt.value} className="mt-1" />
              <label htmlFor={opt.value} className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{opt.label}</span>
                </div>
                <p className="text-sm text-muted-foreground">{opt.desc}</p>
              </label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
};
