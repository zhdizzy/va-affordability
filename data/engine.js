/**
 * VA Affordability engine — pure functions, no DOM. Runs in node for tests.
 *
 * The core question is a SOLVE, not a formula: taxes and insurance scale with
 * price, so max price is circular. Each constraint is evaluated at a price and
 * the max is found by binary search. Four constraints:
 *   dti       — grossed-up qualifying income × cap  (gross-up APPLIES)
 *   residual  — actual cash left ≥ handbook table   (gross-up DOES NOT apply)
 *   entitlement — county limit when entitlement is partial (full = no VA cap)
 *   comfort   — housing ≤ comfortPct of actual gross income
 * approved = min(dti, residual, entitlement); comfortable = comfort.
 */
import { calcFederalTax, calcStateTax, vaMonthlyFor } from './tax-data.js';
import { stateTaxData } from './state-tax-data.js';
import { CLL_BASELINE_2026, HIGH_COST_COUNTIES } from './county-limits-2026.js';
import { regionFor, requiredResidual, MAINTENANCE_PER_SQFT, DTI_GUIDELINE,
         RESIDUAL_CUSHION_FOR_DTI_OVERRIDE } from './residual-income.js';
import { ASSUMPTIONS, READINESS, fundingFeeRate, ficaAnnual } from './underwriting.js';

export const CONSTRAINTS = ['dti', 'residual', 'entitlement', 'comfort'];

