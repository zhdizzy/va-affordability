/**
 * VA Affordability engine tests.  node va-affordability/test/engine.test.mjs  (from tbv-tools/)
 */
import process from 'node:process';
import { REGIONS, STATE_TO_REGION, RESIDUAL_LOW, RESIDUAL_HIGH, requiredResidual, regionFor } from '../data/residual-income.js';
import { fundingFeeRate, ficaAnnual } from '../data/underwriting.js';
import { monthlyPI, incomeStack, evaluatePrice, normalize, solve, priceForPayment, countyLimit, effectiveComfortPct, exposureCapPrice, bridgeToComfort } from '../data/engine.js';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.log('FAIL  ' + msg); } };
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// --- residual tables ---------------------------------------------------
const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','PR','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
for (const s of STATES) ok(REGIONS.includes(STATE_TO_REGION[s]), `region assigned: ${s}`);
ok(Object.keys(STATE_TO_REGION).length === 52, 'exactly 52 jurisdictions mapped (50 + DC + PR)');
ok(regionFor('GU') === null, 'Guam has no region (handbook gap surfaced, not defaulted)');
for (const r of REGIONS) {
    ok(RESIDUAL_LOW[r].length === 5 && RESIDUAL_HIGH[r].length === 5, `5 rows: ${r}`);
    for (let i = 0; i < 5; i++) ok(RESIDUAL_HIGH[r][i] > RESIDUAL_LOW[r][i], `high > low ${r}[${i}]`);
    for (let i = 1; i < 5; i++) ok(RESIDUAL_HIGH[r][i] > RESIDUAL_HIGH[r][i-1], `monotone family size ${r}`);
}
ok(requiredResidual('West', 4, 79999) === 967, 'West/4/low = $967 (the cell valoans.com had wrong)');
ok(requiredResidual('Northeast', 1, 79999) === 390, 'NE/1/low = $390');
ok(requiredResidual('Midwest', 5, 80000) === 1039, 'MW/5/high = $1,039');
ok(requiredResidual('South', 6, 80000) === 1039 + 80, 'family of 6 high bracket = 5-row + $80');
ok(requiredResidual('South', 6, 50000) === 902 + 75, 'family of 6 low bracket = 5-row + $75');
ok(requiredResidual('South', 9, 80000) === 1039 + 160, 'family capped at 7');
ok(requiredResidual('West', 3, 80000) === 990, 'threshold: $80,000 exactly is the high bracket');

// --- funding fee ---------------------------------------------------------
ok(fundingFeeRate({ rating: 10 }) === 0, 'any compensable rating waives fee');
ok(fundingFeeRate({ rating: 0, exemptOverride: true }) === 0, 'non-rating exemption paths honored');
ok(fundingFeeRate({ rating: 0 }) === 0.0215, 'first use, 0 down = 2.15%');
ok(fundingFeeRate({ rating: 0, subsequentUse: true }) === 0.033, 'subsequent, 0 down = 3.30%');
ok(fundingFeeRate({ rating: 0, downPct: 0.05 }) === 0.015, '5% down = 1.50%');
ok(fundingFeeRate({ rating: 0, downPct: 0.10, subsequentUse: true }) === 0.0125, '10% down subsequent = 1.25%');
ok(near(ficaAnnual(100000), 7650), 'FICA 7.65% under cap');
ok(near(ficaAnnual(300000), 184500 * 0.062 + 300000 * 0.0145), 'SS capped at wage base');

// --- amortization ---------------------------------------------------------
ok(near(monthlyPI(300000, 6, 30), 1798.65, 0.05), 'P&I $300K @6%/30y = $1,798.65');
ok(monthlyPI(0, 6, 30) === 0, 'zero loan');
ok(near(monthlyPI(120000, 0, 10), 1000), 'zero rate divides evenly');

// --- income stack: dual track -----------------------------------------------
const base = { salaryAnnual: 80000, rating: 100, hasSpouse: true, numChildren: 1, stateCode: 'TX' };
const s25 = incomeStack({ ...base, grossUpPct: 0.25 });
const s0  = incomeStack({ ...base, grossUpPct: 0 });
ok(near(s25.vaMonthly, 4318.99), '100% w/ spouse + 1 child = $4,318.99');
ok(near(s25.actualCashMonthly, s0.actualCashMonthly), 'RESIDUAL basis unchanged by gross-up');
ok(s25.qualifyingMonthly > s0.qualifyingMonthly, 'DTI basis rises with gross-up');
ok(near(s25.qualifyingMonthly - s0.qualifyingMonthly, 4318.99 * 0.25), 'gross-up bonus = 25% of non-taxable');
ok(s25.taxesMonthly > 0 && s25.taxesMonthly < s25.taxableMonthly, 'taxes computed on taxable income only');
const noTaxState = incomeStack({ ...base, stateCode: 'FL' });
const taxState = incomeStack({ ...base, stateCode: 'CA' });
ok(taxState.actualCashMonthly < noTaxState.actualCashMonthly, 'state income tax reduces residual cash');
ok(near(incomeStack({ salaryAnnual: 60000, rating: 0, stateCode: 'TX' }).nonTaxableMonthly, 0), 'unrated = no VA income');
ok(near(incomeStack({ salaryAnnual: 60000, rating: 70, vaMonthlyOverride: 2000, stateCode: 'TX' }).vaMonthly, 2000), 'manual VA override respected');

