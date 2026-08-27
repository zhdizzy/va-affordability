// FORKED COPY (8/27/26) of tbv-tools/salary/data/tax-data.js — that file is the source of truth.
// Refresh here whenever the parent is refreshed (grep tbv-tools/*/data/ for siblings).
/**
 * 2026 Federal and State Income Tax Data
 * Federal: IRS Rev. Proc. 2025-32 (official 2026 parameters, post-OBBBA).
 *   Previous values were 2025 parameters mislabeled as projected-2026 —
 *   verified and corrected 8/10/26.
 * State: Tax Foundation 2026 State Individual Income Tax Rates
 */

// Federal tax brackets — Single filer (2026)
export const FEDERAL_BRACKETS_SINGLE = [
    { rate: 0.10, min: 0,      max: 12400 },
    { rate: 0.12, min: 12400,  max: 50400 },
    { rate: 0.22, min: 50400,  max: 105700 },
    { rate: 0.24, min: 105700, max: 201775 },
    { rate: 0.32, min: 201775, max: 256225 },
    { rate: 0.35, min: 256225, max: 640600 },
    { rate: 0.37, min: 640600, max: Infinity }
];

// Federal tax brackets — Married filing jointly (2026)
export const FEDERAL_BRACKETS_MFJ = [
    { rate: 0.10, min: 0,      max: 24800 },
    { rate: 0.12, min: 24800,  max: 100800 },
    { rate: 0.22, min: 100800, max: 211400 },
    { rate: 0.24, min: 211400, max: 403550 },
    { rate: 0.32, min: 403550, max: 512450 },
    { rate: 0.35, min: 512450, max: 768700 },
    { rate: 0.37, min: 768700, max: Infinity }
];

// Standard deductions (2026)
export const STANDARD_DEDUCTION = {
    single: 16100,
    married: 32200
};

/**
 * State income tax data — all 50 states + DC
 * Source: Tax Foundation, "State Individual Income Tax Rates and Brackets, 2026"
 *   (taxfoundation.org/data/all/state/state-income-tax-rates-2026/), rates as of
 *   January 1, 2026. Derived and cross-checked 8/10/2026. Structural changes
 *   (LA flat, OK collapse, NY cuts, MT two-bracket) verified against state
 *   revenue departments / enacting legislation.
 * type: "none" = no wage income tax, "flat" = single rate, "progressive" = brackets
 * Single-filer brackets throughout (documented simplification; married brackets
 * roughly double for most states). Thresholds as the source publishes them.
 * Deliberately NOT modeled (matching this file's existing granularity choices):
 *   CA 1% mental-health surtax on income over $1M (top modeled rate stays 12.3%);
 *   MA 4% millionaire surtax on income over $1,083,150 (modeled as flat 5%);
 *   ID zero-bracket on the first ~$4,800 (modeled as pure flat).
 * Mid-2026 scheduled change: SC only (see its comment).
 */
