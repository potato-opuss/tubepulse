import { describe, expect, it } from 'vitest';
import { describeAssumptions, describeRpmNote } from './explain';

describe('describeAssumptions', () => {
  it('explains RPM, shares and calibration in human-readable text', () => {
    const text = describeAssumptions();
    expect(text).toContain('RPM');
    expect(text).toContain('55%');
    expect(text).toContain('45%');
    expect(text).toContain('never multiplied by CPM');
    expect(text).toContain('0.2–5');
  });

  it('mentions the date switch, early tier, forecast and indicative rate', () => {
    const text = describeAssumptions();
    expect(text).toContain('31 Jan 2027');
    expect(text).toContain('8,000');
    expect(text).toContain('early tier');
    expect(text).toContain('Not enough data yet');
    expect(text).toContain('indicative');
  });

  it('exposes the RPM assumption note', () => {
    expect(describeRpmNote()).toContain('NOT official YouTube figures');
    expect(describeRpmNote()).toContain('Users should calibrate');
  });
});