export function monthlyPI(loanAmount, annualRatePct, termYears) {
    const r = annualRatePct / 100 / 12;
    const n = termYears * 12;
    if (loanAmount <= 0) return 0;
    if (r === 0) return loanAmount / n;
    return loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// --- property tax (ported from va-loan, audited Aug 2026) -------------------
export function resolveExemption(sd, rating, hasPT) {
    for (const tier of (sd?.veteranExemption?.tiers || [])) {
        if (rating >= tier.minRating) {
            if (tier.requiresPT && !hasPT) continue;
            return tier;
        }
    }
    return { type: 'none', value: 0, description: sd?.veteranExemption?.defaultDescription || 'No exemption at this rating' };
}
function toMarketEquivalent(amount, tier, sd) {
    if (!amount) return 0;
    if ((tier.basis || 'market') !== 'assessed') return amount;
    const ratio = sd?.assessmentRatio;
    if (!ratio || ratio <= 0 || ratio > 1) return amount;
    return amount / ratio;
}
export function annualPropertyTax(price, sd, rating, hasPT) {
    if (!sd) return 0;
    const ex = resolveExemption(sd, rating, hasPT);
    let taxable = price;
    if (ex.type === 'full') taxable = 0;
    else if (ex.type === 'fixed_amount') {
        let amt = ex.value || 0;
        if (ex.prorated) amt *= rating / 100;
        taxable = Math.max(0, price - toMarketEquivalent(amt, ex, sd));
    } else if (ex.type === 'percentage') {
        let pct = ex.value || 0;
        if (ex.prorated) pct *= rating / 100;
        taxable = price * (1 - pct);
    }
    let tax = taxable * (sd.avgPropertyTaxRate || 0);
    if (ex.type === 'fixed_tax_credit') {
        let credit = ex.value || 0;
        if (ex.prorated) credit *= rating / 100;
        tax = Math.max(0, tax - credit);
    }
    return tax;
}

export function countyLimit(stateCode, county) {
    const st = HIGH_COST_COUNTIES[stateCode];
    if (st && county && st[county]) return st[county];
    return CLL_BASELINE_2026;
}

// --- income stack: dual-track --------------------------------------------
/**
 * @param {object} inc
 *  salaryAnnual, spouseAnnual (wages → FICA), pensionAnnual, otherTaxableAnnual,
 *  rating (0–100), hasSpouse, numChildren, vaMonthlyOverride (optional),
 *  bahMonthly, otherNonTaxableMonthly, stateCode, grossUpPct
 * @returns monthly figures; grossedUp feeds DTI, actualCash feeds residual.
 */
export function incomeStack(inc) {
    const wages = (inc.salaryAnnual || 0) + (inc.spouseAnnual || 0);
    const taxableAnnual = wages + (inc.pensionAnnual || 0) + (inc.otherTaxableAnnual || 0);
    const filing = inc.hasSpouse ? 'married' : 'single';
    const fed = calcFederalTax(taxableAnnual, filing);
    const state = calcStateTax(taxableAnnual, inc.stateCode);
    const fica = ficaAnnual(wages);
    const vaMonthly = inc.vaMonthlyOverride != null
        ? inc.vaMonthlyOverride
        : vaMonthlyFor(inc.rating || 0, !!inc.hasSpouse, inc.numChildren || 0);
    const nonTaxableMonthly = vaMonthly + (inc.bahMonthly || 0) + (inc.otherNonTaxableMonthly || 0);
    const grossUp = inc.grossUpPct ?? ASSUMPTIONS.grossUpPct;
    const taxableMonthly = taxableAnnual / 12;
    const netTaxableMonthly = (taxableAnnual - fed - state - fica) / 12;
    return {
        taxableMonthly,
        nonTaxableMonthly,
        vaMonthly,
        taxesMonthly: (fed + state + fica) / 12,
        bahMonthly: inc.bahMonthly || 0,
        grossActualMonthly: taxableMonthly + nonTaxableMonthly,          // comfort basis
        qualifyingMonthly: taxableMonthly + nonTaxableMonthly * (1 + grossUp), // DTI basis
        actualCashMonthly: netTaxableMonthly + nonTaxableMonthly,         // residual basis
        grossUpBonusMonthly: nonTaxableMonthly * grossUp,
        nonTaxableShare: taxableMonthly + nonTaxableMonthly > 0
            ? nonTaxableMonthly / (taxableMonthly + nonTaxableMonthly) : 0
    };
}

// --- evaluate one price -------------------------------------------------
/**
 * @param {number} price
 * @param {object} p  normalized params (see normalize())
 * @param {object} stack from incomeStack()
 */
export function evaluatePrice(price, p, stack) {
    const down = Math.min(price, p.downPayment || 0);
    const downPct = price > 0 ? down / price : 0;
    const feeRate = fundingFeeRate({ rating: p.rating, exemptOverride: p.feeExempt, subsequentUse: p.subsequentUse, downPct });
    const baseLoan = Math.max(0, price - down);
    const fee = baseLoan * feeRate;
    const loan = baseLoan + fee;
    const pi = monthlyPI(loan, p.rate, p.termYears);
    const sd = stateTaxData[p.stateCode];
    const propTax = annualPropertyTax(price, sd, p.rating, p.hasPT) / 12;
    const propTaxNoExemption = price * (sd?.avgPropertyTaxRate || 0) / 12;
    const ins = price * p.insuranceRate / 12;
    const hoa = p.hoaMonthly || 0;
    const piti = pi + propTax + ins + hoa;
    const maint = (p.sqft || 0) * MAINTENANCE_PER_SQFT;
    const debts = (p.monthlyDebts || 0);
    const childCare = p.childCareMonthly || 0;

    const dti = stack.qualifyingMonthly > 0 ? (piti + debts) / stack.qualifyingMonthly : Infinity;
    const residual = stack.actualCashMonthly - piti - maint - debts - childCare;
    const region = regionFor(p.stateCode);
    const required = region ? requiredResidual(region, p.familySize, loan) : null;
    const residualCushion = required ? (residual - required) / required : null;
    // Comfort basis: actual gross, minus BAH when the buyer is separating (lender counts
    // it today; it's gone at closing+1). Front-end = housing; back-end = housing + debts + child care.
    const comfortBasis = stack.grossActualMonthly - (p.comfortExcludesBah ? stack.bahMonthly : 0);
    const comfortRatio = comfortBasis > 0 ? piti / comfortBasis : Infinity;
    const backRatio = comfortBasis > 0 ? (piti + debts + childCare) / comfortBasis : Infinity;
    const backCap = p.comfortPct + READINESS.backEndSpread;
    const limit = p.entitlement === 'partial' ? countyLimit(p.stateCode, p.county) : Infinity;

    return {
        price, down, downPct, loan, fee, feeRate, pi, propTax, propTaxNoExemption, ins, hoa, piti, maint, debts, childCare,
        dti, residual, required, region, residualCushion, comfortRatio, backRatio, backCap, comfortBasis, countyLimit: limit,
        passes: {
            dti: dti <= p.dtiCap,
            residual: required == null ? true : residual >= required,
            entitlement: loan <= limit,
            comfort: comfortRatio <= p.comfortPct && backRatio <= backCap
        },
        // Handbook Ch.4 Topic 10 exceptions to "close scrutiny" over 41%
        flags: {
            over41: dti > DTI_GUIDELINE,
            cushion20: residualCushion != null && residualCushion >= RESIDUAL_CUSHION_FOR_DTI_OVERRIDE,
            taxFreeShare: stack.nonTaxableShare
        }
    };
}

function maxPriceFor(constraint, p, stack) {
    let lo = 0, hi = p.priceCeiling;
    if (!evaluatePrice(0, p, stack).passes[constraint]) return 0; // fails even at $0 (e.g. debts alone break DTI)
    if (evaluatePrice(hi, p, stack).passes[constraint]) return hi;
    for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if (evaluatePrice(mid, p, stack).passes[constraint]) lo = mid; else hi = mid;
    }
    return Math.floor(lo);
}