export const STATE_TAX = {
    "AL": { name: "Alabama", type: "progressive", brackets: [
        { rate: 0.02, min: 0, max: 500 }, { rate: 0.04, min: 500, max: 3000 }, { rate: 0.05, min: 3000, max: Infinity }
    ]},
    "AK": { name: "Alaska", type: "none" },
    "AZ": { name: "Arizona", type: "flat", rate: 0.025 },
    "AR": { name: "Arkansas", type: "progressive", brackets: [
        { rate: 0.02, min: 0, max: 4600 }, { rate: 0.039, min: 4600, max: Infinity }
    ]},
    "CA": { name: "California", type: "progressive", brackets: [
        { rate: 0.01, min: 0, max: 11079 }, { rate: 0.02, min: 11079, max: 26264 },
        { rate: 0.04, min: 26264, max: 41452 }, { rate: 0.06, min: 41452, max: 57542 },
        { rate: 0.08, min: 57542, max: 72724 }, { rate: 0.093, min: 72724, max: 371479 },
        { rate: 0.103, min: 371479, max: 445771 }, { rate: 0.113, min: 445771, max: 742953 },
        { rate: 0.123, min: 742953, max: Infinity }
    ]},
    "CO": { name: "Colorado", type: "flat", rate: 0.044 },
    "CT": { name: "Connecticut", type: "progressive", brackets: [
        { rate: 0.02, min: 0, max: 10000 }, { rate: 0.045, min: 10000, max: 50000 },
        { rate: 0.055, min: 50000, max: 100000 }, { rate: 0.06, min: 100000, max: 200000 },
        { rate: 0.065, min: 200000, max: 250000 }, { rate: 0.069, min: 250000, max: 500000 },
        { rate: 0.0699, min: 500000, max: Infinity }
    ]},
    "DE": { name: "Delaware", type: "progressive", brackets: [
        { rate: 0.022, min: 2000, max: 5000 }, { rate: 0.039, min: 5000, max: 10000 },
        { rate: 0.048, min: 10000, max: 20000 }, { rate: 0.052, min: 20000, max: 25000 },
        { rate: 0.0555, min: 25000, max: 60000 }, { rate: 0.066, min: 60000, max: Infinity }
    ]},
    "FL": { name: "Florida", type: "none" },
    // GA: 5.19% per Tax Foundation errata — the trigger cut to 5.09% did NOT fire for 2026.
    "GA": { name: "Georgia", type: "flat", rate: 0.0519 },
    "HI": { name: "Hawaii", type: "progressive", brackets: [
        { rate: 0.014, min: 0, max: 9600 }, { rate: 0.032, min: 9600, max: 14400 },
        { rate: 0.055, min: 14400, max: 19200 }, { rate: 0.064, min: 19200, max: 24000 },
        { rate: 0.068, min: 24000, max: 36000 }, { rate: 0.072, min: 36000, max: 48000 },
        { rate: 0.076, min: 48000, max: 125000 }, { rate: 0.079, min: 125000, max: 175000 },
        { rate: 0.0825, min: 175000, max: 225000 }, { rate: 0.09, min: 225000, max: 275000 },
        { rate: 0.10, min: 275000, max: 325000 }, { rate: 0.11, min: 325000, max: Infinity }
    ]},
    "ID": { name: "Idaho", type: "flat", rate: 0.053 },
    "IL": { name: "Illinois", type: "flat", rate: 0.0495 },
    "IN": { name: "Indiana", type: "flat", rate: 0.0295 },
    "IA": { name: "Iowa", type: "flat", rate: 0.038 },
    "KS": { name: "Kansas", type: "progressive", brackets: [
        { rate: 0.052, min: 0, max: 23000 }, { rate: 0.0558, min: 23000, max: Infinity }
    ]},
    "KY": { name: "Kentucky", type: "flat", rate: 0.035 },
    "LA": { name: "Louisiana", type: "flat", rate: 0.03 },
    "ME": { name: "Maine", type: "progressive", brackets: [
        { rate: 0.058, min: 0, max: 27399 }, { rate: 0.0675, min: 27399, max: 64849 },
        { rate: 0.0715, min: 64849, max: Infinity }
    ]},
    "MD": { name: "Maryland", type: "progressive", brackets: [
        { rate: 0.02, min: 0, max: 1000 }, { rate: 0.03, min: 1000, max: 2000 },
        { rate: 0.04, min: 2000, max: 3000 }, { rate: 0.0475, min: 3000, max: 100000 },
        { rate: 0.05, min: 100000, max: 125000 }, { rate: 0.0525, min: 125000, max: 150000 },
        { rate: 0.055, min: 150000, max: 250000 }, { rate: 0.0575, min: 250000, max: 500000 },
        { rate: 0.0625, min: 500000, max: 1000000 }, { rate: 0.065, min: 1000000, max: Infinity }
    ]},
    "MA": { name: "Massachusetts", type: "flat", rate: 0.05 },
    "MI": { name: "Michigan", type: "flat", rate: 0.0425 },
    "MN": { name: "Minnesota", type: "progressive", brackets: [
        { rate: 0.0535, min: 0, max: 33310 }, { rate: 0.068, min: 33310, max: 109430 },
        { rate: 0.0785, min: 109430, max: 203150 }, { rate: 0.0985, min: 203150, max: Infinity }
    ]},
    // MS: first $10,000 exempt, then flat 4.0% (further cuts scheduled 2027-2030).
    "MS": { name: "Mississippi", type: "progressive", brackets: [
        { rate: 0.0, min: 0, max: 10000 }, { rate: 0.04, min: 10000, max: Infinity }
    ]},
    "MO": { name: "Missouri", type: "progressive", brackets: [
        { rate: 0.0, min: 0, max: 1348 }, { rate: 0.02, min: 1348, max: 2696 },
        { rate: 0.025, min: 2696, max: 4044 }, { rate: 0.03, min: 4044, max: 5392 },
        { rate: 0.035, min: 5392, max: 6740 }, { rate: 0.04, min: 6740, max: 8088 },
        { rate: 0.045, min: 8088, max: 9436 }, { rate: 0.047, min: 9436, max: Infinity }
    ]},
    // MT: top rate drops to 5.4% in 2027 (not mid-2026).
    "MT": { name: "Montana", type: "progressive", brackets: [
        { rate: 0.047, min: 0, max: 47500 }, { rate: 0.0565, min: 47500, max: Infinity }
    ]},
    "NE": { name: "Nebraska", type: "progressive", brackets: [
        { rate: 0.0246, min: 0, max: 4130 }, { rate: 0.0351, min: 4130, max: 24760 },
        { rate: 0.0455, min: 24760, max: Infinity }
    ]},
    "NV": { name: "Nevada", type: "none" },
    "NH": { name: "New Hampshire", type: "none" },
    "NJ": { name: "New Jersey", type: "progressive", brackets: [
        { rate: 0.014, min: 0, max: 20000 }, { rate: 0.0175, min: 20000, max: 35000 },
        { rate: 0.035, min: 35000, max: 40000 }, { rate: 0.05525, min: 40000, max: 75000 },
        { rate: 0.0637, min: 75000, max: 500000 }, { rate: 0.0897, min: 500000, max: 1000000 },
        { rate: 0.1075, min: 1000000, max: Infinity }
    ]},
    "NM": { name: "New Mexico", type: "progressive", brackets: [
        { rate: 0.015, min: 0, max: 5500 }, { rate: 0.032, min: 5500, max: 16500 },
        { rate: 0.043, min: 16500, max: 33500 }, { rate: 0.047, min: 33500, max: 66500 },
        { rate: 0.049, min: 66500, max: 210000 }, { rate: 0.059, min: 210000, max: Infinity }
    ]},
    // NY: FY2026 budget cut the five lowest bracket rates by 0.1pp for TY2026; another 0.1pp comes in 2027.
    "NY": { name: "New York", type: "progressive", brackets: [
        { rate: 0.039, min: 0, max: 8500 }, { rate: 0.044, min: 8500, max: 11700 },
        { rate: 0.0515, min: 11700, max: 13900 }, { rate: 0.054, min: 13900, max: 80650 },
        { rate: 0.059, min: 80650, max: 215400 }, { rate: 0.0685, min: 215400, max: 1077550 },
        { rate: 0.0965, min: 1077550, max: 5000000 }, { rate: 0.103, min: 5000000, max: 25000000 },
        { rate: 0.109, min: 25000000, max: Infinity }
    ]},
    "NC": { name: "North Carolina", type: "flat", rate: 0.0399 },
    "ND": { name: "North Dakota", type: "progressive", brackets: [
        { rate: 0.0, min: 0, max: 48475 }, { rate: 0.0195, min: 48475, max: 244825 },
        { rate: 0.025, min: 244825, max: Infinity }
    ]},
    "OH": { name: "Ohio", type: "progressive", brackets: [
        { rate: 0.0, min: 0, max: 26050 }, { rate: 0.0275, min: 26050, max: Infinity }
    ]},
    // OK: HB 2764 collapsed six brackets to three (plus a 0% band) and cut the top rate, eff. 1/1/2026.
    "OK": { name: "Oklahoma", type: "progressive", brackets: [
        { rate: 0.0, min: 0, max: 3750 }, { rate: 0.025, min: 3750, max: 4900 },
        { rate: 0.035, min: 4900, max: 7200 }, { rate: 0.045, min: 7200, max: Infinity }
    ]},
    "OR": { name: "Oregon", type: "progressive", brackets: [
        { rate: 0.0475, min: 0, max: 4550 }, { rate: 0.0675, min: 4550, max: 11400 },
        { rate: 0.0875, min: 11400, max: 125000 }, { rate: 0.099, min: 125000, max: Infinity }
    ]},
    "PA": { name: "Pennsylvania", type: "flat", rate: 0.0307 },
    "RI": { name: "Rhode Island", type: "progressive", brackets: [
        { rate: 0.0375, min: 0, max: 82050 }, { rate: 0.0475, min: 82050, max: 186450 },
        { rate: 0.0599, min: 186450, max: Infinity }
    ]},
    // SC: MID-2026 CHANGE — top rate is a temporary 6.0% (FY2026 budget) through 6/30/2026,
    // scheduled to revert to 6.2% on July 1, 2026. Table reflects rates as of 1/1/2026.
    "SC": { name: "South Carolina", type: "progressive", brackets: [
        { rate: 0.0, min: 0, max: 3640 }, { rate: 0.03, min: 3640, max: 18230 },
        { rate: 0.06, min: 18230, max: Infinity }
    ]},
    "SD": { name: "South Dakota", type: "none" },
    "TN": { name: "Tennessee", type: "none" },
    "TX": { name: "Texas", type: "none" },
    "UT": { name: "Utah", type: "flat", rate: 0.045 },
    "VT": { name: "Vermont", type: "progressive", brackets: [
        { rate: 0.0335, min: 0, max: 49400 }, { rate: 0.066, min: 49400, max: 119700 },
        { rate: 0.076, min: 119700, max: 249700 }, { rate: 0.0875, min: 249700, max: Infinity }
    ]},
    "VA": { name: "Virginia", type: "progressive", brackets: [
        { rate: 0.02, min: 0, max: 3000 }, { rate: 0.03, min: 3000, max: 5000 },
        { rate: 0.05, min: 5000, max: 17000 }, { rate: 0.0575, min: 17000, max: Infinity }
    ]},
    // WA: capital-gains tax only (7%/9%); no tax on wage income.
    "WA": { name: "Washington", type: "none" },
    "WV": { name: "West Virginia", type: "progressive", brackets: [
        { rate: 0.0222, min: 0, max: 10000 }, { rate: 0.0296, min: 10000, max: 25000 },
        { rate: 0.0333, min: 25000, max: 40000 }, { rate: 0.0444, min: 40000, max: 60000 },
        { rate: 0.0482, min: 60000, max: Infinity }
    ]},
    "WI": { name: "Wisconsin", type: "progressive", brackets: [
        { rate: 0.035, min: 0, max: 15110 }, { rate: 0.044, min: 15110, max: 51950 },
        { rate: 0.053, min: 51950, max: 332720 }, { rate: 0.0765, min: 332720, max: Infinity }
    ]},
    "WY": { name: "Wyoming", type: "none" },
    "DC": { name: "District of Columbia", type: "progressive", brackets: [
        { rate: 0.04, min: 0, max: 10000 }, { rate: 0.06, min: 10000, max: 40000 },
        { rate: 0.065, min: 40000, max: 60000 }, { rate: 0.085, min: 60000, max: 250000 },
        { rate: 0.0925, min: 250000, max: 500000 }, { rate: 0.0975, min: 500000, max: 1000000 },
        { rate: 0.1075, min: 1000000, max: Infinity }
    ]}
};

