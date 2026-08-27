/**
 * Underwriting conventions and defaults for the VA Affordability engine.
 * Sources and dates: va-affordability-sources-2026-08.md §5–§7.
 *
 * Everything in ASSUMPTIONS is a labeled, user-adjustable convention, not a
 * VA rule. The VA sets no gross-up percentage (Ch.4 Topic 2 states none);
 * 15–25% is lender practice, 25% most common.
 */

export const ASSUMPTIONS = {
    grossUpPct: 0.25,          // lender convention, range 0.15–0.25
    grossUpRange: [0.15, 0.25],
    dtiCap: 0.41,              // handbook guideline (Ch.4 Topic 10)
    comfortPct: 0.28,          // "comfortable" = housing payment ≤ 28% of actual gross income (front-end convention)
    insuranceRatePerYear: 0.0065, // 2026 national avg, refresh each Q1 (va-loan)
    vaRate: 6.375,             // adjustable; refresh quarterly (va-loan defaults)
    termYears: 30,
    priceSearchCeiling: 5000000
};

// Readiness tightens the COMFORTABLE ceiling only (never the lender's math).
// TBV convention, stated in the UI: yellow −3 pts of comfort share, red −6;
// thin reserves hold back more; a 10% home-value dip may erase at most 35% of
// net worth.
export const READINESS = {
    tierAdjust: { green: 0, yellow: 0.03, red: 0.06 },
    reservesAdjust: { none: 0.03, low: 0.01 },   // 'none' = 0 months after close, 'low' = 1–3
    minComfortPct: 0.15,
    backEndSpread: 0.08,   // classic 28/36: all obligations ≤ comfort share + 8 pts
    exposureCap: 0.35,
    dipAssumed: 0.10
};

// VA funding fee — set 4/7/2023, unchanged through 2026. Keyed by down-payment band.
export const FUNDING_FEE = {
    first:      { under5: 0.0215, from5: 0.0150, from10: 0.0125 },
    subsequent: { under5: 0.0330, from5: 0.0150, from10: 0.0125 }
};

/**
 * Funding fee rate. Exempt: anyone receiving VA disability compensation (no
 * minimum rating), those eligible but paid retirement/active-duty instead,
 * DIC surviving spouses, pre-discharge memorandum ratings, active-duty Purple
 * Heart. `exemptOverride` covers the non-rating paths.
 */
export function fundingFeeRate({ rating = 0, exemptOverride = false, subsequentUse = false, downPct = 0 }) {
    if (exemptOverride || rating > 0) return 0;
    const band = downPct >= 0.10 ? 'from10' : downPct >= 0.05 ? 'from5' : 'under5';
    return (subsequentUse ? FUNDING_FEE.subsequent : FUNDING_FEE.first)[band];
}

// FICA on wages only (not on VA comp, not on pensions). Mirrors salary/data/military-data.js.
export const FICA = { socialSecurityRate: 0.062, socialSecurityWageCap: 184500, medicareRate: 0.0145 };

export function ficaAnnual(wages) {
    const w = Math.max(0, wages || 0);
    return Math.min(w, FICA.socialSecurityWageCap) * FICA.socialSecurityRate + w * FICA.medicareRate;
}
