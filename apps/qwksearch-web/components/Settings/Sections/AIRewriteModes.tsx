'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  RewriteMode,
  getRewriteModes,
  saveRewriteModes,
  resetRewriteModes,
} from 'write-language/rewrite-modes';

const COLOR_OPTIONS = ['blue', 'purple', 'green', 'orange', 'pink'];

const COLOR_BADGES: Record<string, string> = {
  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  pink: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
};

const inputCls =
  'w-full rounded-lg border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary px-3 py-2 text-sm text-black/80 dark:text-white/80 placeholder:text-black/40 dark:placeholder:text-white/40 focus-visible:outline-none focus-visible:border-light-300 dark:focus-visible:border-dark-300 transition-colors';

const labelCls = 'text-xs text-black/70 dark:text-white/70 mb-1 block';
const btnBase = 'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200';

type EditForm = Partial<RewriteMode>;

const AIRewriteModes = (_props: { fields?: any; values?: any }) => {
  const [modes, setModes] = useState<RewriteMode[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm>({});

  useEffect(() => {
    setModes(getRewriteModes());
  }, []);

  const handleSave = () => {
    if (editingId === 'new') {
      const newMode: RewriteMode = {
        id: `custom-${Date.now()}`,
        name: form.name || 'New Mode',
        prompt: form.prompt || 'Rewrite this text:',
        color: form.color || 'blue',
      };
      const updated = [...modes, newMode];
      setModes(updated);
      saveRewriteModes(updated);
      toast.success('Mode added');
    } else if (editingId) {
      const updated = modes.map(m => m.id === editingId ? { ...m, ...form } as RewriteMode : m);
      setModes(updated);
      saveRewriteModes(updated);
      toast.success('Mode updated');
    }
    setEditingId(null);
    setForm({});
  };

  const handleDelete = (id: string) => {
    const updated = modes.filter(m => m.id !== id);
    setModes(updated);
    saveRewriteModes(updated);
    toast.success('Mode deleted');
  };

  const handleReset = () => {
    resetRewriteModes();
    setModes(getRewriteModes());
    toast.success('Modes reset to defaults');
  };

  const startEdit = (mode: RewriteMode) => {
    setEditingId(mode.id);
    setForm(mode);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({});
  };

  const EditFields = () => (
    <div className="space-y-3">
      <div className="flex flex-col space-y-1">
        <span className={labelCls}>Mode Name</span>
        <input className={inputCls} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Mode name" />
      </div>
      <div className="flex flex-col space-y-1">
        <span className={labelCls}>Prompt</span>
        <textarea
          className={inputCls}
          rows={4}
          value={form.prompt || ''}
          onChange={e => setForm({ ...form, prompt: e.target.value })}
          placeholder="Rewrite prompt..."
        />
      </div>
      <div className="flex flex-col space-y-1">
        <span className={labelCls}>Color</span>
        <select className={inputCls} value={form.color || 'blue'} onChange={e => setForm({ ...form, color: e.target.value })}>
          {COLOR_OPTIONS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} className={`${btnBase} bg-blue-500 text-white hover:bg-blue-600`}>
          {editingId === 'new' ? 'Add Mode' : 'Save'}
        </button>
        <button onClick={cancelEdit} className={`${btnBase} border border-light-200 dark:border-dark-200 text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-dark-200`}>
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="px-6 py-4 flex flex-col space-y-3 overflow-y-auto">
      <div className="flex justify-end">
        <button
          onClick={handleReset}
          className={`${btnBase} border border-light-200 dark:border-dark-200 text-black/60 dark:text-white/60 hover:bg-light-200 dark:hover:bg-dark-200`}
        >
          <RotateCcw size={12} />
          Reset to Defaults
        </button>
      </div>

      {modes.map(mode => (
        <div key={mode.id} className="rounded-xl border border-light-200 dark:border-dark-200 p-3 space-y-2">
          {editingId === mode.id ? (
            <EditFields />
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${COLOR_BADGES[mode.color || 'blue'] || COLOR_BADGES.blue}`}>
                  {mode.name}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(mode)} className="p-1.5 rounded hover:bg-light-200 dark:hover:bg-dark-200 text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80 transition-colors">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => handleDelete(mode.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-black/50 dark:text-white/50 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-black/50 dark:text-white/50 line-clamp-2">{mode.prompt}</p>
            </div>
          )}
        </div>
      ))}

      {editingId === 'new' && (
        <div className="rounded-xl border border-light-200 dark:border-dark-200 p-3">
          <EditFields />
        </div>
      )}

      {editingId !== 'new' && (
        <button
          onClick={() => { setEditingId('new'); setForm({ name: '', prompt: '', color: 'blue' }); }}
          className={`${btnBase} w-full justify-center border border-dashed border-light-200 dark:border-dark-200 text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80 hover:border-light-300 dark:hover:border-dark-300 py-2.5`}
        >
          <Plus size={13} />
          Add New Mode
        </button>
      )}
    </div>
  );
};

export default AIRewriteModes;