// VA disability compensation (monthly, tax-free) — single veteran, no dependents
// Source: VA.gov 2026 rates (effective Dec 1, 2025)
export const VA_DISABILITY_MONTHLY = {
    0: 0, 10: 180.42, 20: 356.66, 30: 552.47, 40: 795.84,
    50: 1132.90, 60: 1435.02, 70: 1808.45, 80: 2102.15,
    90: 2362.30, 100: 3938.58
};


// Dependent-aware VA table — ported 8/12/26 from 100-pt's audited
// compensationRates (Dec 1, 2025 rates, verified Aug 2026). Dependents raise
// compensation at 30%+ only. VA_DISABILITY_MONTHLY above stays as the
// single-veteran column for backward compatibility.
export const VA_DISABILITY_TABLE = {
    30:  { veteran: 552.47, withSpouse: 617.47, with1Child: 596.47, withSpouseAnd1Child: 666.47, additionalChildUnder18: 32 },
    40:  { veteran: 795.84, withSpouse: 882.84, with1Child: 853.84, withSpouseAnd1Child: 947.84, additionalChildUnder18: 43 },
    50:  { veteran: 1132.90, withSpouse: 1241.90, with1Child: 1205.90, withSpouseAnd1Child: 1322.90, additionalChildUnder18: 54 },
    60:  { veteran: 1435.02, withSpouse: 1566.02, with1Child: 1523.02, withSpouseAnd1Child: 1663.02, additionalChildUnder18: 65 },
    70:  { veteran: 1808.45, withSpouse: 1961.45, with1Child: 1910.45, withSpouseAnd1Child: 2074.45, additionalChildUnder18: 76 },
    80:  { veteran: 2102.15, withSpouse: 2277.15, with1Child: 2219.15, withSpouseAnd1Child: 2406.15, additionalChildUnder18: 87 },
    90:  { veteran: 2362.30, withSpouse: 2559.30, with1Child: 2494.30, withSpouseAnd1Child: 2704.30, additionalChildUnder18: 98 },
    100: { veteran: 3938.58, withSpouse: 4158.17, with1Child: 4085.43, withSpouseAnd1Child: 4318.99, additionalChildUnder18: 109.11 }
};

