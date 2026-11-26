import { describe, expect, it } from 'vitest';
import { classifyMany, classifyVideo } from './classify';

describe('classifyVideo', () => {
  it('treats 60s as a Short', () => {
    const result = classifyVideo({ durationSeconds: 60 });
    expect(result.format).toBe('short');
    expect(result.heuristic).toBe(true);
  });

  it('treats 61s as a Short while the extended setting is on', () => {
    expect(classifyVideo({ durationSeconds: 61 }).format).toBe('short');
    expect(classifyVideo({ durationSeconds: 61, treatExtendedAsShorts: true }).format).toBe(
      'short',
    );
  });

  it('treats 61s as long-form when the extended setting is off', () => {
    const result = classifyVideo({ durationSeconds: 61, treatExtendedAsShorts: false });
    expect(result.format).toBe('long');
    expect(result.heuristic).toBe(true);
  });

  it('treats 180s as a Short while the extended setting is on', () => {
    expect(classifyVideo({ durationSeconds: 180 }).format).toBe('short');
  });

  it('treats 180s as long-form when the extended setting is off', () => {
    expect(classifyVideo({ durationSeconds: 180, treatExtendedAsShorts: false }).format).toBe(
      'long',
    );
  });

  it('treats 181s as long-form', () => {
    expect(classifyVideo({ durationSeconds: 181 }).format).toBe('long');
  });

  it('lets a manual override win and marks it non-heuristic', () => {
    const result = classifyVideo({ durationSeconds: 600, override: 'short' });
    expect(result.format).toBe('short');
    expect(result.source).toBe('manual-override');
    expect(result.heuristic).toBe(false);
  });

  it('falls back to long-form with a reason when duration is unknown', () => {
    const result = classifyVideo({ durationSeconds: null });
    expect(result.format).toBe('long');
    expect(result.source).toBe('unknown-duration');
    expect(result.reason).toContain('Duration is unknown');
  });

  it('classifies a list in order', () => {
    const formats = classifyMany([
      { durationSeconds: 30 },
      { durationSeconds: 120 },
      { durationSeconds: 500 },
    ]).map((item) => item.format);
    expect(formats).toEqual(['short', 'short', 'long']);
  });
});