/** Comfort share after readiness tightening. Readiness never touches the lender tests. */
export function effectiveComfortPct(input) {
    const base = input.comfortPct ?? ASSUMPTIONS.comfortPct;
    const tier = READINESS.tierAdjust[input.readinessTier] || 0;
    const res = READINESS.reservesAdjust[input.reserves] || 0;
    return Math.max(READINESS.minComfortPct, base - tier - res);
}

/** Max price where a 10% dip erases no more than the exposure cap of net worth (Infinity if net worth unknown). */
export function exposureCapPrice(netWorth) {
    if (!netWorth || netWorth <= 0) return Infinity;
    return Math.floor(netWorth * READINESS.exposureCap / READINESS.dipAssumed);
}

export function normalize(input) {
    const hasSpouse = !!input.hasSpouse;
    const numChildren = Math.max(0, input.numChildren || 0);
    return {
        rating: input.rating || 0,
        hasPT: !!input.hasPT,
        hasSpouse, numChildren,
        familySize: input.familySize || (1 + (hasSpouse ? 1 : 0) + numChildren),
        stateCode: String(input.stateCode || '').toUpperCase(),
        county: input.county || null,
        entitlement: input.entitlement === 'partial' ? 'partial' : 'full',
        downPayment: input.downPayment || 0,
        subsequentUse: !!input.subsequentUse,
        feeExempt: !!input.feeExempt,
        rate: input.rate ?? ASSUMPTIONS.vaRate,
        termYears: input.termYears || ASSUMPTIONS.termYears,
        sqft: input.sqft || 0,
        hoaMonthly: input.hoaMonthly || 0,
        monthlyDebts: input.monthlyDebts || 0,
        childCareMonthly: input.childCareMonthly || 0,
        insuranceRate: input.insuranceRate ?? ASSUMPTIONS.insuranceRatePerYear,
        dtiCap: input.dtiCap ?? ASSUMPTIONS.dtiCap,
        comfortPct: effectiveComfortPct(input),
        comfortPctBase: input.comfortPct ?? ASSUMPTIONS.comfortPct,
        readinessTier: input.readinessTier || null,
        reserves: input.reserves || null,
        netWorth: input.netWorth || 0,
        comfortExcludesBah: !!input.comfortExcludesBah,
        grossUpPct: input.grossUpPct ?? ASSUMPTIONS.grossUpPct,
        priceCeiling: input.priceCeiling || ASSUMPTIONS.priceSearchCeiling
    };
}

/**
 * Full solve. Returns approved/comfortable prices, which constraint binds,
 * and the evaluated breakdown at each.
 */