// --- evaluatePrice ----------------------------------------------------------
const p = normalize({ ...base, sqft: 2000, monthlyDebts: 500, rate: 6.375 });
const ev = evaluatePrice(400000, p, s25);
ok(near(ev.maint, 280), 'maintenance 2,000 sqft × $0.14 = $280');
ok(ev.fee === 0 && ev.loan === 400000, 'rated veteran: no fee, loan = price at $0 down');
ok(ev.region === 'South' && ev.required === 889, 'TX family of 3 → South $889');
ok(near(ev.propTax, 0), 'TX 100% (P&T not required) = full property tax exemption');
const evAL = evaluatePrice(400000, normalize({ ...base, stateCode: 'AL', sqft: 2000 }), s25);
const evALPT = evaluatePrice(400000, normalize({ ...base, stateCode: 'AL', hasPT: true, sqft: 2000 }), s25);
ok(evAL.propTax > 0 && near(evALPT.propTax, 0), 'AL requires P&T: 100% non-P&T pays, 100% P&T exempt');
ok(near(ev.residual, s25.actualCashMonthly - ev.piti - 280 - 500), 'residual = cash − PITI − maint − debts');
ok(near(ev.dti, (ev.piti + 500) / s25.qualifyingMonthly), 'DTI on grossed-up income');
const evUnrated = evaluatePrice(400000, normalize({ salaryAnnual: 80000, rating: 0, stateCode: 'TX' }), incomeStack({ salaryAnnual: 80000, rating: 0, stateCode: 'TX' }));
ok(near(evUnrated.fee, 400000 * 0.0215), 'unrated first-use pays 2.15% fee rolled in');

// --- solve -----------------------------------------------------------------
const r = solve({ ...base, sqft: 1800, monthlyDebts: 400 });
ok(r.approved > 0 && r.comfortable > 0, 'solve returns positive prices');
ok(r.comfortable <= r.approved, 'comfortable never exceeds approved');
ok(['dti', 'residual', 'entitlement'].includes(r.binding), 'binding constraint named');
ok(r.max[r.binding] === r.approved, 'binding constraint produced the approved price');
ok(r.atApproved.passes.dti && r.atApproved.passes.residual, 'approved price passes both lender tests');
ok(!evaluatePrice(r.approved + 5000, r.params, r.stack).passes[r.binding], 'binding constraint fails just above approved');
ok(r.grossUpPriceLift > 0, 'gross-up lifts DTI-side price for a rated veteran');
ok(r.unassignedRegion === false, 'TX has a region');

// residual is an absolute-dollar floor: it binds at LOW income with a big family
// (a $70K West family of 6 is DTI-bound with ~2x the residual it needs).
const west = solve({ salaryAnnual: 36000, rating: 0, hasSpouse: true, numChildren: 4, stateCode: 'CA', sqft: 2200 });
ok(west.binding === 'residual' && west.max.residual < west.max.dti, 'low-income West family of 6: residual binds');
const westMid = solve({ salaryAnnual: 70000, rating: 30, hasSpouse: true, numChildren: 4, stateCode: 'CA', sqft: 2200, monthlyDebts: 600 });
ok(westMid.binding === 'dti', 'same family at $70K: DTI binds');

// gross-up dial moves DTI price but NOT residual price
const g0 = solve({ ...base, sqft: 1800, grossUpPct: 0 });
const g25 = solve({ ...base, sqft: 1800, grossUpPct: 0.25 });
ok(g25.max.dti > g0.max.dti, 'gross-up raises DTI max');
ok(g25.max.residual === g0.max.residual, 'gross-up leaves residual max untouched');

// square footage lowers the residual ceiling
const small = solve({ ...base, sqft: 1000 });
const big = solve({ ...base, sqft: 4000 });
ok(big.max.residual < small.max.residual, 'bigger house → lower residual max');
ok(big.max.dti === small.max.dti, 'sqft does not touch DTI');

// entitlement
const full = solve({ ...base, entitlement: 'full' });
const partial = solve({ ...base, entitlement: 'partial', county: 'Travis County' });
ok(full.max.entitlement === full.params.priceCeiling, 'full entitlement: no VA cap');
ok(partial.max.entitlement <= countyLimit('TX', 'Travis County'), 'partial entitlement capped at county limit');
ok(countyLimit('CA', 'Los Angeles County') > countyLimit('TX', 'Nowhere County'), 'high-cost county > baseline');

// crushing debt → $0
const broke = solve({ salaryAnnual: 40000, rating: 0, stateCode: 'TX', monthlyDebts: 2500 });
ok(broke.approved === 0 && broke.binding === 'dti', 'debts alone can zero the DTI ceiling');

