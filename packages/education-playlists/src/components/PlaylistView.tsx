/**
 * @fileoverview One playlist, opened: its items with checkmarks and time
 * estimates, overall progress, and — for a playlist the learner owns — the
 * sharing controls.
 */
import React, { useState } from 'react';
import type { Playlist, PlaylistItem, PlaylistItemKind } from '../types';
import { formatMinutes, playlistTime, weeksToFinish } from '../lib/time';
import { encodeShareFragment, invite, removeMember } from '../lib/sharing';
import { removeItem } from '../lib/playlists';
import type { Quiz, QuizGenerator } from '../quiz';
import { s } from './styles';

const KIND_LABEL: Record<PlaylistItemKind, string> = {
  video_playlist: 'Videos',
  video: 'Video',
  courseware: 'Courseware',
  lecture_notes: 'Notes',
  assignment: 'Assignment',
  reading: 'Reading',
  textbook: 'Textbook',
};

const PROVIDER_LABEL: Record<string, string> = {
  mit_ocw: 'MIT OCW',
  youtube: 'YouTube',
  edx: 'edX',
  coursera: 'Coursera',
  khan: 'Khan Academy',
  openstax: 'OpenStax',
  web: 'Web',
};

const METHOD_LABEL: Record<string, string> = {
  curated_seed: 'curated',
  official_api: 'official',
  snapshot_dataset: 'dataset',
  community_list: 'community',
  llm_search: 'AI search',
  user: 'added',
};

export interface PlaylistViewProps {
  playlist: Playlist;
  done: ReadonlySet<string>;
  onToggle: (itemId: string) => void;
  /** Present when the learner may edit this playlist. */
  onChange?: (playlist: Playlist) => void;
  /** Saves a private copy into "My playlists" (for presets, shared links and fresh plans). */
  onSaveCopy?: (playlist: Playlist) => void;
  /** Weekly pace, for "about N weeks left". */
  minutesPerWeek?: number;
  /** Page a share link opens, e.g. `https://example.com/learn`. */
  shareBaseHref?: string;
  quizGenerator?: QuizGenerator;
}

function ItemRow({
  item,
  checked,
  onToggle,
  onRemove,
  quizGenerator,
}: {
  item: PlaylistItem;
  checked: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  quizGenerator?: QuizGenerator;
}) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizState, setQuizState] = useState<'idle' | 'loading' | 'error'>('idle');
  const generateQuiz = async () => {
    if (!quizGenerator) return;
    setQuizState('loading');
    try {
      setQuiz(await quizGenerator(item));
      setQuizState('idle');
    } catch {
      setQuizState('error');
    }
  };

  return (
    <li style={s.item}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        aria-label={`Mark "${item.title}" ${checked ? 'not done' : 'done'}`}
        style={{ marginTop: 3, cursor: 'pointer' }}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...s.link, textDecoration: checked ? 'line-through' : 'none', opacity: checked ? 0.6 : 1 }}
        >
          {item.title}
        </a>
        <div style={{ ...s.row, ...s.muted }}>
          <span style={s.badge}>{KIND_LABEL[item.kind]}</span>
          <span title={item.estimateBasis}>
            {item.estimate === 'rough' ? '~' : ''}
            {formatMinutes(item.minutes)}
          </span>
          <span style={s.badge} title={item.provenance.note}>
            {PROVIDER_LABEL[item.provenance.provider] ?? item.provenance.provider} · {METHOD_LABEL[item.provenance.method] ?? item.provenance.method}
          </span>
          {quizGenerator && (
            <button type="button" style={{ ...s.chip, padding: '0 8px' }} onClick={generateQuiz} disabled={quizState === 'loading'}>
              {quizState === 'loading' ? 'Writing quiz…' : quizState === 'error' ? 'Quiz failed, retry' : 'Quiz me'}
            </button>
          )}
          {onRemove && (
            <button type="button" style={{ ...s.chip, padding: '0 8px' }} onClick={onRemove} aria-label={`Remove "${item.title}"`}>
              Remove
            </button>
          )}
        </div>
        {quiz && (
          <ol style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 12 }}>
            {quiz.questions.map((question, index) => (
              <li key={index}>
                {question.prompt}
                <details>
                  <summary style={{ cursor: 'pointer', opacity: 0.7 }}>Answer</summary>
                  {question.choices[question.answerIndex]}
                  {question.explanation ? ` — ${question.explanation}` : ''}
                </details>
              </li>
            ))}
          </ol>
        )}
      </div>
    </li>
  );
}

