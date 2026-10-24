import {BLOBS, BLOB_KINDS, blobFor, isBlobKind} from '../src/avatars';

describe('blob avatars', () => {
  it('uses the chosen blob', () => {
    expect(blobFor({id: 'maya', avatar: 'drop'})).toBe(BLOBS.drop);
  });

  it('gives a profile without one a steady blob from its id', () => {
    const a = blobFor({id: 'grandma-jo'});
    expect(blobFor({id: 'grandma-jo', avatar: 'robot'})).toBe(a);
    expect(Object.values(BLOBS)).toContain(a);
  });

  it('every blob has a closed body, two eyes and a mouth', () => {
    for (const kind of BLOB_KINDS) {
      expect(isBlobKind(kind)).toBe(true);
      expect(BLOBS[kind].body.endsWith('Z')).toBe(true);
      expect(BLOBS[kind].eyes).toHaveLength(2);
      expect(BLOBS[kind].mouth).toMatch(/^M/);
    }
  });
});
