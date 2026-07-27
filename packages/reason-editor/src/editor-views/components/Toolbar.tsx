/**
 * Full formatting toolbar for the example editor, wiring each extension's RichText control together. Provides the top row of editing actions users interact with.
 */

import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useCurrentEditor } from '@tiptap/react';
import { ToolbarMenuItem } from '@/components';
import { localeActions, useLocale } from 'react-reason-editor/locale-bundle';
import { themeActions, type ThemeColorType } from 'react-reason-editor/theme';
import { RichTextUndo, RichTextRedo } from 'react-reason-editor/history';
import { RichTextHeading } from 'react-reason-editor/heading';
import { RichTextOrderedList } from 'react-reason-editor/orderedlist';
import { RichTextBulletList } from 'react-reason-editor/bulletlist';
import { RichTextTaskList } from 'react-reason-editor/tasklist';
import { RichTextBlockquote } from 'react-reason-editor/blockquote';
import { RichTextCodeBlock } from 'react-reason-editor/codeblock';
import { RichTextClear } from 'react-reason-editor/clear';
import { RichTextFontFamily } from 'react-reason-editor/fontfamily';
import { RichTextFontSize } from 'react-reason-editor/fontsize';
import { RichTextBold } from 'react-reason-editor/bold';
import { RichTextItalic } from 'react-reason-editor/italic';
import { RichTextUnderline } from 'react-reason-editor/textunderline';
import { RichTextHighlight } from 'react-reason-editor/highlight';
import { RichTextColor } from 'react-reason-editor/color';
import { RichTextStrike } from 'react-reason-editor/strike';
import { RichTextCode } from 'react-reason-editor/code';
import { RichTextSubscript } from '@/extensions/Subscript/components/RichTextSubscript';
import { RichTextSuperscript } from '@/extensions/Superscript/components/RichTextSuperscript';
import { RichTextIndent } from 'react-reason-editor/indent';
import { RichTextAlign } from 'react-reason-editor/textalign';
import { RichTextLineHeight } from 'react-reason-editor/lineheight';
import { RichTextEmoji } from 'react-reason-editor/emoji';
import { RichTextLink } from 'react-reason-editor/link';
import { RichTextAttachment } from 'react-reason-editor/attachment';
import { RichTextImage } from 'react-reason-editor/image';
import { RichTextHorizontalRule } from 'react-reason-editor/horizontalrule';
import { RichTextImageGif } from 'react-reason-editor/imagegif';
import { RichTextTable } from 'react-reason-editor/table';
import { RichTextColumn } from 'react-reason-editor/column';
import { RichTextCallout } from 'react-reason-editor/callout';
import { RichTextDrawer } from 'react-reason-editor/drawer';
import { RichTextTwitter } from 'react-reason-editor/twitter';
import { RichTextVideo } from 'react-reason-editor/video';
import { RichTextKatex } from 'react-reason-editor/katex';
import { RichTextMermaid } from 'react-reason-editor/mermaid';
import { RichTextSearchAndReplace } from 'react-reason-editor/searchandreplace';
import { RichTextWordCount } from 'react-reason-editor/wordcount';
import { RichTextCodeView } from 'react-reason-editor/codeview';
import { RichTextImportWord } from 'react-reason-editor/importword';
import { RichTextExportWord } from 'react-reason-editor/exportword';
import { RichTextExportPdf } from 'react-reason-editor/exportpdf';
import { RichTextZoom } from '@/extensions/Zoom/components/RichTextZoom';
import { RichTextPagination } from '@/extensions/Pagination/components/RichTextPagination';
import { RichTextTableOfContentsPanel } from '@/extensions/TableOfContents';
import { RichTextHarper } from '@/extensions/Harper';
import {
  Check,
  SpellCheck,
  Plus,
  Trash2,
  Paintbrush,
  X,
  Settings,
  ChevronDown,
  Subscript,
  Superscript,
  Clipboard,
  Scissors,
  ClipboardPaste,
  ClipboardType,
  ListTree,
  File,
  Download,
  Share2,
  Copy,
  Edit3,
  Eye,
  Lock,
  Globe,
  Mail,
  Users,
  MoreVertical,
  MessageSquare,
} from 'lucide-react';

interface ToolbarProps {
  theme: string;
  setTheme: (theme: string) => void;
  /**
   * When provided, the Settings button opens the config modal owned by the
   * parent (language, theme, and the plugin manager) instead of the legacy
   * quick dropdown. The modal lives outside the editor provider so it survives
   * the editor being rebuilt when a plugin is toggled.
   */
  onOpenSettings?: () => void;
}

interface CssRule {
  id: number;
  selector: string;
  property: string;
  value: string;
}

interface StylePreset {
  id: string;
  name: string;
  rules: CssRule[];
  active: boolean;
}

const STYLE_TAG_ID = 'rte-custom-styles';
const STYLES_STORAGE_KEY = 'rte-custom-style-presets';
const ACTIVE_STYLE_KEY = 'rte-active-style-preset';

// ─── CSS Editor Modal ─────────────────────────────────────────────────────────

