import { resolveEdition } from '../resolveEdition';

describe('resolveEdition', () => {
  it('keeps bndy.live on the existing live edition', () => {
    expect(resolveEdition('bndy.live')).toBe('live');
  });

  it('keeps unknown and preview hosts on live for backwards compatibility', () => {
    expect(resolveEdition('localhost:3000')).toBe('live');
    expect(resolveEdition('preview.example.com')).toBe('live');
    expect(resolveEdition()).toBe('live');
  });

  it('resolves brass.bndy.live explicitly', () => {
    expect(resolveEdition('brass.bndy.live')).toBe('brass');
  });
});
