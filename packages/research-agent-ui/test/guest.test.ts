/**
 * @fileoverview Unit tests for the localStorage-backed guest chat history.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    addMessageToGuestChat,
    clearAllGuestChats,
    createGuestChat,
    deleteGuestChat,
    getGuestChat,
    getGuestChats,
    saveGuestChat,
    updateGuestChatFiles,
    updateGuestChatTitle,
    type GuestChat,
} from '../src/lib/guest';

const KEY = 'qwksearch_guest_chats';

const chat = (id: string, overrides: Partial<GuestChat> = {}): GuestChat => ({
    id,
    title: `Chat ${id}`,
    createdAt: '2024-01-01T00:00:00.000Z',
    focusMode: 'webSearch',
    files: [],
    messages: [],
    ...overrides,
});

beforeEach(() => {
    window.localStorage.clear();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('getGuestChats', () => {
    it('returns an empty list when nothing is stored', () => {
        expect(getGuestChats()).toEqual([]);
    });

    it('returns stored chats newest first', () => {
        window.localStorage.setItem(
            KEY,
            JSON.stringify([
                chat('old', { createdAt: '2024-01-01T00:00:00.000Z' }),
                chat('new', { createdAt: '2024-06-01T00:00:00.000Z' }),
            ])
        );

        expect(getGuestChats().map((c) => c.id)).toEqual(['new', 'old']);
    });

    it('recovers from corrupt stored JSON', () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        window.localStorage.setItem(KEY, '{not json');

        expect(getGuestChats()).toEqual([]);
        expect(consoleError).toHaveBeenCalled();
    });
});

describe('getGuestChat', () => {
    it('finds a chat by id', () => {
        saveGuestChat(chat('a'));

        expect(getGuestChat('a')?.title).toBe('Chat a');
    });

    it('returns null for an unknown id', () => {
        expect(getGuestChat('nope')).toBeNull();
    });
});

describe('saveGuestChat', () => {
    it('appends a new chat', () => {
        saveGuestChat(chat('a'));
        saveGuestChat(chat('b'));

        expect(getGuestChats()).toHaveLength(2);
    });

    it('replaces an existing chat in place', () => {
        saveGuestChat(chat('a'));
        saveGuestChat(chat('a', { title: 'Renamed' }));

        expect(getGuestChats()).toHaveLength(1);
        expect(getGuestChat('a')?.title).toBe('Renamed');
    });
});

describe('createGuestChat', () => {
    it('persists a new chat and returns it', () => {
        const created = createGuestChat('a', 'First chat', 'academicSearch');

        expect(created.id).toBe('a');
        expect(created.title).toBe('First chat');
        expect(created.focusMode).toBe('academicSearch');
        expect(created.files).toEqual([]);
        expect(created.messages).toEqual([]);
        expect(getGuestChat('a')).not.toBeNull();
    });

    it('stamps a createdAt timestamp', () => {
        const created = createGuestChat('a', 'x', 'webSearch');

        expect(Number.isNaN(new Date(created.createdAt).getTime())).toBe(false);
    });

    it('keeps supplied files', () => {
        const files = [{ fileId: 'f1', fileName: 'a.pdf' }] as any;

        expect(createGuestChat('a', 'x', 'webSearch', files).files).toEqual(files);
    });
});

describe('deleteGuestChat and clearAllGuestChats', () => {
    it('removes one chat', () => {
        saveGuestChat(chat('a'));
        saveGuestChat(chat('b'));

        deleteGuestChat('a');

        expect(getGuestChats().map((c) => c.id)).toEqual(['b']);
    });

    it('is a no-op for an unknown id', () => {
        saveGuestChat(chat('a'));

        deleteGuestChat('nope');

        expect(getGuestChats()).toHaveLength(1);
    });

    it('clears every chat', () => {
        saveGuestChat(chat('a'));

        clearAllGuestChats();

        expect(getGuestChats()).toEqual([]);
        expect(window.localStorage.getItem(KEY)).toBeNull();
    });
});

describe('addMessageToGuestChat', () => {
    it('appends a message to an existing chat', () => {
        createGuestChat('a', 'x', 'webSearch');

        addMessageToGuestChat('a', { role: 'user', content: 'hi' } as any);

        expect(getGuestChat('a')?.messages).toHaveLength(1);
    });

    it('logs and skips for an unknown chat', () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        addMessageToGuestChat('nope', { role: 'user', content: 'hi' } as any);

        expect(consoleError).toHaveBeenCalledWith('Chat not found:', 'nope');
    });
});

describe('updateGuestChatTitle / updateGuestChatFiles', () => {
    it('renames an existing chat', () => {
        createGuestChat('a', 'Old', 'webSearch');

        updateGuestChatTitle('a', 'New');

        expect(getGuestChat('a')?.title).toBe('New');
    });

    it('replaces the attached files', () => {
        createGuestChat('a', 'x', 'webSearch');
        const files = [{ fileId: 'f1', fileName: 'a.pdf' }] as any;

        updateGuestChatFiles('a', files);

        expect(getGuestChat('a')?.files).toEqual(files);
    });

    it('ignores updates to an unknown chat', () => {
        expect(() => updateGuestChatTitle('nope', 'New')).not.toThrow();
        expect(() => updateGuestChatFiles('nope', [])).not.toThrow();
        expect(getGuestChats()).toEqual([]);
    });
});
