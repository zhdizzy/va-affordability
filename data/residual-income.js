/**
 * VA residual income requirements — VA Pamphlet 26-7 (Lender's Handbook),
 * Chapter 4, Topic 9 (Form 26-6393 Loan Analysis) and Topic 10 (DTI rule).
 *
 * Pulled 8/25/26. Handbook mirror operative date 2019-02-22; every cell
 * cross-verified against three independent sources (two published errors
 * caught and rejected — see va-affordability-sources-2026-08.md §1).
 *
 * BOTH loan brackets are region-specific. Do not flatten the low bracket.
 * Refresh: re-verify annually; tables have been static for years.
 */

export const REGIONS = ['Northeast', 'Midwest', 'South', 'West'];

// Loans of $79,999 and below. Family size 1..5; over 5 → +$75/member, max 7.
export const RESIDUAL_LOW = {
    Northeast: [390, 654, 788, 888, 921],
    Midwest:   [382, 641, 772, 868, 902],
    South:     [382, 641, 772, 868, 902],
    West:      [425, 713, 859, 967, 1004]
};

// Loans of $80,000 and above. Family size 1..5; over 5 → +$80/member, max 7.
export const RESIDUAL_HIGH = {
    Northeast: [450, 755, 909, 1025, 1062],
    Midwest:   [441, 738, 889, 1003, 1039],
    South:     [441, 738, 889, 1003, 1039],
    West:      [491, 823, 990, 1117, 1158]
};

export const RESIDUAL_BRACKET_THRESHOLD = 80000;
export const RESIDUAL_EXTRA_MEMBER = { low: 75, high: 80 };
export const RESIDUAL_MAX_FAMILY = 7;

// VA regions are NOT census regions. 50 states + DC + PR.
// Guam, USVI, American Samoa, CNMI have no handbook assignment (return null).
export const STATE_TO_REGION = {
    CT: 'Northeast', ME: 'Northeast', MA: 'Northeast', NH: 'Northeast', NJ: 'Northeast',
    NY: 'Northeast', PA: 'Northeast', RI: 'Northeast', VT: 'Northeast',
    IL: 'Midwest', IN: 'Midwest', IA: 'Midwest', KS: 'Midwest', MI: 'Midwest', MN: 'Midwest',
    MO: 'Midwest', NE: 'Midwest', ND: 'Midwest', OH: 'Midwest', SD: 'Midwest', WI: 'Midwest',
    AL: 'South', AR: 'South', DE: 'South', DC: 'South', FL: 'South', GA: 'South', KY: 'South',
    LA: 'South', MD: 'South', MS: 'South', NC: 'South', OK: 'South', PR: 'South', SC: 'South',
    TN: 'South', TX: 'South', VA: 'South', WV: 'South',
    AK: 'West', AZ: 'West', CA: 'West', CO: 'West', HI: 'West', ID: 'West', MT: 'West',
    NV: 'West', NM: 'West', OR: 'West', UT: 'West', WA: 'West', WY: 'West'
};

// "Calculate maintenance and utility costs using 14¢ per square foot for the
// gross living area as per the appraisal." Unfinished basements excluded.
export const MAINTENANCE_PER_SQFT = 0.14;

// "A ratio greater than 41 percent requires close scrutiny unless ... residual
// income exceeds the guideline by at least 20 percent" (or the excess is due
// solely to tax-free income, approved with supervisor justification).
export const DTI_GUIDELINE = 0.41;
export const RESIDUAL_CUSHION_FOR_DTI_OVERRIDE = 0.20;

export function regionFor(stateCode) {
    return STATE_TO_REGION[String(stateCode || '').toUpperCase()] || null;
}

/**
 * Required monthly residual income for a region, family size and loan amount.
 * Family size counts everyone in the household the veteran supports, including
 * the veteran. Sizes above 7 are treated as 7 (handbook cap).
 */
export function requiredResidual(region, familySize, loanAmount) {
    if (!RESIDUAL_LOW[region]) return null;
    const high = loanAmount >= RESIDUAL_BRACKET_THRESHOLD;
    const table = high ? RESIDUAL_HIGH[region] : RESIDUAL_LOW[region];
    const size = Math.max(1, Math.min(RESIDUAL_MAX_FAMILY, Math.round(familySize || 1)));
    if (size <= 5) return table[size - 1];
    return table[4] + (size - 5) * (high ? RESIDUAL_EXTRA_MEMBER.high : RESIDUAL_EXTRA_MEMBER.low);
}
