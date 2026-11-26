import { describe, expect, it } from 'vitest';
import {
  MAX_CALIBRATION_FACTOR,
  MIN_CALIBRATION_FACTOR,
  calibrate,
  calibrationFactor,
  calibrationLabel,
  clampCalibrationFactor,
  modelMidFromTier,
} from './calibration';

describe('calibration', () => {
  it('computes actual RPM divided by model mid', () => {
    expect(calibrationFactor(9, 4.5)).toEqual({ factor: 2, clamped: false });
  });

  it('clamps a tiny factor to 0.2', () => {
    const result = calibrationFactor(0.1, 4.5);
    expect(result.factor).toBe(MIN_CALIBRATION_FACTOR);
    expect(result.clamped).toBe(true);
  });

  it('clamps a huge factor to 5', () => {
    const result = calibrationFactor(100, 4.5);
    expect(result.factor).toBe(MAX_CALIBRATION_FACTOR);
    expect(result.clamped).toBe(true);
  });

  it('returns an uncalibrated factor for invalid input', () => {
    expect(calibrationFactor(0, 4.5).factor).toBe(1);
    expect(calibrationFactor(Number.NaN, 4.5).factor).toBe(1);
    expect(clampCalibrationFactor(Number.NaN)).toBe(1);
  });

  it('labels calibration periods', () => {
    expect(calibrationLabel(0)).toBe('Uncalibrated');
    expect(calibrationLabel(3)).toBe('Calibrated (3 periods)');
  });

  it('builds a calibrated result with a label', () => {
    const result = calibrate({ actualRpm: 3, modelMid: 1.5, periods: 2 });
    expect(result.factor).toBe(2);
    expect(result.label).toBe('Calibrated (2 periods)');
    expect(result.clamped).toBe(false);
  });

  it('defaults to one period when a real RPM is entered', () => {
    const result = calibrate({ actualRpm: 3, modelMid: 1.5 });
    expect(result.label).toBe('Calibrated (1 periods)');
    expect(result.periods).toBe(1);
  });

  it('keeps Uncalibrated when actual RPM is missing', () => {
    const result = calibrate({ actualRpm: null, modelMid: 1.5, periods: 2 });
    expect(result.factor).toBe(1);
    expect(result.label).toBe('Uncalibrated');
    expect(result.periods).toBe(0);
  });

  it('exposes a default mid-tier model mid', () => {
    expect(modelMidFromTier('long')).toBe(1.2);
    expect(modelMidFromTier('short', 'premium')).toBe(0.07);
  });
});
