// VA Affordability Calculator — UI wiring. Engine stays pure; this renders.
import { solve, evaluatePrice, normalize, incomeStack, bridgeToComfort } from './data/engine.js';
import { regionFor, RESIDUAL_HIGH, MAINTENANCE_PER_SQFT } from './data/residual-income.js';
import { ASSUMPTIONS, READINESS } from './data/underwriting.js';
import { HIGH_COST_COUNTIES, CLL_BASELINE_2026 } from './data/county-limits-2026.js';
import { stateTaxData } from './data/state-tax-data.js';

const $ = id => document.getElementById(id);
const fmtUSD = n => '$' + Math.round(n).toLocaleString('en-US');
const fmtK = n => n >= 1000000 ? '$' + (n / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M' : '$' + Math.round(n / 1000) + 'K';
const pct = x => (x * 100).toFixed(0) + '%';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (el, fallback = 0) => { const v = parseFloat(el.value); return Number.isFinite(v) ? v : fallback; };

const state = { mode: 'shop', revealed: false, last: null };

/* ─── States ────────────────────────────────────────────────────────────── */
const STATES = [['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['DC','District of Columbia'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],['PR','Puerto Rico'],['GU','Guam'],['VI','U.S. Virgin Islands'],['AS','American Samoa'],['MP','Northern Mariana Islands']];
$('state').innerHTML = STATES.map(([c, n]) => `<option value="${c}"${c === 'TX' ? ' selected' : ''}>${n}</option>`).join('');

/* ─── Elements ─────────────────────────────────────────────────────────── */
const salaryEl = $('salary'), ratingEl = $('rating'), ptEl = $('pt'), marriedEl = $('married'), childrenEl = $('children');
const spouseEl = $('spouse-income'), bahEl = $('bah'), stateEl = $('state'), debtsEl = $('debts'), preEl = $('preapproved');
const downEl = $('down'), sqftEl = $('sqft'), entEl = $('entitlement'), countyEl = $('county'), hoaEl = $('hoa');
const rateEl = $('rate'), termEl = $('term'), dtiEl = $('dti-cap'), comfortEl = $('comfort-pct'), grossupEl = $('grossup');
const insEl = $('insurance'), feeEl = $('fee-exempt'), pensionEl = $('pension'), otherTaxEl = $('other-taxable');
const otherNonEl = $('other-nontax'), childcareEl = $('childcare'), vaOverrideEl = $('va-override'), networthEl = $('networth');

/* ─── Mode pills (reshape the tool) ────────────────────────────────────── */
const MODE_BRIEF = {
  shop: 'We\'ll run the same two tests your lender runs, then put a comfortable number next to the approved one. Enter your real income, including your rating. The rating matters more than most veterans think.',
  preapproved: 'Pre-approval is a ceiling, not advice. Enter the number they gave you and we\'ll show what that payment does to your month, next to the number that leaves you room to live.',
  serving: 'Lenders count BAH while you\'re in and drop it the day you separate. We\'ll show both numbers so you don\'t shop on an income that\'s about to disappear. Job tenure after separation matters too.',
  ready: 'Most veterans CAN qualify. Whether you SHOULD is a life-stage question: reserves, job tenure, where you\'ll be in three years. Seven honest answers first, then the math.',
};
function setMode(m, opts = {}) {
  state.mode = m;
  document.querySelectorAll('.mode-pill').forEach(p => p.classList.toggle('active', p.dataset.mode === m));
  $('mode-briefing').textContent = MODE_BRIEF[m];
  $('field-preapproved').hidden = m !== 'preapproved';
  $('field-bah').hidden = m !== 'serving';
  if (m !== 'serving') bahEl.value = '';
  if (m === 'ready') $('readiness-drawer').open = true;
  else if (!opts.keepDrawers) $('readiness-drawer').open = false;
  $('compare-btn').textContent = m === 'preapproved' ? 'Compare My Pre-Approval →' : m === 'ready' ? 'Am I Ready? Show Me →' : 'Show Me My Two Numbers →';
  syncConditionalFields();
  if (state.revealed) reveal({ silent: true });
  updateLiveStrip();
}
document.querySelectorAll('.mode-pill').forEach(p => p.addEventListener('click', () => {
  setMode(p.dataset.mode);
  if (isTourActive() && tourState.steps[tourState.i]?.id === 'pills') showTourStep(tourState.i + 1);
}));

/* ─── Conditional fields ───────────────────────────────────────────────── */
function fillCounties() {
  const st = HIGH_COST_COUNTIES[stateEl.value] || {};
  const names = Object.keys(st).sort();
  countyEl.innerHTML = `<option value="">My county isn't listed (standard limit ${fmtUSD(CLL_BASELINE_2026)})</option>` +
    names.map(n => `<option value="${esc(n)}">${esc(n)} — ${fmtUSD(st[n])}</option>`).join('');
}
function syncConditionalFields() {
  $('field-spouse').hidden = marriedEl.value !== 'yes';
  $('field-county').hidden = entEl.value !== 'partial';
  const sd = stateTaxData[stateEl.value];
  const region = regionFor(stateEl.value);
  $('state-hint').innerHTML = region
    ? `VA residual region: <strong>${region}</strong>. ${sd ? 'State income tax and your veteran property tax exemption applied.' : 'No property tax data for this jurisdiction; property tax modeled at $0.'}`
    : `<strong>Heads up:</strong> the VA Lender's Handbook assigns no residual-income region to this territory. We skip that test here; confirm the figure your lender uses.`;
}
stateEl.addEventListener('change', () => { fillCounties(); syncConditionalFields(); });
[marriedEl, entEl].forEach(el => el.addEventListener('change', syncConditionalFields));
fillCounties();

/* ─── Readiness questions ──────────────────────────────────────────────── */
const RQ = [
  { id: 'stage', q: 'Where are you in your military-to-civilian timeline?', opts: [['Out 2+ years', 0], ['Out under 2 years', 1], ['Separating within 12 months', 2], ['Still in, no date yet', 2]] },
  { id: 'job', q: 'How long in your current job?', opts: [['2+ years', 0], ['1–2 years', 1], ['Under 1 year', 2], ['Starting soon / between jobs', 3], ['Self-employed', 2]] },
  { id: 'geo', q: 'Will you be in the same area in 3 years?', opts: [['Certain', 0], ['Probably', 1], ['Real chance I move', 3], ['No idea', 4]] },
  { id: 'family', q: 'What do the next 2 years look like at home?', opts: [['Stable', 0], ['Growing family', 1], ['Spouse career in motion', 1], ['Big changes possible', 2]] },
  { id: 'reserves', q: 'After down payment and closing costs, months of expenses left in savings?', opts: [['6+', 0], ['3–6', 1], ['1–3', 2], ['None', 4]] },
  { id: 'income', q: 'Is your income steady or variable?', opts: [['Steady salary (VA comp counts as steady)', 0], ['Mix', 1], ['Mostly commission / gig / contract', 2]] },
  { id: 'why', q: 'What\'s driving the timing?', opts: [['Genuinely ready and planned', 0], ['Found the right place', 0], ['Rent feels like throwing money away', 2], ['Family pressure', 2], ['Market FOMO', 3], ['Fresh start after PCS-style move', 1]] },
];
$('readiness-questions').innerHTML = RQ.map(r => `
  <div class="rq" id="rq-${r.id}"><p>${esc(r.q)}</p><div class="rq-opts">
    ${r.opts.map(([label, score], i) => `<label><input type="radio" name="rq-${r.id}" value="${i}" data-score="${score}">${esc(label)}</label>`).join('')}
  </div></div>`).join('');
function readinessAnswers() {
  const out = {};
  for (const r of RQ) {
    const sel = document.querySelector(`input[name="rq-${r.id}"]:checked`);
    if (sel) out[r.id] = { i: +sel.value, score: +sel.dataset.score, label: r.opts[+sel.value][0], q: r.q };
  }
  return out;
}
function scoreReadiness(ans) {
  const answered = Object.keys(ans).length;
  if (answered < RQ.length) return { complete: false, answered };
  const total = Object.values(ans).reduce((s, a) => s + a.score, 0);
  const tier = total <= 4 ? 'green' : total <= 9 ? 'yellow' : 'red';
  const flags = Object.entries(ans).filter(([, a]) => a.score >= 2).sort((a, b) => b[1].score - a[1].score);
  return { complete: true, total, tier, flags };
}
// TBV definition, stated in the panel: the share of net worth a 10% dip in home value would erase.
function exposure(price, networth) {
  if (!networth || networth <= 0) return { pct: null, band: 'unknown' };
  const p = (price * 0.10) / networth;
  const band = p < 0.15 ? 'comfortable' : p < 0.35 ? 'stretched' : p < 0.75 ? 'exposed' : 'danger';
  return { pct: p, band };
}

/* ─── Inputs → engine ──────────────────────────────────────────────────── */
function buildInput() {
  const rating = ratingEl.value === 'tdiu' ? 100 : parseInt(ratingEl.value, 10) || 0;
  const hasSpouse = marriedEl.value === 'yes';
  const vaOverride = vaOverrideEl.value.trim() === '' ? null : num(vaOverrideEl);
  return {
    salaryAnnual: num(salaryEl), spouseAnnual: hasSpouse ? num(spouseEl) : 0,
    pensionAnnual: num(pensionEl), otherTaxableAnnual: num(otherTaxEl),
    rating, hasPT: ptEl.value === 'yes', hasSpouse, numChildren: parseInt(childrenEl.value, 10) || 0,
    vaMonthlyOverride: vaOverride, bahMonthly: state.mode === 'serving' ? num(bahEl) : 0,
    otherNonTaxableMonthly: num(otherNonEl), stateCode: stateEl.value,
    county: entEl.value === 'partial' ? (countyEl.value || null) : null,
    entitlement: entEl.value === 'partial' ? 'partial' : 'full',
    subsequentUse: entEl.value !== 'full',
    feeExempt: feeEl.value === 'exempt',
    downPayment: num(downEl), sqft: num(sqftEl, 1800), hoaMonthly: num(hoaEl),
    monthlyDebts: num(debtsEl), childCareMonthly: num(childcareEl),
    rate: num(rateEl, ASSUMPTIONS.vaRate), termYears: parseInt(termEl.value, 10) || 30,
    dtiCap: num(dtiEl, 41) / 100, comfortPct: num(comfortEl, 28) / 100,
    grossUpPct: num(grossupEl, 25) / 100, insuranceRate: num(insEl, 0.65) / 100,
    ...readinessInput(),
    // Serving: lender counts BAH today; the comfortable number is the post-separation one.
    comfortExcludesBah: state.mode === 'serving',
  };
}
// Readiness feeds the COMFORT ceiling only: tier and reserves tighten the share,
// net worth caps the price so a 10% dip erases ≤35% of it. Lender math untouched.
function readinessInput() {
  const ans = readinessAnswers();
  const sc = scoreReadiness(ans);
  const resIdx = ans.reserves ? ans.reserves.i : null; // 0:6+, 1:3–6, 2:1–3, 3:none
  return {
    readinessTier: sc.complete ? sc.tier : null,
    reserves: resIdx === 3 ? 'none' : resIdx === 2 ? 'low' : null,
    netWorth: num(networthEl),
  };
}
const run = () => solve(buildInput());

/* ─── VA comp line + live strip ────────────────────────────────────────── */
let liveTimer = null;
function updateLiveStrip() {
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => {
    const inp = buildInput();
    const p = normalize(inp);
    const s = incomeStack({ ...inp, hasSpouse: p.hasSpouse, numChildren: p.numChildren, stateCode: p.stateCode, grossUpPct: p.grossUpPct });
    const compLine = $('va-comp-line');
    if (inp.rating > 0) {
      compLine.hidden = false;
      compLine.innerHTML = `Tax-free VA compensation: <strong>${fmtUSD(s.vaMonthly)}/mo</strong> — lenders count it as <strong>${fmtUSD(s.vaMonthly * (1 + p.grossUpPct))}/mo</strong> of qualifying income after the ${pct(p.grossUpPct)} gross-up.`;
    } else compLine.hidden = true;
    const el = $('live-strip');
    if (s.grossActualMonthly <= 0) { el.innerHTML = '<strong>Required to run:</strong> a salary or a VA rating (either one). Your qualifying number builds here as you type.' + (state.mode === 'preapproved' && num(preEl) <= 0 ? ' Pre-approved mode also needs the amount you were quoted.' : ''); return; }
    if (state.mode === 'preapproved' && num(preEl) <= 0) { el.innerHTML = `Qualifying income so far: <strong>${fmtUSD(s.qualifyingMonthly)}/mo</strong> · <strong>Still required:</strong> the amount you were pre-approved for (the field marked required).`; return; }
    const parts = [`Qualifying income so far: <strong>${fmtUSD(s.qualifyingMonthly)}/mo</strong>`];
    if (s.grossUpBonusMonthly > 0) parts.push(`<span class="lift">+${fmtUSD(s.grossUpBonusMonthly)}/mo</span> of that is the gross-up on your tax-free income`);
    parts.push(`real cash after taxes: <strong>${fmtUSD(s.actualCashMonthly)}/mo</strong>`);
    el.innerHTML = parts.join(' · ') + ' — press the button for your two numbers.';
  }, 150);
}
document.querySelectorAll('#calc-form input, #calc-form select').forEach(el => {
  el.addEventListener('input', updateLiveStrip);
  el.addEventListener('change', updateLiveStrip);
});

/* ─── Validation (novalidate + JS, house rule) ─────────────────────────── */
function hasIncome(inp) {
  return (inp.salaryAnnual + inp.spouseAnnual + inp.pensionAnnual + inp.otherTaxableAnnual + inp.bahMonthly + inp.otherNonTaxableMonthly) > 0 || inp.rating > 0;
}
function clearMissing() {
  document.querySelectorAll('.field-missing, .field-error').forEach(el => el.classList.remove('field-missing', 'field-error'));
}
// Returns { message, focusEl } for the FIRST missing required input, marking every missing one.
function validate() {
  const inp = buildInput();
  clearMissing();
  let first = null, msgs = [];
  if (!hasIncome(inp)) {
    salaryEl.closest('.fg-field').classList.add('field-missing');
    ratingEl.closest('.fg-field').classList.add('field-missing');
    $('card-income').classList.add('field-missing');
    salaryEl.classList.add('field-error');
    first = first || salaryEl;
    msgs.push('Required: enter a salary OR pick a VA rating (the two red fields). One of them is enough.');
  }
  if (state.mode === 'preapproved' && num(preEl) <= 0) {
    preEl.closest('.fg-field').classList.add('field-missing');
    preEl.classList.add('field-error');
    first = first || preEl;
    msgs.push('Required in this mode: the amount you were pre-approved for.');
  }
  return { message: msgs.join(' '), focusEl: first };
}
// Clear the red ring as soon as the user fixes the field
[salaryEl, ratingEl, preEl, spouseEl, pensionEl, otherTaxEl, otherNonEl, bahEl].forEach(el => el.addEventListener('input', () => { if (hasIncome(buildInput())) { ['card-income'].forEach(id => $(id).classList.remove('field-missing')); salaryEl.closest('.fg-field').classList.remove('field-missing'); ratingEl.closest('.fg-field').classList.remove('field-missing'); salaryEl.classList.remove('field-error'); $('form-error').textContent = ''; } }));
preEl.addEventListener('input', () => { if (num(preEl) > 0) { preEl.closest('.fg-field').classList.remove('field-missing'); preEl.classList.remove('field-error'); $('form-error').textContent = ''; } });

/* ─── Submit gate ──────────────────────────────────────────────────────── */
$('calc-form').addEventListener('submit', e => { e.preventDefault(); reveal(); });
function reveal(opts = {}) {
  const v = validate();
  $('form-error').textContent = v.message;
  if (v.message) { if (!isTourActive()) v.focusEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); v.focusEl.focus({ preventScroll: true }); return; }
  const r = run();
  state.last = r;
  renderHero(r);
  renderResults(r);
  state.revealed = true;
  $('hero-verdict').style.display = 'block';
  $('hero-capture').style.display = 'block';
  $('results-container').style.display = 'block';
  $('action-bar').style.display = 'flex';
  if (opts.silent) return;
  if (typeof gtag === 'function') gtag('event', 'show_results', { mode: state.mode, binding: r.binding });
  if (isTourActive() && tourState.steps[tourState.i]?.id === 'gate') endTour();
  if (!isTourActive()) $('hero-verdict').scrollIntoView({ behavior: 'smooth', block: 'start' });
  let resultsSeen = true;
  try { resultsSeen = localStorage.getItem(RESULTS_TOUR_KEY) === '1'; } catch {}
  if (!resultsSeen && !window.__vaAffArrivalHadParams) setTimeout(() => startTourWith(RESULTS_TOUR, RESULTS_TOUR_KEY), 800);
}
$('retake-btn').addEventListener('click', () => {
  state.revealed = false;
  ['hero-verdict', 'hero-capture', 'results-container'].forEach(id => $(id).style.display = 'none');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ─── Hero ─────────────────────────────────────────────────────────────── */
const BIND_LABEL = { dti: 'debt-to-income', residual: 'VA residual income', entitlement: 'your county loan limit (partial entitlement)', comfort: 'your comfort budget' };
const BIND_WHY = {
  dti: 'Your debts plus the housing payment hit the DTI guideline before anything else did. Paying down a monthly debt raises this ceiling fastest.',
  residual: 'You clear DTI, but the VA\'s real-cash test caps you first: after taxes, debts, housing, and upkeep, the handbook says your household needs a minimum left over. This is the rule most calculators skip, and it\'s why the number below may be lower than a lender\'s quick quote.',
  entitlement: 'With an active VA loan, your remaining entitlement caps the $0-down amount at your county limit. A down payment on the gap, or restoring entitlement, moves this.',
};

function renderHero(r) {
  const el = $('hero-verdict');
  const a = r.atApproved, c = r.atComfortable;
  const gapMo = a.piti - c.piti;
  const pre = state.mode === 'preapproved' ? num(preEl) : 0;
  const preEv = pre > 0 ? evaluatePrice(pre, r.params, r.stack) : null;

  let kicker, line;
  if (preEv) {
    const over = pre > r.comfortable;
    kicker = 'Your pre-approval vs. your real number';
    line = over
      ? `They approved you for <strong>${fmtUSD(pre)}</strong>. That's a <strong>${fmtUSD(preEv.piti)}/mo</strong> payment${preEv.residual < (preEv.required || 0) ? ' that fails the VA\'s own residual test' : ''}. The number that leaves you room to live is <strong>${fmtUSD(r.comfortable)}</strong>, about <strong>${fmtUSD(preEv.piti - c.piti)}/mo</strong> less every month for ${r.params.termYears} years.`
      : `Your pre-approval of <strong>${fmtUSD(pre)}</strong> is at or under your comfortable number of <strong>${fmtUSD(r.comfortable)}</strong>. Good sign. The lender math would go to <strong>${fmtUSD(r.approved)}</strong>; you don't have to.`;
  } else if (r.approved <= 0) {
    kicker = 'The honest read';
    line = `On these inputs the lender math doesn't clear at any price — ${r.binding === 'dti' ? 'your monthly debts alone exceed the DTI guideline' : 'your household doesn\'t clear the VA residual floor before a house payment'}. That's a fixable position, not a verdict. See the ceilings below for what moves it.`;
  } else {
    kicker = 'Your two numbers';
    line = `A lender's math approves up to <strong>${fmtUSD(r.approved)}</strong>. A comfortable number is <strong>${fmtUSD(r.comfortable)}</strong>. The gap is <strong>${fmtUSD(gapMo)}/mo</strong>, every month, for ${r.params.termYears} years.`;
  }

  const cards = `<div class="two-num">
    <div class="num-card"><span class="nc-label">Lender's ceiling (approved)</span><span class="nc-amount">${fmtUSD(r.approved)}</span><span class="nc-sub">${fmtUSD(a.piti)}/mo · set by ${BIND_LABEL[r.binding]}</span></div>
    <div class="num-card comfortable"><span class="nc-label">Comfortable</span><span class="nc-amount">${fmtUSD(r.comfortable)}</span><span class="nc-sub">${fmtUSD(c.piti)}/mo · housing ≤ ${pct(r.params.comfortPct)}, all obligations ≤ ${pct(r.params.comfortPct + READINESS.backEndSpread)} of gross${state.mode === 'serving' && r.stack.bahMonthly > 0 ? ' (BAH excluded — your post-separation number)' : ''}</span></div>
  </div>`;

  const bindLine = r.approved > 0 ? `<p class="v-sub"><span class="chip chip-gold">Your limit: ${esc(BIND_LABEL[r.binding])}</span> ${esc(BIND_WHY[r.binding])}</p>` : '';
  let bridgeLine = '';
  if (preEv && pre > r.comfortable) {
    const b = bridgeToComfort(pre, buildInput());
    const parts = [];
    if (b.incomeNeededMonthly != null) parts.push(`about <strong>${fmtUSD(b.incomeNeededMonthly)}/mo more gross income</strong>`);
    if (b.debtCutNeeded != null) parts.push(`<strong>${fmtUSD(b.debtCutNeeded)}/mo less in debt payments</strong>${b.debtCutNeeded >= (buildInput().monthlyDebts || 0) - 1 ? ' (all of it)' : ''}`);
    bridgeLine = parts.length
      ? `<p class="v-sub"><span class="chip chip-gold">The bridge</span> To make ${fmtUSD(pre)} genuinely comfortable you'd need ${parts.join(', or ')}. ${parts.length > 1 ? 'Either one alone gets you there; neither' : 'That'} is ${parts.length > 1 ? '' : 'not '}a reason to buy at that price today${parts.length > 1 ? '' : ', it\'s the size of the gap'}.</p>`
      : `<p class="v-sub"><span class="chip chip-gold">The bridge</span> No realistic amount of extra income or debt payoff makes ${fmtUSD(pre)} comfortable on these inputs${r.comfortBinding === 'exposure' ? ' — your net worth is what caps it' : ''}. That's the answer, not a problem to solve.</p>`;
  }
  let comfortLine = '';
  if (r.comfortBinding === 'exposure') comfortLine = `<p class="v-sub"><span class="chip chip-navy">Comfortable capped by net worth</span> At ${fmtUSD(r.params.netWorth)} net worth, a 10% dip in home value above ${fmtUSD(r.exposureCap)} would erase more than ${pct(READINESS.exposureCap)} of everything you own. Same income, different balance sheet, different risk.</p>`;
  else if (r.comfortBinding === 'back') comfortLine = `<p class="v-sub"><span class="chip chip-navy">Comfortable set by your debts</span> Housing alone would fit under ${pct(r.params.comfortPct)}, but housing plus your ${fmtUSD(r.params.monthlyDebts + r.params.childCareMonthly)}/mo of debts and child care hits the ${pct(r.params.comfortPct + READINESS.backEndSpread)} all-obligations line first. Every $100/mo you retire raises this number by about ${fmtUSD(Math.max(0, solve({ ...buildInput(), monthlyDebts: Math.max(0, r.params.monthlyDebts - 100) }).comfortable - r.comfortable))}.</p>`;
  else if (r.comfortTightened) comfortLine = `<p class="v-sub"><span class="chip chip-navy">Comfortable tightened to ${pct(r.params.comfortPct)}</span> Your readiness answers (${esc(readinessWhy())}) pull the comfort share down from ${pct(r.params.comfortPctBase)}. The lender's number doesn't move; the one you should shop on does.</p>`;
  let liftLine = '';
  if (r.unassignedRegion) liftLine = `<p class="v-sub v-warning">The VA handbook assigns no residual-income region to this territory, so that test is skipped here. Confirm with your lender.</p>`;

  el.innerHTML = `<p class="v-kicker">${esc(kicker)}</p><p class="v-line">${line}</p>${cards}${bindLine}${comfortLine}${bridgeLine}${liftLine}`;
}

/* ─── Results panels ───────────────────────────────────────────────────── */
function renderResults(r) {
  const inp = buildInput();
  const a = r.atApproved, c = r.atComfortable;

  // Ceilings table
  const rows = [
    ['dti', 'Debt-to-income', `Debts + housing ≤ ${pct(r.params.dtiCap)} of qualifying income (${fmtUSD(r.stack.qualifyingMonthly)}/mo, gross-up included)`],
    ['residual', 'VA residual income', a.required ? `Real cash left ≥ ${fmtUSD(a.required)}/mo (${a.region}, family of ${r.params.familySize}, ${a.loan >= 80000 ? '$80K+' : 'under $80K'} loan)` : 'No region assigned — test skipped'],
    ['entitlement', 'Entitlement / county limit', r.params.entitlement === 'partial' ? `Loan ≤ ${fmtUSD(a.countyLimit)} with an active VA loan` : 'Full entitlement: no VA loan limit'],
    ['comfort', 'Comfort budget', `Housing ≤ ${pct(r.params.comfortPct)} and housing + debts + child care ≤ ${pct(r.params.comfortPct + READINESS.backEndSpread)} of actual gross income (${fmtUSD(a.comfortBasis)}/mo, no gross-up${state.mode === 'serving' && r.stack.bahMonthly > 0 ? ', BAH excluded' : ''})${r.comfortTightened ? ` — tightened from ${pct(r.params.comfortPctBase)} by your readiness answers` : ''}${r.exposureCap < Infinity ? `; net-worth cap ${fmtUSD(r.exposureCap)}` : ''}`],
  ];
  $('ceilings-panel').innerHTML = `<h3>Four ceilings — the lowest lender test wins</h3>
    <table class="cmp-table"><thead><tr><th>Test</th><th class="num">Max price</th></tr></thead><tbody>
    ${rows.map(([k, label, why]) => `<tr class="ceil-row${k === r.binding ? ' binding' : ''}"><td>${label}${k === r.binding ? ' <span class="best-tag">Sets your limit</span>' : ''}<span class="ceil-why">${esc(why)}</span></td><td class="num">${r.max[k] >= r.params.priceCeiling ? 'No cap' : fmtUSD(r.max[k])}</td></tr>`).join('')}
    </tbody></table>
    <p class="table-note">Approved = the lowest of the first three. Comfortable = the fourth, capped at approved. Every figure is solved from your inputs; nothing is a national average.</p>`;

  // Breakdown at both prices
  const line = (label, va, vc, bold) => `<tr${bold ? ' class="punchline-row"' : ''}><td>${label}</td><td class="num">${va}</td><td class="num">${vc}</td></tr>`;
  const resLine = ev => ev.required == null ? '—' : `${fmtUSD(ev.residual)} <span class="cell-muted">/ ${fmtUSD(ev.required)} req</span>`;
  const dtiLine = ev => `${pct(ev.dti)}${ev.flags.over41 ? (ev.flags.cushion20 ? ' <span class="chip chip-green">ok: residual +20%</span>' : ev.flags.taxFreeShare > 0 ? ' <span class="chip chip-gold">tax-free exception</span>' : ' <span class="chip chip-red">scrutiny</span>') : ''}`;
  $('breakdown-panel').innerHTML = `<h3>What each price costs you every month</h3>
    <table class="cmp-table"><thead><tr><th></th><th class="num">Approved ${fmtK(r.approved)}</th><th class="num best-col">Comfortable ${fmtK(r.comfortable)}</th></tr></thead><tbody>
    ${line('Loan amount' + (a.fee > 0 ? ' (funding fee rolled in)' : ' (funding fee waived)'), fmtUSD(a.loan), fmtUSD(c.loan))}
    ${line('Principal & interest', fmtUSD(a.pi), fmtUSD(c.pi))}
    ${line('Property tax' + (a.propTaxNoExemption > a.propTax + 1 ? ' (after your veteran exemption)' : ''), fmtUSD(a.propTax), fmtUSD(c.propTax))}
    ${line('Insurance + HOA', fmtUSD(a.ins + a.hoa), fmtUSD(c.ins + c.hoa))}
    ${line('<strong>Total housing payment</strong>', `<strong>${fmtUSD(a.piti)}</strong>`, `<strong>${fmtUSD(c.piti)}</strong>`, true)}
    ${line(`Upkeep estimate (${inp.sqft.toLocaleString()} sq ft × 14¢)`, fmtUSD(a.maint), fmtUSD(c.maint))}
    ${line('Debt-to-income (lender, grossed-up income)', dtiLine(a), dtiLine(c))}
    ${line('All obligations ÷ real gross income', pct(a.backRatio), pct(c.backRatio))}
    ${line('Residual income left / required', resLine(a), resLine(c))}
    </tbody></table>
    ${a.propTaxNoExemption > a.propTax + 1 ? `<p class="table-note">Your ${stateTaxData[inp.stateCode]?.name || ''} veteran exemption is saving you about ${fmtUSD((a.propTaxNoExemption - a.propTax) * 12)}/yr at the approved price. <a href="/va-loan/" target="_blank" rel="noopener">Full property tax and loan-type comparison →</a></p>` : ''}
    <p class="table-note">The 41% line is a guideline. The handbook allows closing above it when residual income beats the requirement by 20%+, or when the ratio is high solely because of tax-free income (supervisor sign-off). Chips above show which applies.</p>`;

  // Gross-up ladder: re-solve at every rating rung
  const rungs = [0, 10, 30, 50, 70, 90, 100];
  const ladder = rungs.map(rt => {
    const rr = solve({ ...inp, rating: rt, vaMonthlyOverride: null });
    return { rt, va: rr.stack.vaMonthly, q: rr.stack.qualifyingMonthly, approved: rr.approved, comfortable: rr.comfortable, tax: rr.atApproved.propTax * 12 };
  });
  const cur = inp.rating;
  $('grossup-panel').innerHTML = `<h3>The tax-free lever: what each rating rung buys</h3>
    <p>${r.grossUpPriceLift > 0 ? `Your tax-free income grossed up at ${pct(r.params.grossUpPct)} is worth <strong>${fmtUSD(r.grossUpPriceLift)}</strong> of approved price on its own. ` : cur === 0 ? `No rating entered. A service-connected rating adds tax-free income that lenders gross up, waives the funding fee, and in many states cuts your property tax. ` : ''}Same salary, same debts, same house size — only the rating changes.</p>
    <table class="cmp-table"><thead><tr><th>Rating</th><th class="num">VA comp/mo</th><th class="num">Approved</th><th class="num">Comfortable</th></tr></thead><tbody>
    ${ladder.map(l => `<tr class="${l.rt === cur ? 'you-row' : ''}"><td>${l.rt === 0 ? 'No rating' : l.rt + '%'}${l.rt === cur ? ' <span class="best-tag">You</span>' : ''}</td><td class="num">${fmtUSD(l.va)}</td><td class="num">${fmtUSD(l.approved)}</td><td class="num">${fmtUSD(l.comfortable)}</td></tr>`).join('')}
    </tbody></table>
    <p class="table-note">${cur > 0 && cur < 100 ? `Filing is free. The most common path up is secondary conditions, which need no in-service records: <a href="/secondary-conditions/">map yours</a>, check the math in the <a href="/va-combined/">VA Combined Rating Calculator</a>, then walk in prepared with <a href="/cp-exam-prep/">C&amp;P Exam Prep</a>.` : cur === 0 ? `Never filed? Start with the <a href="/benefits-quiz/">Benefits Finder Quiz</a>, then the <a href="/va-combined/">VA Combined Rating Calculator</a>. Intent to File locks today's date for back pay.` : `You're at the top of this ladder. Make sure the rest of the stack is working for you: <a href="/100-pt/">everything P&amp;T is worth</a>.`}</p>`;

  // Readiness + exposure
  const ans = readinessAnswers();
  const sc = scoreReadiness(ans);
  const nw = num(networthEl);
  const showReady = sc.complete || nw > 0 || state.mode === 'ready';
  $('readiness-panel').style.display = showReady ? 'block' : 'none';
  if (showReady) {
    let tierBlock = '';
    if (sc.complete) {
      const T = {
        green: ['You\'re ready. Do it right.', 'Nothing in your answers says wait. Shop under your comfortable number, keep your reserves intact after close, and don\'t let a pre-approval set your budget.'],
        yellow: ['You\'re 6–12 months out.', 'You can qualify today. A few things are worth shoring up first so the house is a foundation, not a stressor.'],
        red: ['Buying now would probably hurt you.', 'Not "never." Right now. The reasons are life-stage, not financial, and they resolve. Here\'s the shore-up list, in order.'],
      }[sc.tier];
      const effect = sc.tier === 'green' ? 'Your comfortable number uses the full comfort share.' : `Because of this, your comfortable number uses a ${pct(r.params.comfortPct)} comfort share instead of ${pct(r.params.comfortPctBase)}. The lender's ceiling is unchanged.`;
      tierBlock = `<p><span class="tier tier-${sc.tier}">${esc(T[0])}</span></p><p>${esc(T[1])} <strong>${esc(effect)}</strong></p>` +
        (sc.flags.length ? `<p><strong>What to shore up:</strong></p>` + sc.flags.map(([id, f]) => `<p>• <strong>${esc(f.q)}</strong> — you answered "${esc(f.label)}". ${esc(RQ_FIX[id])}</p>`).join('') : '');
    } else {
      tierBlock = `<p class="table-note">Answer all 7 questions in the "Am I ready to buy?" drawer above for your readiness read (${sc.answered || 0}/7 so far).</p>`;
    }
    let expBlock = '';
    if (nw > 0) {
      const ex = exposure(r.comfortable, nw);
      const exA = exposure(r.approved, nw);
      const pos = Math.min(100, Math.max(0, ex.pct * 100));
      const alt = [nw * 0.5, nw * 2, nw * 5].map(n => ({ n, e: exposure(r.comfortable, n) }));
      const BANDS = { comfortable: 'comfortable', stretched: 'stretched', exposed: 'exposed', danger: 'danger zone' };
      expBlock = `<h3 style="margin-top:16px;">Net-worth exposure</h3>
        <p>Our definition, stated plainly: <strong>the share of your net worth a 10% dip in home value would erase.</strong> At your comfortable price of ${fmtUSD(r.comfortable)} against ${fmtUSD(nw)} net worth, that's <strong>${pct(ex.pct)}</strong> (${BANDS[ex.band]}). At the approved price it's ${pct(exA.pct)} (${BANDS[exA.band]}).</p>
        <div class="gauge"><div class="gauge-needle" style="left:${pos}%"></div></div>
        <div class="gauge-labels"><span>0% comfortable</span><span>15% stretched</span><span>35% exposed</span><span>75%+ danger</span></div>
        ${r.comfortBinding === 'exposure' ? `<p><strong>This is what set your comfortable number.</strong> We cap it at ${fmtUSD(r.exposureCap)} so a 10% dip stays under ${pct(READINESS.exposureCap)} of your net worth. Grow the balance sheet and the cap rises with it.</p>` : ''}
        <p class="table-note">Same house, different balance sheet: at ${fmtUSD(alt[0].n)} net worth the dip erases ${pct(alt[0].e.pct)}; at ${fmtUSD(alt[1].n)}, ${pct(alt[1].e.pct)}; at ${fmtUSD(alt[2].n)}, ${pct(alt[2].e.pct)}. Same income, completely different risk. Standard rent-vs-buy math never shows this.</p>`;
    }
    $('readiness-panel').innerHTML = `<div class="callout callout-note"><h3>Should you even buy right now?</h3>${tierBlock}${expBlock}</div>`;
  }

  // Next steps
  const next = [];
  // Rate sensitivity: the biggest unknown for anyone shopping, so it's the first line.
  if (r.comfortable > 0) {
    const lo = solve({ ...inp, rate: inp.rate - 0.5 }), hi = solve({ ...inp, rate: inp.rate + 0.5 });
    next.push(`<strong>Rates move this more than anything.</strong> At ${(inp.rate - 0.5).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}% your comfortable number is ${fmtUSD(lo.comfortable)}; at ${(inp.rate + 0.5).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}% it's ${fmtUSD(hi.comfortable)} (you're modeled at ${inp.rate}%). Lock matters.`);
  }
  if (r.binding === 'dti' && inp.monthlyDebts > 0) next.push(`Every $100/mo of debt you retire raises your approved price by roughly ${fmtUSD(solve({ ...inp, monthlyDebts: Math.max(0, inp.monthlyDebts - 100) }).approved - r.approved)}. Debts are the fastest lever you control.`);
  if (r.binding === 'residual') next.push(`A smaller home helps twice: lower payment and a lower upkeep deduction. At ${Math.max(300, inp.sqft - 400).toLocaleString()} sq ft your residual ceiling rises to ${fmtUSD(solve({ ...inp, sqft: Math.max(300, inp.sqft - 400) }).max.residual)}.`);
  if (state.mode === 'serving' && inp.bahMonthly > 0) { const post = solve({ ...inp, bahMonthly: 0 }); next.push(`<strong>Your comfortable number already excludes BAH.</strong> The lender's ceiling counts it while you're in; if you separate before closing, the approval itself drops to about ${fmtUSD(post.approved)}. Shop on the gold number.`); }
  if (inp.rating > 0 && inp.rating < 100) next.push(`Your next rating rung changes this math (gold table above). <a href="/secondary-conditions/">Secondary conditions</a> are the most common path.`);
  // COE preservation: only for the buyer it's actually written for (first-time, full entitlement, modest price)
  if (inp.entitlement === 'full' && entEl.value === 'full' && r.comfortable > 0 && r.comfortable < 350000) next.push(`<strong>Preserve your entitlement.</strong> Full VA entitlement has no loan limit, and that $0-down benefit is worth the most later when your income is higher. A starter home you'll outgrow in two years can leave a partially-used certificate that's hard to fully restore. If that's the plan, run the <a href="/second-va-loan/">Second VA Loan &amp; Entitlement Calculator</a> first.`);
  next.push(`Get pre-approved by more than one VA lender and compare the residual-income line on their worksheets, not just the max price. If one of them will show you the VA Form 26-6393, that's the whole story on one page.`);
  $('next-panel').innerHTML = `<h3>What moves your number</h3>${next.map(n => `<p>• ${n}</p>`).join('')}
    <p>• Not sure what else you're owed? The <a href="/benefits-quiz/">Benefits Finder Quiz</a> maps it in two minutes, and <a href="/state-benefits/">Best State for Veterans</a> ranks property tax exemptions by state.</p>`;
}
function readinessWhy() {
  const ans = readinessAnswers();
  const sc = scoreReadiness(ans);
  const bits = [];
  if (sc.complete && sc.tier !== 'green') bits.push(sc.tier === 'red' ? 'red readiness' : 'yellow readiness');
  if (ans.reserves && ans.reserves.i === 3) bits.push('no reserves after close');
  else if (ans.reserves && ans.reserves.i === 2) bits.push('1–3 months of reserves');
  return bits.join(', ') || 'your answers';
}
const RQ_FIX = {
  stage: 'Fresh out is when the pre-approval feels biggest and the life is least settled. Rent through the first year if you can; the benefit doesn\'t expire.',
  job: 'Lenders want tenure and so should you. Twelve months in a job you\'ll keep turns a maybe into a yes.',
  geo: 'A house is a five-year bet on a zip code. Buying and selling costs roughly 8–10% of the price round trip, which is more than most homes appreciate in two or three years — a short stay usually loses money even when the market goes up. If you can\'t make the five-year bet yet, renting is the cheaper way to keep your options.',
  family: 'Big changes at home change the house you need. Buy the house for the family you\'ll have, not the one you have today, or wait until you know.',
  reserves: 'Reserves after close are the difference between a bad month and a foreclosure. Six months of expenses, separate from the down payment, before you sign.',
  income: 'Variable income qualifies but it strains a fixed payment. Size the house to your floor month, not your best one.',
  why: 'Rent is not "thrown away"; it buys flexibility. Pressure and FOMO are reasons to slow down, not reasons to buy.',
};

/* ─── FAQ (visible; mirrors FAQPage JSON-LD) ───────────────────────────── */
const FAQ = [
  ['How much house can I afford with a VA loan?', 'A lender typically approves when total monthly debts including the new housing payment stay at or under 41% of qualifying income AND you clear the VA residual income requirement, a minimum left over after taxes, debts, housing, and 14¢/sq ft upkeep. Both must pass. The approved number is usually well above what feels comfortable, which is why this tool shows both.'],
  ['Does VA disability count as income for a mortgage?', 'Yes. It counts as effective income and, per the Lender\'s Handbook, needs no continuance documentation the way wages do. Because it\'s tax-free, most lenders gross it up 15–25% for the DTI test. The VA sets no gross-up percentage; it\'s a lender convention. Residual income is always real cash, never grossed up.'],
  ['What is VA residual income?', 'The money left each month after federal and state taxes, Social Security, all debts, the full housing payment, and 14¢/sq ft for upkeep. The VA publishes minimums by region, family size, and loan amount. A family of four with an $80K+ loan needs $1,025 in the Northeast, $1,003 in the Midwest and South, and $1,117 in the West.'],
  ['Can I get a VA loan with a DTI over 41%?', 'Often. 41% is a guideline. The handbook says a higher ratio needs close scrutiny unless residual income beats the requirement by 20%+, or the ratio is high solely because of tax-free income, in which case a supervisor can approve it with justification. Disabled veterans with strong residual close above 41% routinely.'],
  ['Do disabled veterans pay the VA funding fee?', 'No. Any veteran receiving VA compensation is exempt, no minimum rating. Also exempt: those eligible but paid retirement or active-duty pay instead, DIC surviving spouses, pre-discharge memorandum ratings, and active-duty Purple Heart recipients. Otherwise it\'s 2.15% first use, 3.30% subsequent, usually rolled into the loan.'],
];
$('faq-items').innerHTML = FAQ.map(([q, a]) => `<details class="faq-item"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');

/* ─── Share URL ────────────────────────────────────────────────────────── */
const URL_FIELDS = [['sal', salaryEl], ['r', ratingEl], ['pt', ptEl], ['m', marriedEl], ['ch', childrenEl], ['sp', spouseEl], ['bah', bahEl], ['st', stateEl], ['d', debtsEl], ['pre', preEl], ['dn', downEl], ['sq', sqftEl], ['en', entEl], ['co', countyEl], ['hoa', hoaEl], ['rt', rateEl], ['tm', termEl], ['dti', dtiEl], ['cf', comfortEl], ['gu', grossupEl], ['ins', insEl], ['fe', feeEl], ['pn', pensionEl], ['ot', otherTaxEl], ['on', otherNonEl], ['cc', childcareEl], ['vo', vaOverrideEl], ['nw', networthEl]];
function buildShareUrl() {
  const p = new URLSearchParams();
  p.set('mode', state.mode);
  for (const [k, el] of URL_FIELDS) if (el.value !== '' && el.value != null) p.set(k, el.value);
  const ans = readinessAnswers();
  const rq = RQ.map(r => ans[r.id] ? ans[r.id].i : '').join('.');
  if (rq.replace(/\./g, '') !== '') p.set('rq', rq);
  return location.origin + location.pathname + '?' + p.toString() + '&source=va-affordability';
}
function loadFromUrl() {
  const p = new URLSearchParams(location.search);
  if (!p.has('st') && !p.has('sal')) {
    // Mode-only link (e.g. from the newsletter): framing, not a result — stays gated.
    if (p.has('mode') && MODE_BRIEF[p.get('mode')]) { setMode(p.get('mode')); history.replaceState(null, '', location.pathname); }
    return false;
  }
  for (const [k, el] of URL_FIELDS) if (p.has(k)) el.value = p.get(k);
  fillCounties(); if (p.has('co')) countyEl.value = p.get('co');
  if (p.has('rq')) p.get('rq').split('.').forEach((v, i) => { if (v !== '') { const el = document.querySelector(`input[name="rq-${RQ[i].id}"][value="${v}"]`); if (el) el.checked = true; } });
  setMode(p.get('mode') || 'shop', { keepDrawers: true });
  history.replaceState(null, '', location.pathname);
  reveal();
  return true;
}

/* ─── Email capture ────────────────────────────────────────────────────── */
async function sendResultsEmail(email, statusEl, btn, placement) {
  if (!email || !email.includes('@')) { statusEl.textContent = 'Please enter a valid email.'; statusEl.className = 'email-status error'; return false; }
  btn.disabled = true;
  statusEl.textContent = 'Sending…'; statusEl.className = 'email-status';
  try {
    const res = await fetch('/api/email-results', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, resultsUrl: buildShareUrl(), source: 'va-affordability' }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      statusEl.textContent = '✓ Check your inbox — your numbers link is on the way.';
      statusEl.className = 'email-status success';
      if (typeof gtag === 'function') gtag('event', 'email_capture', { placement });
      return true;
    }
    statusEl.textContent = data.error || 'Something went wrong. Please try again.'; statusEl.className = 'email-status error';
  } catch { statusEl.textContent = 'Network error. Please try again.'; statusEl.className = 'email-status error'; }
  finally { btn.disabled = false; }
  return false;
}
$('hero-capture-form').addEventListener('submit', async e => {
  e.preventDefault();
  if (await sendResultsEmail($('hero-email-input').value.trim(), $('hero-email-status'), $('hero-email-btn'), 'hero')) $('hero-email-input').value = '';
});
$('email-results-form').addEventListener('submit', async e => {
  e.preventDefault();
  if (await sendResultsEmail($('email-input').value.trim(), $('email-status'), $('email-submit-btn'), 'bottom')) $('email-input').value = '';
});
$('print-btn').addEventListener('click', () => window.print());
$('share-btn').addEventListener('click', async () => {
  const btn = $('share-btn');
  try { await navigator.clipboard.writeText(buildShareUrl()); const o = btn.textContent; btn.textContent = '✓ Link Copied!'; setTimeout(() => { btn.textContent = o; }, 2000); }
  catch { prompt('Copy this link:', buildShareUrl()); }
});

/* ─── Interactive tour (house standard, copied from VFI/va-healthcare) ─── */
const INPUT_TOUR_KEY = 'va-aff-tour-seen', RESULTS_TOUR_KEY = 'va-aff-results-tour-seen';
const INPUT_TOUR = [
  { id: 'welcome', target: null, label: 'Step 1 of 7', title: 'Welcome — 60 seconds, then it\'s all yours', text: 'A VA pre-approval is a ceiling, not a budget. This tool runs the same two tests your lender runs, then puts a comfortable number next to the approved one. Fill in your real numbers as we go; exit anytime.' },
  { id: 'pills', target: '#mode-pills', label: 'Step 2 of 7', title: 'Pick your lane', text: 'Shopping, second-guessing a pre-approval, still serving, or not sure you should buy at all. Click the one that fits and the form reshapes around it.' },
  { id: 'income', target: '#card-income', label: 'Step 3 of 7', title: 'Your income, including the tax-free part', text: 'Enter your salary and your rating. Watch the gold line: your tax-free comp gets grossed up for the lender\'s ratio, which is why a rating is worth more house than the same dollars in salary. Pick your state; it sets your VA region.' },
  { id: 'home', target: '#card-home', label: 'Step 4 of 7', title: 'Debts and the home itself', text: 'Monthly debts are the biggest lever you control. Home size matters too: the VA deducts 14¢ per square foot for upkeep in its real-cash test, so a bigger house is harder to qualify for twice.' },
  { id: 'assumptions', target: '#assumptions-drawer', label: 'Step 5 of 7', title: 'Assumptions, all editable (optional)', text: 'Rate, the gross-up percentage, what "comfortable" means to you, other income, child care. Sensible defaults are already in. Open it if you want to see how each one moves your number.' },
  { id: 'ready', target: '#readiness-drawer', label: 'Step 6 of 7', title: 'Should you buy at all? (optional)', text: 'Seven quick life-stage questions and your rough net worth. Most veterans can qualify; this tells you whether now is the time. It adds a readiness read to your results.' },
  { id: 'gate', target: '#compare-btn', label: 'Step 7 of 7', title: 'Get your two numbers', text: 'Press it, and we\'ll walk through the results together.' },
];
const RESULTS_TOUR = [
  { id: 'r-hero', target: '#hero-verdict', label: 'Results 1 of 4', title: 'Your two numbers', text: 'Approved on the left, comfortable in gold. The chip names the exact rule setting your limit. Everything below shows the work.' },
  { id: 'r-ceil', target: '#ceilings-panel', label: 'Results 2 of 4', title: 'Four ceilings', text: 'Each test solved on its own. The highlighted row is the one that caps you, and it tells you what to change to raise it.' },
  { id: 'r-ladder', target: '#grossup-panel', label: 'Results 3 of 4', title: 'The rating ladder', text: 'Same inputs, every rating rung. This is what your next claim is worth in house. Filing is free.' },
  { id: 'r-capture', target: '#email-results-container', label: 'Results 4 of 4', title: 'Don\'t lose this', text: 'Email yourself the link; it rebuilds this exact breakdown anytime, including for your lender. That\'s the walkthrough.' },
];
const tourState = { active: false, i: 0, steps: INPUT_TOUR, seenKey: INPUT_TOUR_KEY, timer: null };
function isTourActive() { return tourState.active; }
function tourEls() { return { root: $('tour-root'), spot: $('tour-spotlight'), tip: $('tour-tooltip') }; }
function positionTour() {
  const step = tourState.steps[tourState.i]; if (!step) return;
  const { spot, tip } = tourEls();
  if (!step.target) {
    spot.style.cssText = `top:${scrollY + innerHeight / 2}px; left:50vw; width:0; height:0;`;
    if (!matchMedia('(max-width: 560px)').matches) {
      tip.style.left = Math.max(24, (innerWidth - Math.min(380, innerWidth - 48)) / 2) + 'px';
      tip.style.top = (scrollY + innerHeight / 2 - (tip.offsetHeight || 220) / 2) + 'px';
    }
    return;
  }
  const target = document.querySelector(step.target);
  if (!target || target.offsetParent === null) return;
  const r = target.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return;
  const pad = 8;
  Object.assign(spot.style, { top: (r.top + scrollY - pad) + 'px', left: (r.left + scrollX - pad) + 'px', width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px' });
  const tipH = tip.offsetHeight || 180;
  const below = r.bottom + 16 + tipH < innerHeight || r.top < tipH + 32;
  if (matchMedia('(max-width: 560px)').matches) { tip.style.top = ''; tip.style.left = ''; }
  else {
    tip.style.top = (below ? r.bottom + scrollY + 14 : r.top + scrollY - tipH - 14) + 'px';
    tip.style.left = Math.max(12, Math.min(r.left + scrollX, innerWidth - tip.offsetWidth - 12)) + 'px';
  }
}
function showTourStep(i, dir = 1) {
  if (i < 0 || i >= tourState.steps.length) return endTour();
  const step = tourState.steps[i];
  if (step.target) {
    const el = document.querySelector(step.target);
    if (!el || el.offsetParent === null) return showTourStep(i + dir, dir);
  }
  tourState.i = i;
  const visible = tourState.steps.filter(s => { if (!s.target) return true; const el = document.querySelector(s.target); return el && el.offsetParent !== null; });
  $('tour-step-label').textContent = `${step.label.split(' ')[0]} ${visible.indexOf(step) + 1} of ${visible.length}`;
  $('tour-title').textContent = step.title;
  $('tour-text').textContent = step.text;
  $('tour-next').textContent = i === tourState.steps.length - 1 ? 'Done ✓' : 'Next';
  if (!step.target) window.scrollTo({ top: 0, behavior: 'smooth' });
  else { const target = document.querySelector(step.target); if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  setTimeout(positionTour, 350);
}
function startTourWith(steps, seenKey) {
  tourState.steps = steps; tourState.seenKey = seenKey; tourState.active = true; tourState.i = 0;
  $('tour-root').hidden = false;
  showTourStep(0);
  clearInterval(tourState.timer);
  tourState.timer = setInterval(positionTour, 400);
}
function endTour() {
  tourState.active = false;
  clearInterval(tourState.timer);
  $('tour-root').hidden = true;
  try { localStorage.setItem(tourState.seenKey, '1'); } catch {}
}
$('tour-next').addEventListener('click', () => showTourStep(tourState.i + 1, 1));
$('tour-back').addEventListener('click', () => showTourStep(tourState.i - 1, -1));
$('tour-exit').addEventListener('click', endTour);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && tourState.active) endTour(); });
document.addEventListener('click', e => {
  if (!tourState.active || e.detail === 0) return;
  if (e.target.closest('#tour-tooltip') || e.target.closest('#tour-restart')) return;
  if (e.target.closest('#compare-btn') || e.target.closest('.mode-pill')) return;
  const r = $('tour-spotlight').getBoundingClientRect();
  const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  if (!inside) endTour();
});
$('tour-restart').addEventListener('click', () => startTourWith(INPUT_TOUR, INPUT_TOUR_KEY));
addEventListener('resize', positionTour);

/* ─── Init ─────────────────────────────────────────────────────────────── */
setMode('shop');
const arrived = loadFromUrl();
let tourSeen = true;
try { tourSeen = localStorage.getItem(INPUT_TOUR_KEY) === '1'; } catch {}
if (!arrived && !window.__vaAffArrivalHadParams && !tourSeen) setTimeout(() => startTourWith(INPUT_TOUR, INPUT_TOUR_KEY), 600);
updateLiveStrip();
