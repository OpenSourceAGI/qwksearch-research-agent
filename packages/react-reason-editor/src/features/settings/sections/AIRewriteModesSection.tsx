/**
 * @module AIRewriteModesSection
 * @description Settings panel for managing AI rewrite modes: create, edit,
 * delete, and reset to defaults. Rendered as one tab inside the Settings dialog.
 */
import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, RotateCcw } from 'lucide-react';
import { Label } from '../../../app-ui/label';
import { Separator } from '../../../app-ui/separator';
import { Button } from '../../../app-ui/button';
import { Input } from '../../../app-ui/input';
import { Textarea } from '../../../app-ui/textarea';
import { Badge } from '../../../app-ui/badge';
import { getRewriteModes, saveRewriteModes, resetRewriteModes, RewriteMode } from '../../ai-rewrite/rewriteModes';
import { toast } from 'sonner';

interface AIRewriteModesSectionProps {
  /** Whether the parent dialog is open; triggers a reload of modes when it opens. */
  open: boolean;
}

const COLOR_OPTIONS = ['blue', 'purple', 'green', 'orange', 'pink'];

export const AIRewriteModesSection = ({ open }: AIRewriteModesSectionProps) => {
  const [rewriteModes, setRewriteModes] = useState<RewriteMode[]>([]);
  const [editingMode, setEditingMode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<RewriteMode>>({});

  useEffect(() => {
    if (open) setRewriteModes(getRewriteModes());
  }, [open]);

  const handleSaveMode = (mode: RewriteMode) => {
    const updated = rewriteModes.map((m) => (m.id === mode.id ? mode : m));
    setRewriteModes(updated);
    saveRewriteModes(updated);
    setEditingMode(null);
    setEditForm({});
    toast.success('Mode updated');
  };

  const handleAddMode = () => {
    const newMode: RewriteMode = {
      id: `custom-${Date.now()}`,
      name: editForm.name || 'New Mode',
      prompt: editForm.prompt || 'Rewrite this text:',
      color: editForm.color || 'blue',
    };
    const updated = [...rewriteModes, newMode];
    setRewriteModes(updated);
    saveRewriteModes(updated);
    setEditingMode(null);
    setEditForm({});
    toast.success('Mode added');
  };

  const handleDelete = (id: string) => {
    const updated = rewriteModes.filter((m) => m.id !== id);
    setRewriteModes(updated);
    saveRewriteModes(updated);
    toast.success('Mode deleted');
  };

  const handleReset = () => {
    resetRewriteModes();
    setRewriteModes(getRewriteModes());
    toast.success('Modes reset to defaults');
  };

  const ModeEditForm = ({ modeId, onSave, onCancel }: { modeId: string; onSave: () => void; onCancel: () => void }) => (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={`name-${modeId}`}>Mode Name</Label>
        <Input id={`name-${modeId}`} value={editForm.name || ''} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} placeholder="Mode name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`prompt-${modeId}`}>Prompt</Label>
        <Textarea id={`prompt-${modeId}`} value={editForm.prompt || ''} onChange={(e) => setEditForm((f) => ({ ...f, prompt: e.target.value }))} placeholder="Rewrite prompt..." rows={4} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`color-${modeId}`}>Color</Label>
        <select id={`color-${modeId}`} value={editForm.color || 'blue'} onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm">
          {COLOR_OPTIONS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave}>Save</Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-2">AI Rewrite Modes</h2>
          <p className="text-sm text-muted-foreground">Customize AI rewrite prompts and add your own modes</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      <Separator />

      <div className="space-y-3">
        {rewriteModes.map((mode) => (
          <div key={mode.id} className="border rounded-lg p-3 space-y-2">
            {editingMode === mode.id ? (
              <ModeEditForm
                modeId={mode.id}
                onSave={() => handleSaveMode(editForm as RewriteMode)}
                onCancel={() => { setEditingMode(null); setEditForm({}); }}
              />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-sm">{mode.name}</Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingMode(mode.id); setEditForm(mode); }}><Edit2 className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(mode.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{mode.prompt}</p>
              </div>
            )}
          </div>
        ))}

        {editingMode === 'new' && (
          <div className="border rounded-lg p-3">
            <ModeEditForm
              modeId="new"
              onSave={handleAddMode}
              onCancel={() => { setEditingMode(null); setEditForm({}); }}
            />
          </div>
        )}
      </div>

      {editingMode !== 'new' && (
        <Button variant="outline" size="sm" onClick={() => { setEditingMode('new'); setEditForm({ name: '', prompt: '', color: 'blue' }); }} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Add New Mode
        </Button>
      )}
    </div>
  );
};
