
const REFERRAL_COMMISSION_RATE = 0.10;
const REFERRAL_CAP_PER_CREATOR = 100; // $100 max per referred creator

interface ReferralSplitResult {
  creatorAmount: number;
  referralFee: number;
  referrerId: string | null;
}

/**
 * Calculate referral bonus for an approved submission.
 *
 * Clipster model:
 * - Creator keeps 100% of earnings (no deduction)
 * - Referrer earns 10% ON TOP (platform pays 110%)
 * - $100 cap per referred creator (lifetime)
 * - No time limit
 *
 * @param totalPaidToReferrer - how much has already been paid to referrer for this creator
 */
export function calculateReferralSplit(
  fullAmount: number,
  referredBy: string | null,
  _referredUserCreatedAt: Date,
  totalPaidToReferrer: number = 0
): ReferralSplitResult {
  if (!referredBy) {
    return { creatorAmount: fullAmount, referralFee: 0, referrerId: null };
  }

  // Check if referrer has already hit the $100 cap for this creator
  const remainingCap = Math.max(0, REFERRAL_CAP_PER_CREATOR - totalPaidToReferrer);
  if (remainingCap <= 0) {
    return { creatorAmount: fullAmount, referralFee: 0, referrerId: null };
  }

  // 10% bonus ON TOP — creator keeps full amount
  const uncappedFee = Math.round(fullAmount * REFERRAL_COMMISSION_RATE * 100) / 100;
  const referralFee = Math.round(Math.min(uncappedFee, remainingCap) * 100) / 100;

  // Creator keeps 100% — referral fee is paid by the platform on top
  return { creatorAmount: fullAmount, referralFee, referrerId: referredBy };
}