export function solve(input) {
    const p = normalize(input);
    const stack = incomeStack({ ...input, hasSpouse: p.hasSpouse, numChildren: p.numChildren, stateCode: p.stateCode, grossUpPct: p.grossUpPct });
    const max = {};
    for (const c of CONSTRAINTS) max[c] = maxPriceFor(c, p, stack);
    const lenderSide = ['dti', 'residual', 'entitlement'];
    const approved = Math.min(...lenderSide.map(c => max[c]));
    const binding = lenderSide.find(c => max[c] === approved);
    const expCap = exposureCapPrice(p.netWorth);
    const comfortable = Math.min(max.comfort, approved, expCap);
    let comfortBinding = comfortable === approved ? 'approved' : comfortable === expCap && expCap < max.comfort ? 'exposure' : 'comfort';
    if (comfortBinding === 'comfort') {
        const evc = evaluatePrice(comfortable, p, stack);
        // Which half of 28/36 set it: if the back-end ratio is at its cap and front-end has slack, debts did it.
        if (evc.backRatio >= evc.backCap - 0.002 && evc.comfortRatio < p.comfortPct - 0.002) comfortBinding = 'back';
    }
    // Reference: what the same borrower gets with NO gross-up (shows the lever)
    const stackNoGrossUp = incomeStack({ ...input, hasSpouse: p.hasSpouse, numChildren: p.numChildren, stateCode: p.stateCode, grossUpPct: 0 });
    const dtiNoGrossUp = maxPriceFor('dti', p, stackNoGrossUp);
    return {
        params: p, stack, max, approved, comfortable, binding, comfortBinding, exposureCap: expCap,
        comfortTightened: p.comfortPct < p.comfortPctBase,
        gap: approved - comfortable,
        atApproved: evaluatePrice(approved, p, stack),
        atComfortable: evaluatePrice(comfortable, p, stack),
        grossUpPriceLift: Math.max(0, max.dti - dtiNoGrossUp),
        unassignedRegion: regionFor(p.stateCode) == null
    };
}

/**
 * Bridge from a target price (e.g. a pre-approval) to "comfortable": how much more
 * monthly gross income, OR how much less monthly debt, would make it comfortable.
 * Each is solved alone; null when no amount of that lever gets there.
 */
export function bridgeToComfort(targetPrice, input) {
    const baseline = solve(input);
    if (baseline.comfortable >= targetPrice) return { already: true, incomeNeededMonthly: 0, debtCutNeeded: 0 };
    let incomeNeededMonthly = null;
    { let lo = 0, hi = 50000, found = false;
      if (solve({ ...input, salaryAnnual: (input.salaryAnnual || 0) + hi * 12 }).comfortable >= targetPrice) {
        for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (solve({ ...input, salaryAnnual: (input.salaryAnnual || 0) + mid * 12 }).comfortable >= targetPrice) { hi = mid; found = true; } else lo = mid; }
        incomeNeededMonthly = found ? Math.ceil(hi) : null;
      } }
    let debtCutNeeded = null;
    const debts = input.monthlyDebts || 0;
    if (debts > 0 && solve({ ...input, monthlyDebts: 0 }).comfortable >= targetPrice) {
        let lo = 0, hi = debts;
        for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (solve({ ...input, monthlyDebts: debts - mid }).comfortable >= targetPrice) hi = mid; else lo = mid; }
        debtCutNeeded = Math.ceil(hi);
    }
    return { already: false, incomeNeededMonthly, debtCutNeeded };
}

/** Max price for a given monthly housing payment budget (friend's "recommended monthly" framing). */
export function priceForPayment(monthlyBudget, input) {
    const p = normalize(input);
    const stack = incomeStack({ ...input, hasSpouse: p.hasSpouse, numChildren: p.numChildren, stateCode: p.stateCode });
    let lo = 0, hi = p.priceCeiling;
    for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if (evaluatePrice(mid, p, stack).piti <= monthlyBudget) lo = mid; else hi = mid;
    }
    return Math.floor(lo);
}
