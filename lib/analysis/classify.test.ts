import { describe, expect, it } from 'vitest';

import { classifyFreshness } from './classify';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

describe('classifyFreshness', () => {
  it('treats a translation within 30 minutes of English as current', () => {
    const localizedAt = new Date('2026-07-10T00:00:00.000Z');
    const englishAt = new Date(localizedAt.getTime() + 30 * MINUTE);

    expect(classifyFreshness(localizedAt, englishAt)).toEqual({
      kind: 'current',
      lagMs: 30 * MINUTE,
      lagDays: 0,
    });
  });

  it('does not warn when the translation is newer than English', () => {
    const localizedAt = new Date('2026-07-11T00:00:00.000Z');
    const englishAt = new Date('2026-07-10T00:00:00.000Z');

    expect(classifyFreshness(localizedAt, englishAt)).toEqual({
      kind: 'current',
      lagMs: 0,
      lagDays: 0,
    });
  });

  it('marks a translation over 30 minutes but under 45 days behind', () => {
    const localizedAt = new Date('2026-07-10T00:00:00.000Z');
    const englishAt = new Date(localizedAt.getTime() + 44 * DAY);

    expect(classifyFreshness(localizedAt, englishAt).kind).toBe('behind');
  });

  it('marks a translation at least 45 days behind as outdated', () => {
    const localizedAt = new Date('2026-03-27T00:00:00.000Z');
    const englishAt = new Date(localizedAt.getTime() + 45 * DAY);

    expect(classifyFreshness(localizedAt, englishAt).kind).toBe('outdated');
  });
});