function SharingControls({ playlist, onChange, shareBaseHref }: { playlist: Playlist; onChange: (p: Playlist) => void; shareBaseHref?: string }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const copyShareLink = async () => {
    const base = shareBaseHref ?? (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '');
    const link = `${base}#${encodeShareFragment(playlist)}`;
    try {
      await navigator.clipboard.writeText(link);
      setMessage('Share link copied.');
    } catch {
      setMessage(link);
    }
  };

  const addInvite = () => {
    try {
      onChange(invite(playlist, email, 'viewer'));
      setEmail('');
      setMessage(null);
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  return (
    <div style={s.section}>
      <div style={s.row}>
        <span style={s.muted}>Visibility:</span>
        {(['private', 'public'] as const).map((visibility) => (
          <button
            key={visibility}
            type="button"
            style={{ ...s.chip, ...(playlist.visibility === visibility ? s.chipActive : null) }}
            onClick={() => onChange({ ...playlist, visibility })}
            aria-pressed={playlist.visibility === visibility}
          >
            {visibility === 'private' ? 'Private' : 'Public'}
          </button>
        ))}
        {playlist.visibility === 'public' && (
          <button type="button" style={s.button} onClick={copyShareLink}>
            Copy share link
          </button>
        )}
      </div>
      {playlist.visibility === 'private' && (
        <>
          <form
            style={s.row}
            onSubmit={(event) => {
              event.preventDefault();
              addInvite();
            }}
          >
            <input style={s.input} type="email" placeholder="Invite by email" value={email} onChange={(event) => setEmail(event.target.value)} aria-label="Invite by email" />
            <button type="submit" style={s.button} disabled={!email.trim()}>
              Invite
            </button>
          </form>
          {(playlist.members ?? []).map((member) => (
            <div key={member.email ?? member.userId} style={{ ...s.row, ...s.muted }}>
              <span>{member.email}</span>
              <span style={s.badge}>{member.status === 'invited' ? 'invite pending' : member.role}</span>
              {member.email && (
                <button type="button" style={{ ...s.chip, padding: '0 8px' }} onClick={() => onChange(removeMember(playlist, member.email!))}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </>
      )}
      {message && <div style={{ ...s.muted, wordBreak: 'break-all' }}>{message}</div>}
    </div>
  );
}

export function PlaylistView({ playlist, done, onToggle, onChange, onSaveCopy, minutesPerWeek, shareBaseHref, quizGenerator }: PlaylistViewProps) {
  const time = playlistTime(playlist, done);
  const weeks = weeksToFinish(time.remainingMinutes, minutesPerWeek);

  return (
    <div style={s.section}>
      <div>
        <div style={s.title}>{playlist.title}</div>
        {playlist.description && <div style={s.muted}>{playlist.description}</div>}
      </div>
      <div style={{ ...s.row, ...s.muted }}>
        <span>
          {time.doneCount}/{time.itemCount} done
        </span>
        <span>· ~{formatMinutes(time.remainingMinutes)} left of ~{formatMinutes(time.totalMinutes)}</span>
        {weeks !== null && <span>· about {weeks} week{weeks === 1 ? '' : 's'} at your pace</span>}
      </div>
      <div style={s.bar} role="progressbar" aria-valuenow={time.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Progress by time">
        <div style={{ ...s.barFill, width: `${time.percent}%` }} />
      </div>
      {playlist.items.length === 0 ? (
        <div style={s.muted}>Nothing matched yet. Try different wording, or answer the questions in your own words.</div>
      ) : (
        <ul style={s.list}>
          {playlist.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              checked={done.has(item.id)}
              onToggle={() => onToggle(item.id)}
              onRemove={onChange ? () => onChange(removeItem(playlist, item.id)) : undefined}
              quizGenerator={quizGenerator}
            />
          ))}
        </ul>
      )}
      <div style={s.row}>
        {onSaveCopy && (
          <button type="button" style={s.primary} onClick={() => onSaveCopy(playlist)}>
            Save to my playlists
          </button>
        )}
      </div>
      {onChange && <SharingControls playlist={playlist} onChange={onChange} shareBaseHref={shareBaseHref} />}
    </div>
  );
}