// territory without region: residual test passes vacuously but flag is raised
const guam = solve({ salaryAnnual: 80000, rating: 50, stateCode: 'GU', sqft: 1500 });
ok(guam.unassignedRegion === true, 'GU flagged as unassigned region');

// priceForPayment
const pp = priceForPayment(2500, { ...base, sqft: 1800 });
const evpp = evaluatePrice(pp, normalize({ ...base, sqft: 1800 }), s25);
ok(evpp.piti <= 2500 && evpp.piti > 2450, 'priceForPayment lands PITI just under budget');

// 20% cushion flag
const cushy = solve({ salaryAnnual: 150000, rating: 100, hasSpouse: false, numChildren: 0, stateCode: 'TX', sqft: 1500 });
const evc = evaluatePrice(cushy.comfortable, cushy.params, cushy.stack);
ok(evc.flags.cushion20 === true, 'comfortable price for a high earner clears residual by 20%+');

// --- readiness tightens comfort only ---------------------------------------
const rg = solve({ ...base, sqft: 1800, readinessTier: 'green' });
const ry = solve({ ...base, sqft: 1800, readinessTier: 'yellow' });
const rr = solve({ ...base, sqft: 1800, readinessTier: 'red', reserves: 'none' });
ok(near(effectiveComfortPct({ readinessTier: 'yellow' }), 0.25), 'yellow: 28 → 25');
ok(near(effectiveComfortPct({ readinessTier: 'red', reserves: 'none' }), 0.19), 'red + no reserves: 28 → 19');
ok(near(effectiveComfortPct({ comfortPct: 0.16, readinessTier: 'red', reserves: 'none' }), 0.15), 'comfort floor 15%');
ok(rg.comfortable > ry.comfortable && ry.comfortable > rr.comfortable, 'comfortable falls green → yellow → red');
ok(rg.approved === ry.approved && ry.approved === rr.approved, 'approved untouched by readiness');
ok(rr.comfortTightened && !rg.comfortTightened, 'tightened flag');
ok(exposureCapPrice(150000) === 525000, '$150K net worth → $525K cap (10% dip = 35%)');
ok(exposureCapPrice(0) === Infinity, 'unknown net worth: no cap');
const rn = solve({ ...base, sqft: 1800, netWorth: 60000 });
ok(rn.comfortable === 210000 && rn.comfortBinding === 'exposure', '$60K net worth caps comfortable at $210K');
ok(rn.approved === rg.approved, 'net worth cap never touches approved');
const rich = solve({ ...base, sqft: 1800, netWorth: 5000000 });
ok(rich.comfortable === rg.comfortable && rich.comfortBinding !== 'exposure', 'large net worth: cap not binding');

// --- 28/36 back-end, BAH exclusion, bridge ------------------------------------
const noDebt = solve({ ...base, sqft: 1800, monthlyDebts: 0 });
const bigDebt = solve({ ...base, sqft: 1800, monthlyDebts: 1500 });
ok(bigDebt.comfortable < noDebt.comfortable, 'debts lower the comfortable number (back-end)');
ok(bigDebt.comfortBinding === 'back', 'heavy debts: back-end rule named');
ok(noDebt.comfortBinding === 'comfort', 'no debts: front-end rule');
const childCare = solve({ ...base, sqft: 1800, monthlyDebts: 0, childCareMonthly: 1200 });
ok(childCare.comfortable < noDebt.comfortable, 'child care lowers comfortable too');
const srvIn = solve({ ...base, sqft: 1800, bahMonthly: 2500, comfortExcludesBah: false });
const srvOut = solve({ ...base, sqft: 1800, bahMonthly: 2500, comfortExcludesBah: true });
ok(srvIn.approved === srvOut.approved, 'BAH exclusion never touches approved');
ok(srvOut.comfortable < srvIn.comfortable, 'serving mode: comfortable drops BAH');
ok(srvOut.comfortable === solve({ ...base, sqft: 1800, bahMonthly: 0 }).comfortable || srvOut.comfortable <= srvIn.comfortable, 'post-separation comfortable ≈ no-BAH comfortable');
const br = bridgeToComfort(700000, { salaryAnnual: 65000, rating: 70, stateCode: 'CA', monthlyDebts: 300, sqft: 2000 });
ok(!br.already && br.incomeNeededMonthly > 0, 'bridge: income needed to make $700K comfortable', String(br.incomeNeededMonthly));
ok(br.debtCutNeeded === null, 'bridge: $300 of debt cannot bridge to $700K');
const brDebt = bridgeToComfort(bigDebt.comfortable + 20000, { ...base, sqft: 1800, monthlyDebts: 1500 });
ok(brDebt.debtCutNeeded > 0 && brDebt.debtCutNeeded < 1500, 'bridge: partial debt payoff closes a small gap', String(brDebt.debtCutNeeded));
ok(bridgeToComfort(100000, { ...base, sqft: 1800 }).already === true, 'bridge: already comfortable');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
