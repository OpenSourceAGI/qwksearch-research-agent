import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EducationPlaylists } from '../src/components/EducationPlaylists';
import { encodeShareFragment } from '../src/lib/sharing';
import { createPlaylist } from '../src/lib/playlists';
import { PROGRESS_STORAGE_KEY } from '../src/lib/progress';

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
});

describe('EducationPlaylists', () => {
  it('shows a row of playlists in compact mode and expands into one', () => {
    render(<EducationPlaylists compact openHref="/learn" />);
    fireEvent.click(screen.getByRole('button', { name: /CS Foundations/ }));
    expect(screen.getByRole('checkbox', { name: /6\.0001.*lecture videos/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open full page' }).getAttribute('href')).toBe('/learn');
  });

  it('filters by category, major and program', () => {
    render(<EducationPlaylists />);
    fireEvent.click(screen.getByRole('button', { name: 'Science' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mathematics' }));
    fireEvent.click(screen.getByRole('button', { name: 'Calculus' }));
    expect(screen.getByRole('button', { name: /The Calculus Sequence/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /CS Foundations/ })).toBeNull();
  });

  it('checks items off and remembers them', () => {
    render(<EducationPlaylists />);
    fireEvent.click(screen.getByRole('button', { name: /CS Foundations/ }));
    const box = screen.getByRole('checkbox', { name: /6\.0001.*lecture videos/ });
    fireEvent.click(box);
    expect(JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY)!)).toContain(
      '6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016#videos',
    );
    expect(screen.getByText(/1\/6 done/)).toBeTruthy();
  });

  it('saves a private copy of a preset with sharing controls', () => {
    render(<EducationPlaylists />);
    fireEvent.click(screen.getByRole('button', { name: /CS Foundations/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save to my playlists' }));
    expect(screen.getByRole('button', { name: 'Private' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.change(screen.getByRole('textbox', { name: 'Invite by email' }), { target: { value: 'pal@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Invite' }));
    expect(screen.getByText('invite pending')).toBeTruthy();
  });

  it('plans a playlist offline from a goal and answers', async () => {
    render(<EducationPlaylists />);
    fireEvent.click(screen.getByRole('tab', { name: 'Plan with AI' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'What do you want to learn?' }), { target: { value: 'linear algebra' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await screen.findByText('Where are you starting from?');
    fireEvent.change(screen.getByRole('textbox', { name: /Your answer: How much time/ }), { target: { value: '4 hours' } });
    fireEvent.click(screen.getByRole('button', { name: 'Build my playlist' }));
    await screen.findByText(/Planned from the catalog/);
    expect(screen.getAllByRole('checkbox', { name: /18\.06 Linear Algebra/ }).length).toBeGreaterThan(0);
    expect(screen.getByText(/weeks at your pace/)).toBeTruthy();
  });

  it('opens a playlist shared by link', async () => {
    const shared = { ...createPlaylist({ title: 'Shared path', items: [] }), visibility: 'public' as const };
    shared.items = [{ id: 'x', title: 'A talk', url: 'https://example.com/talk', kind: 'video', minutes: 20, estimate: 'exact', provenance: { provider: 'web', method: 'user', verified: false } }];
    window.location.hash = encodeShareFragment(shared);
    render(<EducationPlaylists importFromHash />);
    await waitFor(() => expect(screen.getByText('Shared with you by link')).toBeTruthy());
    expect(screen.getByRole('link', { name: 'A talk' }).getAttribute('href')).toBe('https://example.com/talk');
  });
});