function CssEditorModal({ onClose }: { onClose: () => void }) {
  const [presets, setPresets] = useState<StylePreset[]>(() => {
    try {
      const saved = localStorage.getItem(STYLES_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
      return [{
        id: '1',
        name: 'Default',
        rules: [
          { id: 1, selector: '.ProseMirror p', property: 'font-size', value: '16px' },
          { id: 2, selector: '.ProseMirror h1', property: 'color', value: '#111827' },
        ],
        active: true,
      }];
    } catch {
      return [];
    }
  });

  const [currentPresetId, setCurrentPresetId] = useState<string>(() => {
    try {
      return localStorage.getItem(ACTIVE_STYLE_KEY) || presets[0]?.id || '1';
    } catch {
      return '1';
    }
  });

  const [editingName, setEditingName] = useState<string | null>(null);
  const [newPresetName, setNewPresetName] = useState('');
  const currentPreset = presets.find(p => p.id === currentPresetId) || presets[0];
  const [rules, setRules] = useState<CssRule[]>(currentPreset?.rules || []);
  const nextId = useRef(rules.length ? Math.max(...rules.map(r => r.id), 0) + 1 : 1);

  const applyStyles = (currentRules: CssRule[]) => {
    let tag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
    if (!tag) {
      tag = document.createElement('style');
      tag.id = STYLE_TAG_ID;
      document.head.appendChild(tag);
    }
    tag.textContent = currentRules
      .filter(r => r.selector && r.property && r.value)
      .map(r => `${r.selector} { ${r.property}: ${r.value}; }`)
      .join('\n');
  };

  const switchPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setCurrentPresetId(presetId);
      setRules([...preset.rules]);
      applyStyles(preset.rules);
      localStorage.setItem(ACTIVE_STYLE_KEY, presetId);
    }
  };

  const saveCurrentPreset = () => {
    const updated = presets.map(p =>
      p.id === currentPresetId ? { ...p, rules: [...rules] } : p
    );
    setPresets(updated);
    localStorage.setItem(STYLES_STORAGE_KEY, JSON.stringify(updated));
    applyStyles(rules);
  };

  const addNewPreset = () => {
    if (presets.length >= 10) {
      alert('Maximum 10 style presets allowed');
      return;
    }
    if (!newPresetName.trim()) {
      alert('Please enter a name for the preset');
      return;
    }
    const newId = Math.max(...presets.map(p => parseInt(p.id)), 0) + 1;
    const newPreset: StylePreset = {
      id: String(newId),
      name: newPresetName,
      rules: [
        { id: 1, selector: '.ProseMirror p', property: 'font-size', value: '16px' },
      ],
      active: false,
    };
    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem(STYLES_STORAGE_KEY, JSON.stringify(updated));
    setNewPresetName('');
    switchPreset(newPreset.id);
  };

  const renamePreset = (id: string, newName: string) => {
    if (!newName.trim()) return;
    const updated = presets.map(p => p.id === id ? { ...p, name: newName } : p);
    setPresets(updated);
    localStorage.setItem(STYLES_STORAGE_KEY, JSON.stringify(updated));
    setEditingName(null);
  };

  const deletePreset = (id: string) => {
    if (presets.length <= 1) {
      alert('Cannot delete the last preset');
      return;
    }
    if (!confirm('Are you sure you want to delete this preset?')) return;
    const remaining = presets.filter(p => p.id !== id);
    setPresets(remaining);
    localStorage.setItem(STYLES_STORAGE_KEY, JSON.stringify(remaining));
    if (currentPresetId === id) {
      switchPreset(remaining[0].id);
    }
  };

  const addRule = () => {
    const newRule: CssRule = { id: nextId.current++, selector: '', property: '', value: '' };
    setRules(prev => [...prev, newRule]);
  };

  const removeRule = (id: number) => setRules(prev => prev.filter(r => r.id !== id));

  const updateRule = (id: number, field: keyof Omit<CssRule, 'id'>, val: string) =>
    setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl w-[640px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Paintbrush size={16} className="text-blue-500" />
            <span className="text-sm font-semibold">Customize Editor Styles</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800">
            <X size={14} />
          </button>
        </div>

        {/* Preset selector */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 space-y-2">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Style Presets</div>
          <div className="flex gap-2 flex-wrap">
            {presets.map(preset => (
              <div key={preset.id} className="flex items-center gap-1">
                <button
                  onClick={() => switchPreset(preset.id)}
                  className={`px-3 py-1.5 text-xs rounded transition-colors ${
                    currentPresetId === preset.id
                      ? 'bg-blue-500 text-white border-blue-600'
                      : 'border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {editingName === preset.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={newPresetName}
                      onChange={e => setNewPresetName(e.target.value)}
                      onBlur={() => renamePreset(preset.id, newPresetName)}
                      onKeyDown={e => e.key === 'Enter' && renamePreset(preset.id, newPresetName)}
                      className="w-20 px-1 py-0.5 text-xs bg-transparent border-b border-current outline-none"
                    />
                  ) : (
                    <span onDoubleClick={() => { setEditingName(preset.id); setNewPresetName(preset.name); }}>
                      {preset.name}
                    </span>
                  )}
                </button>
                {presets.length > 1 && (
                  <button
                    onClick={() => deletePreset(preset.id)}
                    className="p-0.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {presets.length < 10 && (
            <div className="flex gap-2 pt-2">
              <input
                type="text"
                value={newPresetName}
                onChange={e => setNewPresetName(e.target.value)}
                placeholder="New preset name..."
                onKeyDown={e => e.key === 'Enter' && addNewPreset()}
                className="flex-1 px-2 py-1.5 text-xs border rounded bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
              />
              <button
                onClick={addNewPreset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Plus size={12} />
                Add
              </button>
            </div>
          )}
        </div>

        <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-700">
          CSS rules applied live to the editor. Target <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded">.ProseMirror</code> elements.
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {rules.length === 0 && (
            <div className="text-center text-xs text-gray-400 py-6">No rules yet. Click + Add Rule to begin.</div>
          )}
          {rules.map(rule => (
            <div key={rule.id} className="flex items-center gap-2 group">
              <input
                className="flex-1 min-w-0 px-2 py-1.5 text-xs border rounded bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 font-mono"
                placeholder=".ProseMirror p"
                value={rule.selector}
                onChange={e => updateRule(rule.id, 'selector', e.target.value)}
              />
              <input
                className="w-32 px-2 py-1.5 text-xs border rounded bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 font-mono"
                placeholder="font-size"
                value={rule.property}
                onChange={e => updateRule(rule.id, 'property', e.target.value)}
              />
              <input
                className="w-28 px-2 py-1.5 text-xs border rounded bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 font-mono"
                placeholder="16px"
                value={rule.value}
                onChange={e => updateRule(rule.id, 'value', e.target.value)}
              />
              <button
                onClick={() => removeRule(rule.id)}
                className="p-1 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <button
            onClick={addRule}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            <Plus size={12} />
            Add Rule
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50 dark:hover:bg-slate-800">
              Cancel
            </button>
            <button
              onClick={saveCurrentPreset}
              className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save Style
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Shared dropdown list item ────────────────────────────────────────────────

function MenuRow({
  icon,
  label,
  shortcut,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  shortcut?: string;
  children: React.ReactNode;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, [role="button"], a, select')) return;
    const btn = rowRef.current?.querySelector('button');
    btn?.click();
  };

  return (
    <div
      ref={rowRef}
      onClick={handleClick}
      className="flex items-center gap-3 px-3 py-1.5 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group"
    >
      {icon && (
        <span className="w-5 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0">
          {icon}
        </span>
      )}
      <span className="flex-1 text-sm text-gray-700 dark:text-gray-200">{label}</span>
      {shortcut && (
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-4 whitespace-nowrap">{shortcut}</span>
      )}
      {/* hidden child — keeps the actual interactive control mounted for click delegation */}
      <span className="sr-only">{children}</span>
      <span className="absolute opacity-0 pointer-events-none">{children}</span>
    </div>
  );
}

// ─── Invisible wrapper that mounts a rich-text control but delegates clicks ──

function HiddenControl({ children, label, shortcut, icon, displayIcon }: {
  children: React.ReactNode;
  label: string;
  shortcut?: string;
  icon?: React.ReactNode;
  displayIcon?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, [role="button"], a, select')) return;
    const btn = ref.current?.querySelector('button, [role="button"]') as HTMLElement | null;
    btn?.click();
  };

  return (
    <div
      ref={ref}
      onClick={handleClick}
      className="relative flex items-center gap-3 px-3 py-1.5 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
    >
      {(icon || displayIcon) && (
        <span className="w-5 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0 text-sm font-mono">
          {displayIcon || icon}
        </span>
      )}
      <span className="flex-1 text-sm text-gray-700 dark:text-gray-200">{label}</span>
      {shortcut && (
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-4 whitespace-nowrap">{shortcut}</span>
      )}
      {/* actual control — visually hidden but interactive */}
      <span className="absolute inset-0 opacity-0 pointer-events-none" aria-hidden>
        {children}
      </span>
      {/* visible duplicate for click */}
      <span className="hidden">{children}</span>
    </div>
  );
}

// ─── Plain action row (onClick handler, no rich-text control) ────────────────

function MenuAction({
  icon,
  label,
  shortcut,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-3 py-1.5 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
    >
      {icon && (
        <span className="w-5 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0">
          {icon}
        </span>
      )}
      <span className="flex-1 text-left text-sm text-gray-700 dark:text-gray-200">{label}</span>
      {shortcut && (
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-4 whitespace-nowrap">{shortcut}</span>
      )}
    </button>
  );
}

// ─── Checkbox toggle row (stays open on click so the check state is visible) ──

function MenuToggle({
  icon,
  label,
  checked,
  onChange,
}: {
  icon?: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 w-full px-3 py-1.5 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
    >
      {icon && (
        <span className="w-5 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0">
          {icon}
        </span>
      )}
      <span className="flex-1 text-left text-sm text-gray-700 dark:text-gray-200">{label}</span>
      <span
        className={`flex h-4 w-4 items-center justify-center rounded border shrink-0 transition-colors ${
          checked
            ? 'bg-blue-500 border-blue-500 text-white'
            : 'border-gray-300 dark:border-slate-600'
        }`}
      >
        {checked && <Check size={12} strokeWidth={3} />}
      </span>
    </button>
  );
}

// ─── Toolbar icon button that opens a dropdown ────────────────────────────────

function ToolbarIconBtn({
  children,
  label,
  name,
  active,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  name: string;
  active: boolean;
  onClick: (name: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      title={label}
      onClick={e => onClick(name, e)}
      className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-sm font-medium transition-colors ${
        active
          ? 'bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
      }`}
    >
      {children}
      <ChevronDown size={10} className="opacity-40 mt-0.5" />
    </button>
  );
}

// ─── Dropdown panel shell ─────────────────────────────────────────────────────

const panelCls =
  'fixed bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-gray-200/60 dark:border-slate-700/60 rounded-lg shadow-xl py-1 z-50 min-w-[220px] dropdown-portal';

// ─── File sharing modal ───────────────────────────────────────────────────────

interface SharedUser {
  email: string;
  role: 'viewer' | 'commentor' | 'editor';
  sharedAt: string;
  name?: string;
}

interface SharingState {
  isPublic: boolean;
  sharedWith: SharedUser[];
  shareLink: string | null;
}

function FileShareModal({ onClose, documentTitle }: { onClose: () => void; documentTitle: string }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'commentor' | 'editor'>('viewer');
  const [sharing, setSharing] = useState<SharingState>({
    isPublic: false,
    sharedWith: [
      { email: 'alice@example.com', role: 'editor', sharedAt: new Date().toISOString(), name: 'Alice' },
      { email: 'bob@example.com', role: 'viewer', sharedAt: new Date().toISOString(), name: 'Bob' },
    ],
    shareLink: null,
  });

  const handleInvite = () => {
    if (!email.trim()) return;
    if (sharing.sharedWith.find(u => u.email === email)) {
      alert('Already shared with this email');
      return;
    }
    setSharing(prev => ({
      ...prev,
      sharedWith: [...prev.sharedWith, { email, role, sharedAt: new Date().toISOString() }]
    }));
    setEmail('');
  };

  const handleRemove = (emailToRemove: string) => {
    setSharing(prev => ({
      ...prev,
      sharedWith: prev.sharedWith.filter(u => u.email !== emailToRemove)
    }));
  };

  const handleUpdateRole = (emailToUpdate: string, newRole: 'viewer' | 'commentor' | 'editor') => {
    setSharing(prev => ({
      ...prev,
      sharedWith: prev.sharedWith.map(u => u.email === emailToUpdate ? { ...u, role: newRole } : u)
    }));
  };

  const handleTogglePublic = () => {
    setSharing(prev => ({
      ...prev,
      isPublic: !prev.isPublic,
      shareLink: !prev.isPublic ? `https://docs.example.com/share/${Math.random().toString(36).slice(2, 9)}` : null
    }));
  };

  const handleCopyLink = () => {
    if (sharing.shareLink) {
      navigator.clipboard.writeText(sharing.shareLink);
      alert('Link copied to clipboard');
    }
  };

  const getRoleIcon = (r: string) => {
    switch (r) {
      case 'editor': return <Edit3 size={14} />;
      case 'commentor': return <MessageSquare size={14} />;
      case 'viewer': return <Eye size={14} />;
      default: return null;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl w-[600px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Share2 size={18} className="text-blue-500" />
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Share "{documentTitle}"</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage who can access this document</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Public access toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              {sharing.isPublic ? (
                <Globe size={18} className="text-blue-500" />
              ) : (
                <Lock size={18} className="text-gray-400" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {sharing.isPublic ? 'Public' : 'Private'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {sharing.isPublic ? 'Anyone with link can view' : 'Only invited people can access'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {sharing.isPublic && sharing.shareLink && (
                <button
                  onClick={handleCopyLink}
                  className="px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Copy link
                </button>
              )}
              <button
                onClick={handleTogglePublic}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${sharing.isPublic ? 'bg-blue-500' : 'bg-gray-300 dark:bg-slate-700'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${sharing.isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {/* Add collaborator */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Add people</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500"
                />
              </div>
              <select
                value={role}
                onChange={e => setRole(e.target.value as 'viewer' | 'commentor' | 'editor')}
                className="px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              >
                <option value="viewer">Viewer</option>
                <option value="commentor">Commentor</option>
                <option value="editor">Editor</option>
              </select>
              <button
                onClick={handleInvite}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Share
              </button>
            </div>
          </div>

          {/* People list */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">People with access</h3>
            <div className="space-y-1 max-h-[280px] overflow-y-auto">
              {sharing.sharedWith.length > 0 ? (
                sharing.sharedWith.map(user => (
                  <div key={user.email} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white text-xs font-medium">
                        {user.email.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Added {new Date(user.sharedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={user.role}
                        onChange={e => handleUpdateRole(user.email, e.target.value as 'viewer' | 'commentor' | 'editor')}
                        className="px-2 py-1 text-xs border border-gray-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="commentor">Commentor</option>
                        <option value="editor">Editor</option>
                      </select>
                      <button
                        onClick={() => handleRemove(user.email)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Users size={24} className="mx-auto text-gray-300 mb-2 opacity-50" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No one else has access yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── File rename modal ─────────────────────────────────────────────────────────

function FileRenameModal({ onClose, currentName }: { onClose: () => void; currentName: string }) {
  const [newName, setNewName] = useState(currentName);

  const handleRename = () => {
    if (newName.trim() && newName !== currentName) {
      alert(`File renamed to: ${newName}`);
    }
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl w-[400px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Rename document</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRename()}
            autoFocus
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex gap-2 px-6 py-4 border-t border-gray-100 dark:border-slate-700 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button onClick={handleRename} className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Rename
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── File info modal ───────────────────────────────────────────────────────────

function FileInfoModal({ onClose, documentTitle }: { onClose: () => void; documentTitle: string }) {
  const createdDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
  const modifiedDate = new Date();
  const wordCount = Math.floor(Math.random() * 5000) + 100;
  const charCount = Math.floor(Math.random() * 30000) + 1000;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl w-[450px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Document info</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Document Name</p>
            <p className="text-sm text-gray-900 dark:text-white break-words">{documentTitle}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Created</p>
              <p className="text-sm text-gray-900 dark:text-white">{createdDate.toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Last Modified</p>
              <p className="text-sm text-gray-900 dark:text-white">{modifiedDate.toLocaleDateString()}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Words</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{wordCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Characters</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{charCount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main toolbar ─────────────────────────────────────────────────────────────

export const RichTextToolbar = ({ theme, setTheme, onOpenSettings }: ToolbarProps) => {
  const [open, setOpen] = useState<string | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; right?: number } | null>(null);
  const [showCss, setShowCss] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [harperOn, setHarperOn] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // When an open-settings handler is supplied the Settings button opens the
  // parent-owned config modal; otherwise it falls back to the quick dropdown.
  const configDriven = !!onOpenSettings;
  const settingsBtnRef = useRef<HTMLButtonElement | null>(null);
  const currentLocale = useLocale();
  const { editor } = useCurrentEditor();
  const documentTitle = 'Untitled Document';

  // Harper (spelling & grammar) is optional — only surface its toggle when the
  // extension is actually registered on the current editor.
  const hasHarper = !!editor?.extensionManager.extensions.some(
    (e) => e.name === 'harper',
  );

  // Drive proofing from the toggle: run the linter when enabled, clear the
  // decorations when disabled.
  useEffect(() => {
    if (!editor || !hasHarper) return;
    if (harperOn) {
      editor.chain().focus().runProofing().run();
    } else {
      editor.commands.clearProofing();
    }
  }, [harperOn, editor, hasHarper]);

  // Page layout: only surface the Web ↔ A4 switch when the Pagination
  // extension is registered on the current editor.
  const hasPagination = !!editor?.extensionManager.extensions.some(
    (e) => e.name === 'PaginationPlus',
  );

  // Track whether the editor is showing the paginated (A4) layout. Seed from
  // the extension's own storage so the toggle reflects the real state.
  const [paginated, setPaginated] = useState(true);
  useEffect(() => {
    if (!editor || !hasPagination) return;
    const enabled = (editor.storage as any)?.PaginationPlus?.enabled;
    if (typeof enabled === 'boolean') setPaginated(enabled);
  }, [editor, hasPagination]);

  // Switch between the continuous web layout and the paginated A4 page view
  // via the Pagination extension's enable/disable commands.
  const handleTogglePageLayout = useCallback(
    (next: boolean) => {
      if (!editor) return;
      if (next) {
        (editor.commands as any).enablePagination?.();
      } else {
        (editor.commands as any).disablePagination?.();
      }
      setPaginated(next);
    },
    [editor],
  );

  // ─── Clipboard actions (mirror the right-click context menu) ────────────────
  const handleCut = useCallback(() => {
    editor?.chain().focus().run();
    document.execCommand('cut');
  }, [editor]);

  const handleCopy = useCallback(() => {
    editor?.chain().focus().run();
    document.execCommand('copy');
  }, [editor]);

  const handlePaste = useCallback(async () => {
    editor?.chain().focus().run();
    try {
      const text = await navigator.clipboard.readText();
      editor?.commands.insertContent(text);
    } catch {
      document.execCommand('paste');
    }
  }, [editor]);

  const handlePastePlain = useCallback(async () => {
    editor?.chain().focus().run();
    try {
      const text = await navigator.clipboard.readText();
      editor?.chain().focus().insertContent(text, { parseOptions: { preserveWhitespace: true } }).run();
    } catch {
      document.execCommand('paste');
    }
  }, [editor]);

  const handleDelete = useCallback(() => {
    editor?.commands.deleteSelection();
  }, [editor]);

  // Re-apply saved CSS on mount
  useEffect(() => {
    try {
      const activePresetId = localStorage.getItem(ACTIVE_STYLE_KEY);
      const savedPresets: StylePreset[] = JSON.parse(localStorage.getItem(STYLES_STORAGE_KEY) || '[]');

      if (savedPresets.length > 0) {
        const presetToApply = savedPresets.find(p => p.id === activePresetId) || savedPresets[0];
        if (presetToApply && presetToApply.rules.length > 0) {
          let tag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
          if (!tag) {
            tag = document.createElement('style');
            tag.id = STYLE_TAG_ID;
            document.head.appendChild(tag);
          }
          tag.textContent = presetToApply.rules
            .filter(r => r.selector && r.property && r.value)
            .map(r => `${r.selector} { ${r.property}: ${r.value}; }`)
            .join('\n');
        }
      }
    } catch {}
  }, []);

  const openMenu = (name: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (open === name) { setOpen(null); setPos(null); return; }
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left });
    setOpen(name);
  };

  const openMenuRight = (name: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (open === name) { setOpen(null); setPos(null); return; }
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, right: window.innerWidth - r.right });
    setOpen(name);
  };

  const close = () => { setOpen(null); setPos(null); };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (
        open &&
        !t.closest('.dropdown-container') &&
        !t.closest('.dropdown-portal') &&
        !t.closest('[data-radix-popper-content-wrapper]') &&
        !t.closest('[data-radix-portal]')
      ) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const panelStyle = (rightAligned?: boolean) =>
    rightAligned && pos?.right != null
      ? { top: `${pos!.top}px`, right: `${pos!.right}px` }
      : { top: `${pos!.top}px`, left: `${pos!.left}px` };

  return (
    <>
      <div className="flex items-center gap-0.5 border-b border-gray-200 dark:border-slate-700 px-2 py-1 flex-wrap">

        {/* File menu */}
        <div className="dropdown-container">
          <ToolbarIconBtn name="file" label="File" active={open === 'file'} onClick={openMenu}>
            <File size={16} />
          </ToolbarIconBtn>
          {open === 'file' && pos && createPortal(
            <div className={panelCls} style={panelStyle()}>
              <div className="px-2 py-1 text-[10px] font-semibold uppercase text-gray-400 tracking-wide">File</div>
              <MenuAction
                icon={<Copy size={14} />}
                label="Make a copy"
                onClick={() => { close(); alert('Document copied to your drive'); }}
              />
              <MenuAction
                icon={<Download size={14} />}
                label="Download"
                onClick={() => { close(); alert('Downloading document...'); }}
              />
              <div className="my-1 border-t border-gray-100 dark:border-slate-700" />
              <MenuAction
                icon={<Edit3 size={14} />}
                label="Rename"
                onClick={() => { close(); setShowRename(true); }}
              />
              <MenuAction
                icon={<Share2 size={14} />}
                label="Share"
                onClick={() => { close(); setShowShare(true); }}
              />
              <div className="my-1 border-t border-gray-100 dark:border-slate-700" />
              <MenuAction
                icon={<MoreVertical size={14} />}
                label="Document info"
                onClick={() => { close(); setShowInfo(true); }}
              />
            </div>,
            document.body
          )}
        </div>

        {/* Undo / Redo */}
        <RichTextUndo />
        <RichTextRedo />

        {/* Zoom controls */}
        <div className="border-l border-gray-200 dark:border-slate-700 mx-0.5 px-0.5">
          <RichTextZoom />
        </div>

        {/* Edit — clipboard actions (Cut / Copy / Paste / Delete) */}
        <div className="dropdown-container">
          <ToolbarIconBtn name="edit" label="Edit" active={open === 'edit'} onClick={openMenu}>
            <Clipboard size={16} />
          </ToolbarIconBtn>
          {open === 'edit' && pos && createPortal(
            <div className={panelCls} style={panelStyle()}>
              <div className="px-2 py-1 text-[10px] font-semibold uppercase text-gray-400 tracking-wide">Edit</div>
              <MenuAction icon={<Scissors size={14} />} label="Cut" shortcut="Ctrl+X" onClick={() => { close(); handleCut(); }} />
              <MenuAction icon={<Clipboard size={14} />} label="Copy" shortcut="Ctrl+C" onClick={() => { close(); handleCopy(); }} />
              <MenuAction icon={<ClipboardPaste size={14} />} label="Paste" shortcut="Ctrl+V" onClick={() => { close(); handlePaste(); }} />
              <MenuAction icon={<ClipboardType size={14} />} label="Paste Plain" shortcut="Ctrl+Shift+V" onClick={() => { close(); handlePastePlain(); }} />
              <div className="my-1 border-t border-gray-100 dark:border-slate-700" />
              <MenuAction icon={<Trash2 size={14} />} label="Delete" shortcut="Del" onClick={() => { close(); handleDelete(); }} />
            </div>,
            document.body
          )}
        </div>


        {/* ≡ — Block format */}
        <div className="dropdown-container">
          <ToolbarIconBtn name="block" label="Block Format" active={open === 'block'} onClick={openMenu}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="2" y1="4" x2="14" y2="4" />
              <line x1="2" y1="8" x2="11" y2="8" />
              <line x1="2" y1="12" x2="8" y2="12" />
            </svg>
          </ToolbarIconBtn>
          {open === 'block' && pos && createPortal(
            <div className={`${panelCls} min-w-[400px]`} style={panelStyle()}>
              <div className="grid grid-cols-2 gap-0.5 px-1 py-1">
                <div><HiddenControl icon="H1" label="Heading 1"><RichTextHeading level={1} /></HiddenControl></div>
                <div><HiddenControl icon="H2" label="Heading 2"><RichTextHeading level={2} /></HiddenControl></div>
                <div><HiddenControl icon="H3" label="Heading 3"><RichTextHeading level={3} /></HiddenControl></div>
                <div><HiddenControl icon="H4" label="Heading 4"><RichTextHeading level={4} /></HiddenControl></div>
                <div><HiddenControl icon="H5" label="Heading 5"><RichTextHeading level={5} /></HiddenControl></div>
                <div><HiddenControl icon="H6" label="Heading 6"><RichTextHeading level={6} /></HiddenControl></div>
              </div>
              <div className="my-1 border-t border-gray-100 dark:border-slate-700" />
              <div className="grid grid-cols-2 gap-0.5 px-1">
                <div><ToolbarMenuItem label="Bullet List"><RichTextBulletList /></ToolbarMenuItem></div>
                <div><ToolbarMenuItem label="Ordered List"><RichTextOrderedList /></ToolbarMenuItem></div>
                <div><ToolbarMenuItem label="Check List"><RichTextTaskList /></ToolbarMenuItem></div>
              </div>
              <div className="my-1 border-t border-gray-100 dark:border-slate-700" />
              <div className="grid grid-cols-2 gap-0.5 px-1">
                <div><ToolbarMenuItem label="Blockquote"><RichTextBlockquote /></ToolbarMenuItem></div>
                <div><ToolbarMenuItem label="Code Block"><RichTextCodeBlock /></ToolbarMenuItem></div>
              </div>
              <div className="my-1 border-t border-gray-100 dark:border-slate-700" />
              <div className="px-1">
                <ToolbarMenuItem label="Clear Format"><RichTextClear /></ToolbarMenuItem>
              </div>
              <button
                onClick={() => { close(); setShowCss(true); }}
                className="flex items-center gap-3 w-full px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors"
              >
                <Paintbrush size={14} className="text-gray-400 shrink-0" />
                Customize default styles…
              </button>
            </div>,
            document.body
          )}
        </div>

        {/* Text styles — bold, italic, underline directly */}
        <RichTextBold />
        <RichTextItalic />
        <RichTextUnderline />
        <RichTextFontSize />
        <RichTextHighlight />

        {/* Text styles overflow */}
        <div className="dropdown-container">
          <ToolbarIconBtn name="textstyles" label="Text Styles" active={open === 'textstyles'} onClick={openMenu}>
            <span className="text-sm font-mono">Tt</span>
          </ToolbarIconBtn>
          {open === 'textstyles' && pos && createPortal(
            <div className={`${panelCls} min-w-[400px]`} style={panelStyle()}>
              <div className="px-2 py-1 text-[10px] font-semibold uppercase text-gray-400 tracking-wide">Text Styles</div>
              <div className="grid grid-cols-2 gap-0.5 px-1 py-1">
                <div><ToolbarMenuItem label="Font Family"><RichTextFontFamily /></ToolbarMenuItem></div>
                <div><ToolbarMenuItem label="Strikethrough"><RichTextStrike /></ToolbarMenuItem></div>
                <div><ToolbarMenuItem label="Inline Code"><RichTextCode /></ToolbarMenuItem></div>
                <div><ToolbarMenuItem label="Text Color"><RichTextColor /></ToolbarMenuItem></div>
                <div><ToolbarMenuItem label="Superscript" icon={<Superscript size={16} />}><RichTextSuperscript /></ToolbarMenuItem></div>
                <div><ToolbarMenuItem label="Subscript" icon={<Subscript size={16} />}><RichTextSubscript /></ToolbarMenuItem></div>
                <div><ToolbarMenuItem label="Indent"><RichTextIndent /></ToolbarMenuItem></div>
                <div><ToolbarMenuItem label="Line Spacing"><RichTextLineHeight /></ToolbarMenuItem></div>
                <div className="col-span-2"><ToolbarMenuItem label="Alignment"><RichTextAlign /></ToolbarMenuItem></div>
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* Insert */}
        <div className="dropdown-container">
          <ToolbarIconBtn name="insert" label="Insert" active={open === 'insert'} onClick={openMenu}>
            <Plus size={16} />
          </ToolbarIconBtn>
          {open === 'insert' && pos && createPortal(
            <div className={`${panelCls} min-w-[300px] max-h-[360px] overflow-y-auto`} style={panelStyle()}>
              <div className="px-2 py-1 text-[10px] font-semibold uppercase text-gray-400 tracking-wide">Insert</div>
              <div className="grid grid-cols-2 gap-0.5 px-1">
                <div><ToolbarMenuItem label="Link"><RichTextLink /></ToolbarMenuItem></div>
                <div><ToolbarMenuItem label="Emoji"><RichTextEmoji /></ToolbarMenuItem></div>
                <div><ToolbarMenuItem label="Table"><RichTextTable /></ToolbarMenuItem></div>
                <div><ToolbarMenuItem label="Image"><RichTextImage /></ToolbarMenuItem></div>
                <div><ToolbarMenuItem label="Meme"><RichTextImageGif /></ToolbarMenuItem></div>
                <div><ToolbarMenuItem label="Document"><RichTextAttachment /></ToolbarMenuItem></div>
                <div><ToolbarMenuItem label="Columns"><RichTextColumn /></ToolbarMenuItem></div>
                <div><ToolbarMenuItem label="Callout"><RichTextCallout /></ToolbarMenuItem></div>
                <div><ToolbarMenuItem label="Twitter"><RichTextTwitter /></ToolbarMenuItem></div>
                <div><ToolbarMenuItem label="Divider"><RichTextHorizontalRule /></ToolbarMenuItem></div>
                <div><ToolbarMenuItem label="Video"><RichTextVideo /></ToolbarMenuItem></div>
                <div><ToolbarMenuItem label="Math"><RichTextKatex /></ToolbarMenuItem></div>
                <div><ToolbarMenuItem label="Flowchart"><RichTextMermaid /></ToolbarMenuItem></div>
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* Tools */}
        <div className="dropdown-container">
          <ToolbarIconBtn name="tools" label="Tools" active={open === 'tools'} onClick={openMenu}>
            {/* wrench-like icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
            </svg>
          </ToolbarIconBtn>
          {open === 'tools' && pos && createPortal(
            <div className={panelCls} style={panelStyle()}>
              <div className="px-2 py-1 text-[10px] font-semibold uppercase text-gray-400 tracking-wide">Tools</div>
              <ToolbarMenuItem label="Find / Replace"><RichTextSearchAndReplace /></ToolbarMenuItem>
              <ToolbarMenuItem label="Word Count"><RichTextWordCount /></ToolbarMenuItem>
              <ToolbarMenuItem label="View Source"><RichTextCodeView /></ToolbarMenuItem>
              <div className="my-1 border-t border-gray-100 dark:border-slate-700" />
              <MenuToggle
                icon={<ListTree size={14} />}
                label="Table of Contents"
                checked={showToc}
                onChange={setShowToc}
              />
              {hasHarper && (
                <MenuToggle
                  icon={<SpellCheck size={14} />}
                  label="Spelling & Grammar"
                  checked={harperOn}
                  onChange={setHarperOn}
                />
              )}
              <div className="my-1 border-t border-gray-100 dark:border-slate-700" />
              {hasPagination && (
                <MenuToggle
                  icon={paginated ? <File size={14} /> : <Globe size={14} />}
                  label={paginated ? 'Page Layout: A4' : 'Page Layout: Web'}
                  checked={paginated}
                  onChange={handleTogglePageLayout}
                />
              )}
              <ToolbarMenuItem label="Page Settings"><RichTextPagination /></ToolbarMenuItem>
              <div className="my-1 border-t border-gray-100 dark:border-slate-700" />
              <ToolbarMenuItem label="Import Word"><RichTextImportWord /></ToolbarMenuItem>
              <ToolbarMenuItem label="Export Word"><RichTextExportWord /></ToolbarMenuItem>
              <ToolbarMenuItem label="Export PDF"><RichTextExportPdf /></ToolbarMenuItem>
            </div>,
            document.body
          )}
        </div>

        {/* Settings — right-aligned */}
        <div className="ml-auto dropdown-container">
          <button
            ref={settingsBtnRef}
            title="Settings"
            onClick={e => {
              if (configDriven) {
                setOpen(null);
                setPos(null);
                onOpenSettings!();
              } else {
                openMenuRight('settings', e);
              }
            }}
            className={`flex items-center gap-0.5 p-1.5 rounded transition-colors ${
              open === 'settings'
                ? 'bg-gray-200 dark:bg-slate-700'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <Settings size={16} />
          </button>
          {!configDriven && open === 'settings' && pos && createPortal(
            <div
              className="fixed bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-gray-200/60 dark:border-slate-700/60 rounded-lg shadow-2xl p-2 z-50 w-[260px] dropdown-portal"
              style={panelStyle(true)}
            >
              <div className="text-[10px] font-semibold mb-1 text-gray-500 dark:text-gray-400 uppercase px-1">Theme</div>
              <div className="flex gap-1 mb-2 px-1">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex-1 px-2 py-1 text-xs border rounded ${theme === 'light' ? 'bg-blue-500 text-white border-blue-600' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                >
                  ☀️ Light
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex-1 px-2 py-1 text-xs border rounded ${theme === 'dark' ? 'bg-blue-500 text-white border-blue-600' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                >
                  🌙 Dark
                </button>
              </div>
              <div className="text-[10px] font-semibold mb-1 text-gray-500 dark:text-gray-400 uppercase px-1">Accent Color</div>
              <div className="grid grid-cols-4 gap-0.5 px-1 mb-2">
                {(['default', 'red', 'blue', 'green', 'orange', 'rose', 'violet', 'yellow'] as ThemeColorType[]).map(color => (
                  <button
                    key={color}
                    onClick={() => themeActions.setColor(color)}
                    className="px-1.5 py-1 text-[10px] border rounded hover:bg-gray-100 dark:hover:bg-slate-800 capitalize"
                  >
                    {color}
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
              <div className="text-[10px] font-semibold mb-1 text-gray-500 dark:text-gray-400 uppercase px-1">Language</div>
              <div className="grid grid-cols-2 gap-0.5 px-1 max-h-[180px] overflow-y-auto">
                {([
                  { code: 'en', flag: '🇺🇸', label: 'English' },
                  { code: 'es', flag: '🇪🇸', label: 'Español' },
                  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
                  { code: 'zh_CN', flag: '🇨🇳', label: '中文' },
                  { code: 'ja', flag: '🇯🇵', label: '日本語' },
                  { code: 'ar', flag: '🇸🇦', label: 'العربية' },
                  { code: 'fr', flag: '🇫🇷', label: 'Français' },
                  { code: 'pt_BR', flag: '🇧🇷', label: 'Português' },
                  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
                  { code: 'tr', flag: '🇹🇷', label: 'Türkçe' },
                  { code: 'it', flag: '🇮🇹', label: 'Italiano' },
                  { code: 'fa', flag: '🇮🇷', label: 'فارسی' },
                  { code: 'nl', flag: '🇳🇱', label: 'Nederlands' },
                  { code: 'ko', flag: '🇰🇷', label: '한국어' },
                  { code: 'hi', flag: '🇮🇳', label: 'हिन्दी' },
                  { code: 'hu_HU', flag: '🇭🇺', label: 'Magyar' },
                  { code: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' },
                  { code: 'fi', flag: '🇫🇮', label: 'Suomi' },
                ] as { code: string; flag: string; label: string }[]).map(({ code, flag, label }) => (
                  <button
                    key={code}
                    onClick={() => localeActions.setLang(code)}
                    className={`px-1.5 py-1 text-[10px] border rounded text-left hover:bg-gray-100 dark:hover:bg-slate-800 ${currentLocale.lang === code ? 'bg-blue-500/20 border-blue-500' : ''}`}
                  >
                    {flag} {label}
                  </button>
                ))}
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>

      {showCss && <CssEditorModal onClose={() => setShowCss(false)} />}
      {showToc && editor && (
        <RichTextTableOfContentsPanel editor={editor} onClose={() => setShowToc(false)} />
      )}
      {hasHarper && harperOn && editor && <RichTextHarper editor={editor} />}
      {showShare && <FileShareModal onClose={() => setShowShare(false)} documentTitle={documentTitle} />}
      {showRename && <FileRenameModal onClose={() => setShowRename(false)} currentName={documentTitle} />}
      {showInfo && <FileInfoModal onClose={() => setShowInfo(false)} documentTitle={documentTitle} />}
    </>
  );
};