/** Monthly VA compensation for a rating + family shape (spouse, child count). */
export function vaMonthlyFor(rating, hasSpouse, numChildren) {
    if (!rating) return 0;
    if (rating < 30 || (!hasSpouse && numChildren === 0)) return VA_DISABILITY_MONTHLY[rating] || 0;
    const d = VA_DISABILITY_TABLE[rating];
    if (!d) return VA_DISABILITY_MONTHLY[rating] || 0;
    let base;
    if (hasSpouse && numChildren > 0) base = d.withSpouseAnd1Child;
    else if (hasSpouse) base = d.withSpouse;
    else base = d.with1Child;
    if (numChildren > 1) base += d.additionalChildUnder18 * (numChildren - 1);
    return base;
}


// SMC table — ported 8/12/26 from 100-pt's audited smcRates (Dec 1 2025,
// verified against VA.gov raw tables Aug 2026; half-steps are floor-of-mean,
// NOT COLA-multiplied). Levels replace the schedular rate; K stacks on top,
// capped per 38 CFR 3.350(a): at the L rate when riding a schedular rating
// or S, at the O rate when riding L through N-1/2, nothing at O/R.
export const SMC_RATES = {
    "K":     { veteran: 139.87, isAddOn: true },
    "S":     { veteran: 4408.53, withSpouse: 4628.12, with1Child: 4555.38, withSpouseAnd1Child: 4788.94, additionalChildUnder18: 109.11 },
    "L":     { veteran: 4900.83, withSpouse: 5120.42, with1Child: 5047.68, withSpouseAnd1Child: 5281.24, additionalChildUnder18: 109.11 },
    "L-1/2": { veteran: 5154.00, withSpouse: 5373.59, with1Child: 5300.85, withSpouseAnd1Child: 5534.41, additionalChildUnder18: 109.11 },
    "M":     { veteran: 5408.55, withSpouse: 5628.14, with1Child: 5555.40, withSpouseAnd1Child: 5788.96, additionalChildUnder18: 109.11 },
    "M-1/2": { veteran: 5780.00, withSpouse: 5999.59, with1Child: 5926.85, withSpouseAnd1Child: 6160.41, additionalChildUnder18: 109.11 },
    "N":     { veteran: 6152.64, withSpouse: 6372.23, with1Child: 6299.49, withSpouseAnd1Child: 6533.05, additionalChildUnder18: 109.11 },
    "N-1/2": { veteran: 6514.00, withSpouse: 6733.59, with1Child: 6660.85, withSpouseAnd1Child: 6894.41, additionalChildUnder18: 109.11 },
    "O/P":   { veteran: 6877.12, withSpouse: 7096.71, with1Child: 7023.97, withSpouseAnd1Child: 7257.53, additionalChildUnder18: 109.11 },
    "R.1":   { veteran: 9826.88, withSpouse: 10046.47, with1Child: 9973.73, withSpouseAnd1Child: 10207.29, additionalChildUnder18: 109.11 },
    "R.2":   { veteran: 11271.67, withSpouse: 11491.26, with1Child: 11418.52, withSpouseAnd1Child: 11652.08, additionalChildUnder18: 109.11 }
};

