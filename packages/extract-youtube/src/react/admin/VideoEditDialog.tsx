/**
 * @fileoverview The admin form for adding or editing one library video —
 * the standard fields plus an input for every custom field the host declared.
 *
 * Ported from debate-ai.com's `VideoEditDialog`, whose debate-specific inputs
 * (style, tournament, round, aff/neg teams, winner, decision) are what custom
 * fields generalise. Kept from the original:
 *
 * - **Auto-fill** asks the server (`client.autofill`) for suggestions — the
 *   Data API or oEmbed, plus the host's `suggest` hook — and fills only the
 *   inputs it has an answer for. Nothing is saved until the admin clicks Save.
 * - **Only changed fields are sent** on an edit, so two admins editing
 *   different fields of the same video don't overwrite each other.
 * - **Add accepts any YouTube URL**, not just a bare id.
 */

'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';

import type { VideoLibraryClient } from '../../library/client';
import {
  VIDEO_AVAILABILITIES,
  type CustomFieldDef,
  type CustomFieldValue,
  type LibraryVideo,
  type LibraryVideoPatch,
  type VideoAvailability,
} from '../../library/types';
import { extractVideoId } from '../../utils/extract-video-id';
import { GridStylesProvider } from '../grid/styles';

export interface VideoEditDialogProps {
  client: VideoLibraryClient;
  /** The video to edit, or `null` to add a new one. */
  video: LibraryVideo | null;
  customFields?: readonly CustomFieldDef[];
  /** Known categories, offered as suggestions in the category input. */
  categories?: readonly string[];
  onClose: () => void;
  onSaved: (video: LibraryVideo) => void;
}

/** What the form holds: every value as the string (or boolean) its input edits. */
interface FormState {
  videoInput: string;
  title: string;
  channel: string;
  publishedAt: string;
  viewCount: string;
  category: string;
  tags: string;
  description: string;
  featured: boolean;
  hidden: boolean;
  availability: VideoAvailability;
  custom: Record<string, string | boolean>;
}

const AVAILABILITY_LABELS: Record<VideoAvailability, string> = {
  available: 'Available',
  private: 'Private',
  not_embeddable: 'Embedding disabled',
  removed: 'Removed',
};

function customToInput(def: CustomFieldDef, value: CustomFieldValue | undefined): string | boolean {
  if (def.type === 'boolean') return Boolean(value);
  return value === null || value === undefined ? '' : String(value);
}

/** Initial form values for a video (or an empty form). */
export function formStateFor(video: LibraryVideo | null, defs: readonly CustomFieldDef[]): FormState {
  return {
    videoInput: video?.videoId ?? '',
    title: video?.title ?? '',
    channel: video?.channel ?? '',
    publishedAt: video?.publishedAt?.slice(0, 10) ?? '',
    viewCount: video ? String(video.viewCount) : '',
    category: video?.category ?? '',
    tags: (video?.tags ?? []).join(', '),
    description: video?.description ?? '',
    featured: video?.featured ?? false,
    hidden: video?.hidden ?? false,
    availability: video?.availability ?? 'available',
    custom: Object.fromEntries(defs.map((def) => [def.key, customToInput(def, video?.custom?.[def.key])])),
  };
}

/** The patch to send: every field for a new video, only changed ones for an edit. */
export function patchFromForm(form: FormState, initial: FormState, isNew: boolean): LibraryVideoPatch {
  const patch: LibraryVideoPatch = {};
  const changed = <K extends keyof FormState>(key: K) => isNew || form[key] !== initial[key];
  if (changed('title')) patch.title = form.title;
  if (changed('channel')) patch.channel = form.channel;
  if (changed('publishedAt')) patch.publishedAt = form.publishedAt;
  if (changed('viewCount')) patch.viewCount = form.viewCount;
  if (changed('category')) patch.category = form.category;
  if (changed('tags')) patch.tags = form.tags;
  if (changed('description')) patch.description = form.description;
  if (changed('featured')) patch.featured = form.featured;
  if (changed('hidden')) patch.hidden = form.hidden;
  if (changed('availability')) patch.availability = form.availability;
  const custom: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(form.custom)) {
    if (isNew || value !== initial.custom[key]) custom[key] = value;
  }
  if (Object.keys(custom).length > 0) patch.custom = custom;
  return patch;
}

