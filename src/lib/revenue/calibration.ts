import { rpmForTier, type CountryTier, type VideoFormat } from './rpmTable';

/**
 * Users can enter the real RPM they see in YouTube Studio. The factor is
 * actual ÷ model mid, clamped so one odd period cannot explode an estimate.
 */

export const MIN_CALIBRATION_FACTOR = 0.2;
export const MAX_CALIBRATION_FACTOR = 5;

export type CalibrationLabel = 'Uncalibrated' | `Calibrated (${number} periods)`;

export type Calibration = {
  factor: number;
  label: CalibrationLabel;
  periods: number;
  clamped: boolean;
  actualRpm: number | null;
  modelMid: number | null;
};

export type CalibrationInput = {
  actualRpm: number | null;
  modelMid: number | null;
  /** How many Studio periods the actual RPM is based on. */
  periods?: number;
};

export const UNCALIBRATED: Calibration = {
  factor: 1,
  label: 'Uncalibrated',
  periods: 0,
  clamped: false,
  actualRpm: null,
  modelMid: null,
};

export function clampCalibrationFactor(factor: number): number {
  if (!Number.isFinite(factor) || factor <= 0) return 1;
  return Math.min(MAX_CALIBRATION_FACTOR, Math.max(MIN_CALIBRATION_FACTOR, factor));
}

export function calibrationFactor(
  actualRpm: number,
  modelMid: number,
): { factor: number; clamped: boolean } {
  if (
    !Number.isFinite(actualRpm) ||
    !Number.isFinite(modelMid) ||
    actualRpm <= 0 ||
    modelMid <= 0
  ) {
    return { factor: 1, clamped: false };
  }

  const raw = actualRpm / modelMid;
  const factor = clampCalibrationFactor(raw);
  return { factor, clamped: Math.abs(factor - raw) > 1e-9 };
}

export function calibrationLabel(periods: number): CalibrationLabel {
  if (!Number.isFinite(periods) || periods <= 0) return 'Uncalibrated';
  return `Calibrated (${Math.floor(periods)} periods)`;
}

export function calibrate(input: CalibrationInput): Calibration {
  const hasActual =
    input.actualRpm !== null &&
    Number.isFinite(input.actualRpm) &&
    input.actualRpm > 0;
  const hasModelMid =
    input.modelMid !== null &&
    Number.isFinite(input.modelMid) &&
    input.modelMid > 0;
  const periods =
    hasActual && hasModelMid
      ? input.periods !== undefined && Number.isFinite(input.periods) && input.periods > 0
        ? Math.floor(input.periods)
        : 1
      : 0;

  if (!hasActual || !hasModelMid || input.actualRpm === null || input.modelMid === null) {
    return { ...UNCALIBRATED, periods };
  }

  const { factor, clamped } = calibrationFactor(input.actualRpm, input.modelMid);
  return {
    factor,
    label: calibrationLabel(periods),
    periods,
    clamped,
    actualRpm: input.actualRpm,
    modelMid: input.modelMid,
  };
}

/** A convenient model mid when the user has no country mix yet. */
export function modelMidFromTier(
  format: VideoFormat,
  tier: CountryTier = 'mid',
): number {
  return rpmForTier(format, tier).mid;
}