function smcFamilyRate(levelKey, hasSpouse, numChildren) {
    const d = SMC_RATES[levelKey];
    if (!d || d.isAddOn) return 0;
    let base;
    if (hasSpouse && numChildren > 0) base = d.withSpouseAnd1Child;
    else if (hasSpouse) base = d.withSpouse;
    else if (numChildren > 0) base = d.with1Child;
    else base = d.veteran;
    if (numChildren > 1) base += d.additionalChildUnder18 * (numChildren - 1);
    return base;
}

/**
 * Monthly VA compensation including expected SMC. Level (S..R.2) replaces the
 * schedular amount; up to 3 stacked SMC-K awards ride on top within the
 * statutory caps.
 */
export function vaMonthlyWithSmc(rating, hasSpouse, numChildren, smcLevel, numK) {
    const schedular = vaMonthlyFor(rating, hasSpouse, numChildren);
    const level = smcLevel && SMC_RATES[smcLevel] && !SMC_RATES[smcLevel].isAddOn ? smcLevel : null;
    const base = level ? smcFamilyRate(level, hasSpouse, numChildren) : schedular;
    const k = Math.max(0, Math.min(3, numK || 0));
    if (!k) return base;
    const noK = ['O/P', 'R.1', 'R.2'];
    if (level && noK.includes(level)) return base;
    const capKey = (!level || level === 'S') ? 'L' : 'O/P';
    const cap = smcFamilyRate(capKey, hasSpouse, numChildren);
    return Math.min(base + k * SMC_RATES['K'].veteran, cap > 0 ? cap : Infinity);
}