export function VideoEditDialog({ client, video, customFields = [], categories = [], onClose, onSaved }: VideoEditDialogProps) {
  const isNew = video === null;
  const initial = useMemo(() => formStateFor(video, customFields), [video, customFields]);
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => setForm(initial), [initial]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const videoId = video ? video.videoId : extractVideoId(form.videoInput);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const setCustom = (key: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, custom: { ...prev.custom, [key]: value } }));

  const autofill = async () => {
    if (!videoId) {
      setError('Enter a YouTube URL or video id first.');
      return;
    }
    setAutofilling(true);
    setError(null);
    setNotice(null);
    try {
      const result = await client.autofill({ videoId, title: form.title, channel: form.channel, description: form.description });
      const { fields } = result;
      setForm((prev) => {
        const next = { ...prev, custom: { ...prev.custom } };
        if (typeof fields.title === 'string') next.title = fields.title;
        if (typeof fields.channel === 'string') next.channel = fields.channel;
        if (typeof fields.publishedAt === 'string') next.publishedAt = fields.publishedAt.slice(0, 10);
        if (fields.viewCount !== undefined) next.viewCount = String(fields.viewCount);
        if (typeof fields.description === 'string') next.description = fields.description;
        if (typeof fields.category === 'string') next.category = fields.category;
        if (Array.isArray(fields.tags)) next.tags = fields.tags.join(', ');
        if (typeof fields.availability === 'string') next.availability = fields.availability as VideoAvailability;
        for (const def of customFields) {
          const value = fields.custom?.[def.key];
          if (value !== undefined && value !== null && value !== '') next.custom[def.key] = customToInput(def, value as CustomFieldValue);
        }
        return next;
      });
      const from = result.sources.length > 0 ? `Filled from ${result.sources.join(', ')}.` : 'Nothing to fill in.';
      setNotice([from, ...result.warnings].join(' '));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAutofilling(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!videoId) {
      setError('That is not a YouTube URL or video id.');
      return;
    }
    if (!form.title.trim()) {
      setError('A title is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const patch = patchFromForm(form, initial, isNew);
      const saved = isNew ? await client.create(videoId, patch) : await client.update(videoId, patch);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const listId = 'eytg-category-options';

  return (
    <GridStylesProvider>
      <div className="eytg-root eytg-overlay" role="presentation" onClick={onClose}>
        <form
          className="eytg-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="eytg-edit-title"
          onClick={(event) => event.stopPropagation()}
          onSubmit={submit}
        >
          <header>
            <h2 id="eytg-edit-title">{isNew ? 'Add video' : 'Edit video'}</h2>
            <button type="button" className="eytg-icon-btn" onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          </header>

          <div className="eytg-dialog-body">
            {error && <div className="eytg-banner eytg-banner-error" role="alert">{error}</div>}
            {notice && <div className="eytg-banner">{notice}</div>}

            <div className="eytg-form-grid">
              <label className="eytg-field eytg-field-wide">
                <span>YouTube URL or video id</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="eytg-input"
                    style={{ flex: 1 }}
                    value={form.videoInput}
                    onChange={(event) => set('videoInput', event.target.value)}
                    disabled={!isNew}
                    placeholder="https://www.youtube.com/watch?v=…"
                    required
                    autoFocus={isNew}
                  />
                  <button type="button" className="eytg-btn" onClick={autofill} disabled={autofilling || !videoId}>
                    {autofilling ? <Loader2 size={14} className="eytg-spin" /> : <Sparkles size={14} />}
                    Auto-fill
                  </button>
                </div>
                {isNew && form.videoInput && !videoId && <small>Not a recognisable YouTube URL or id.</small>}
              </label>

              <label className="eytg-field eytg-field-wide">
                <span>Title</span>
                <input className="eytg-input" value={form.title} onChange={(event) => set('title', event.target.value)} required />
              </label>
              <label className="eytg-field">
                <span>Channel</span>
                <input className="eytg-input" value={form.channel} onChange={(event) => set('channel', event.target.value)} />
              </label>
              <label className="eytg-field">
                <span>Published</span>
                <input
                  className="eytg-input"
                  type="date"
                  value={form.publishedAt}
                  onChange={(event) => set('publishedAt', event.target.value)}
                />
              </label>
              <label className="eytg-field">
                <span>Category</span>
                <input
                  className="eytg-input"
                  list={listId}
                  value={form.category}
                  onChange={(event) => set('category', event.target.value)}
                />
                <datalist id={listId}>
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </label>
              <label className="eytg-field">
                <span>Views</span>
                <input
                  className="eytg-input"
                  type="number"
                  min={0}
                  value={form.viewCount}
                  onChange={(event) => set('viewCount', event.target.value)}
                />
              </label>
              <label className="eytg-field eytg-field-wide">
                <span>Tags</span>
                <input
                  className="eytg-input"
                  value={form.tags}
                  onChange={(event) => set('tags', event.target.value)}
                  placeholder="comma, separated"
                />
              </label>
              <label className="eytg-field">
                <span>Availability</span>
                <select
                  className="eytg-select"
                  value={form.availability}
                  onChange={(event) => set('availability', event.target.value as VideoAvailability)}
                >
                  {VIDEO_AVAILABILITIES.map((value) => (
                    <option key={value} value={value}>
                      {AVAILABILITY_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="eytg-field" style={{ justifyContent: 'flex-end', gap: 8 }}>
                <label className="eytg-check">
                  <input type="checkbox" checked={form.featured} onChange={(event) => set('featured', event.target.checked)} />
                  Top pick
                </label>
                <label className="eytg-check">
                  <input type="checkbox" checked={form.hidden} onChange={(event) => set('hidden', event.target.checked)} />
                  Hidden from public listings
                </label>
              </div>
              <label className="eytg-field eytg-field-wide">
                <span>Description</span>
                <textarea
                  className="eytg-textarea"
                  value={form.description}
                  onChange={(event) => set('description', event.target.value)}
                  rows={4}
                />
                <small>Links to other videos in the library stack them together.</small>
              </label>
            </div>

            {customFields.length > 0 && (
              <>
                <h3 className="eytg-section-title">Custom fields</h3>
                <div className="eytg-form-grid">
                  {customFields.map((def) => (
                    <CustomFieldInput key={def.key} def={def} value={form.custom[def.key]} onChange={(value) => setCustom(def.key, value)} />
                  ))}
                </div>
              </>
            )}
          </div>

          <footer>
            <button type="button" className="eytg-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="eytg-btn eytg-btn-primary" disabled={saving}>
              {saving && <Loader2 size={14} className="eytg-spin" />}
              {isNew ? 'Add video' : 'Save changes'}
            </button>
          </footer>
        </form>
      </div>
    </GridStylesProvider>
  );
}

/** One input for a custom field, by its declared type. */
export function CustomFieldInput({
  def,
  value,
  onChange,
}: {
  def: CustomFieldDef;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
}) {
  if (def.type === 'boolean') {
    return (
      <div className="eytg-field" style={{ justifyContent: 'flex-end' }}>
        <label className="eytg-check">
          <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
          {def.label}
        </label>
        {def.help && <small>{def.help}</small>}
      </div>
    );
  }
  const text = typeof value === 'string' ? value : '';
  return (
    <label className={`eytg-field${def.type === 'textarea' ? ' eytg-field-wide' : ''}`}>
      <span>{def.label}</span>
      {def.type === 'select' ? (
        <select className="eytg-select" value={text} onChange={(event) => onChange(event.target.value)}>
          <option value="">—</option>
          {(def.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : def.type === 'textarea' ? (
        <textarea className="eytg-textarea" value={text} rows={3} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input
          className="eytg-input"
          type={def.type === 'number' ? 'number' : def.type === 'url' ? 'url' : 'text'}
          value={text}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {def.help && <small>{def.help}</small>}
    </label>
  );
}
