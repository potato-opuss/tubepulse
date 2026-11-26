import type { VideoFormat } from './rpmTable';

/**
 * The Data API has no Shorts flag, so classification is a documented
 * heuristic: duration plus an optional per-video manual override.
 */

export const SHORT_MAX_SECONDS = 60;
export const EXTENDED_SHORT_MAX_SECONDS = 180;
export const DEFAULT_TREAT_EXTENDED_AS_SHORTS = true;

export type ClassificationSource = 'duration' | 'manual-override' | 'unknown-duration';

export type VideoClassification = {
  format: VideoFormat;
  /** True when the format came from a rule of thumb rather than a real flag. */
  heuristic: boolean;
  source: ClassificationSource;
  reason: string;
};

export type ClassifyInput = {
  durationSeconds: number | null;
  /** 61–180s counts as Shorts only while this setting is on (default on). */
  treatExtendedAsShorts?: boolean;
  /** A per-video manual override always wins. */
  override?: VideoFormat | null;
};

export function classifyVideo(input: ClassifyInput): VideoClassification {
  if (input.override === 'short' || input.override === 'long') {
    return {
      format: input.override,
      heuristic: false,
      source: 'manual-override',
      reason: 'Manual per-video override.',
    };
  }

  const duration = input.durationSeconds;
  if (duration === null || !Number.isFinite(duration) || duration < 0) {
    return {
      format: 'long',
      heuristic: true,
      source: 'unknown-duration',
      reason: 'Duration is unknown, so this video is counted as long-form until it is known.',
    };
  }

  if (duration <= SHORT_MAX_SECONDS) {
    return {
      format: 'short',
      heuristic: true,
      source: 'duration',
      reason: `Duration is ${duration}s, at or below the ${SHORT_MAX_SECONDS}s Shorts limit.`,
    };
  }

  const treatExtended = input.treatExtendedAsShorts ?? DEFAULT_TREAT_EXTENDED_AS_SHORTS;

  if (duration <= EXTENDED_SHORT_MAX_SECONDS) {
    if (treatExtended) {
      return {
        format: 'short',
        heuristic: true,
        source: 'duration',
        reason: `Duration is ${duration}s and the “treat <=180s as Shorts” setting is on.`,
      };
    }
    return {
      format: 'long',
      heuristic: true,
      source: 'duration',
      reason: `Duration is ${duration}s and the “treat <=180s as Shorts” setting is off.`,
    };
  }

  return {
    format: 'long',
    heuristic: true,
    source: 'duration',
    reason: `Duration is ${duration}s, above the ${EXTENDED_SHORT_MAX_SECONDS}s heuristic limit.`,
  };
}

export function classifyMany(videos: readonly ClassifyInput[]): VideoClassification[] {
  return videos.map(classifyVideo);
}