/**
 * Calculate federal income tax using progressive brackets
 */
export function calcFederalTax(annualIncome, filingStatus) {
    const brackets = filingStatus === 'married'
        ? FEDERAL_BRACKETS_MFJ
        : FEDERAL_BRACKETS_SINGLE;
    const deduction = filingStatus === 'married'
        ? STANDARD_DEDUCTION.married
        : STANDARD_DEDUCTION.single;

    const taxableIncome = Math.max(0, annualIncome - deduction);
    let tax = 0;

    for (const bracket of brackets) {
        if (taxableIncome <= bracket.min) break;
        const taxable = Math.min(taxableIncome, bracket.max) - bracket.min;
        tax += taxable * bracket.rate;
    }
    return tax;
}

/**
 * Calculate state income tax
 */
export function calcStateTax(annualIncome, stateCode) {
    const state = STATE_TAX[stateCode];
    if (!state || state.type === 'none') return 0;

    if (state.type === 'flat') {
        return annualIncome * state.rate;
    }

    // Progressive brackets
    let tax = 0;
    for (const bracket of state.brackets) {
        if (annualIncome <= bracket.min) break;
        const taxable = Math.min(annualIncome, bracket.max) - bracket.min;
        tax += taxable * bracket.rate;
    }
    return tax;
}
