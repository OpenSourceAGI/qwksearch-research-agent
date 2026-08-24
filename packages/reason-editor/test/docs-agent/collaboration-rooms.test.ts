import { describe, expect, it } from 'vitest';

import {
  collaborationRoom,
  cursorColorFor,
  parseCollaborationRoom,
  plateYjsProviders,
  ROOM_PREFIX,
} from '../../src/docs-agent/collaboration/hocuspocus-client';
import { parseRoom } from '../../../../apps/collaboration-server/src/rooms';

describe('collaborationRoom', () => {
  it('namespaces rooms by engine', () => {
    expect(collaborationRoom('tiptap', 'abc123')).toBe('reason-editor:tiptap:abc123');
    expect(collaborationRoom('plate', 'abc123')).toBe('reason-editor:plate:abc123');
  });

  it('never gives the two engines the same room for one document', () => {
    expect(collaborationRoom('tiptap', 'abc123')).not.toBe(
      collaborationRoom('plate', 'abc123'),
    );
  });

  it('rejects an empty document id', () => {
    expect(() => collaborationRoom('plate', '')).toThrow(/documentId/);
  });

  it('round-trips through the client parser', () => {
    expect(parseCollaborationRoom(collaborationRoom('plate', 'doc:with:colons'))).toEqual({
      engine: 'plate',
      documentId: 'doc:with:colons',
    });
  });

  it.each([
    ['wrong prefix', 'other:plate:abc'],
    ['unknown engine', `${ROOM_PREFIX}:lexical:abc`],
    ['missing document id', `${ROOM_PREFIX}:plate:`],
    ['not a room', 'abc'],
  ])('rejects %s', (_label, room) => {
    expect(parseCollaborationRoom(room)).toBeNull();
  });

  it('agrees with the collaboration server on what a valid room is', () => {
    const rooms = [
      collaborationRoom('tiptap', 'abc123'),
      collaborationRoom('plate', 'abc123'),
      'other:plate:abc',
      `${ROOM_PREFIX}:lexical:abc`,
      `${ROOM_PREFIX}:plate:`,
    ];

    for (const room of rooms) {
      expect(parseCollaborationRoom(room), room).toEqual(parseRoom(room));
    }
  });
});

describe('plateYjsProviders', () => {
  it('points both providers at the plate room', () => {
    const providers = plateYjsProviders({
      documentId: 'abc123',
      token: 'tok',
      url: 'ws://example.test',
    });

    expect(providers).toEqual([
      {
        type: 'hocuspocus',
        options: {
          name: 'reason-editor:plate:abc123',
          token: 'tok',
          url: 'ws://example.test',
        },
      },
      {
        type: 'indexeddb',
        options: { docName: 'reason-editor:plate:abc123' },
      },
    ]);
  });
});

describe('cursorColorFor', () => {
  it('is stable for a given user', () => {
    expect(cursorColorFor('user-a')).toBe(cursorColorFor('user-a'));
  });

  it('returns a hex colour', () => {
    expect(cursorColorFor('user-b')).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
