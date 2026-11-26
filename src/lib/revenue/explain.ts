import { RPM_ASSUMPTION_NOTE } from './rpmTable';

/** Human-readable text for the “How is this calculated?” popover. */
export function describeAssumptions(): string {
  return [
    'How this estimate is calculated',
    'RPM is estimated creator revenue per 1,000 total video views after YouTube’s share. Long-form uses a 55% creator share and Shorts 45%; both are already inside every RPM. Views are never multiplied by CPM.',
    `Countries are grouped into premium, high, mid and low tiers. Unknown countries use the low tier. ${RPM_ASSUMPTION_NOTE}`,
    'Country weights are normalized to 100%. Calibration multiplies every RPM by actual RPM ÷ model mid, clamped to 0.2–5. “Uncalibrated” means the default assumptions are used.',
    'Monetization: until 31 Jan 2027, 1,000 subscribers plus 4,000 watch hours in 365 days or 10M Shorts views in 90 days. From 1 Feb 2027, new applicants need 8,000 hours or 20M Shorts views. The early tier (500 subscribers + 3 public uploads + 3,000 hours or 3M Shorts views) unlocks fan funding and shopping, not ad revenue.',
    'Forecasts use a weighted linear regression on the last 7–28 daily points and show a range from the residual spread. Fewer than 7 points shows “Not enough data yet”. Payout ETAs only appear when the trend is positive.',
    'Currency conversion uses an indicative USD→TRY rate from Frankfurter, cached for 12 hours, then a cached or manual rate. It is not a bank rate.',
  ].join('\n\n');
}

export function describeRpmNote(): string {
  return RPM_ASSUMPTION_NOTE;
}
