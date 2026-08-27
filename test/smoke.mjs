/**
 * va-affordability headless smoke test — funnel + tour lifecycle + engine wiring.
 *
 *   node va-affordability/test/smoke.mjs        # from tbv-tools/
 *
 * Same harness as va-loan/test/smoke.mjs: built-in static server + installed
 * Chrome via --dump-dom. Assertions check RENDERED OUTPUT.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, extname } from 'node:path';
import process from 'node:process';

const execFileP = promisify(execFile);
const PORT = 8911;
const BASE = `http://localhost:${PORT}/va-affordability/`;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const SHARE = '?mode=shop&sal=80000&r=100&pt=yes&m=yes&ch=1&st=TX&d=400&sq=1800&en=full&rt=6.375&tm=30&dti=41&cf=28&gu=25&ins=0.65&nw=60000&rq=0.1.0.0.1.0.0';
const PRE = '?mode=preapproved&sal=65000&r=70&m=no&ch=0&st=CA&d=300&pre=700000&sq=2000&en=full';
const PARTIAL = '?mode=shop&sal=120000&r=50&m=yes&ch=2&st=CA&d=0&sq=2200&en=partial&co=Los%20Angeles%20County';

let failures = 0;
function check(ok, label, extra = '') { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? ' — ' + extra : ''}`); }

async function dumpDom(url) {
  const { stdout } = await execFileP(CHROME, ['--headless', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=7000', '--dump-dom', url], { maxBuffer: 20 * 1024 * 1024 });
  return stdout;
}

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const body = await readFile(join(ROOT, p));
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end('not found'); }
});
await new Promise(r => server.listen(PORT, r));
process.on('exit', () => server.close());

const text = (html, id) => { const m = html.match(new RegExp(`id="${id}"[^>]*>([\\s\\S]*?)<\\/(?:div|p|span|td|h3)>`)); return m ? m[1].replace(/<[^>]+>/g, ' ') : ''; };

try {
  // --- First visit ------------------------------------------------------
  const first = await dumpDom(BASE);
  check(/<option value="AL"/.test(first), 'states populated (module executed)');
  check(/name="rq-stage"/.test(first), 'readiness questions rendered');
  check(/id="hero-verdict"[^>]*style="display:\s*none/.test(first), 'results GATED on first load');
  check(/id="tour-root"(?![^>]*hidden)/.test(first), 'input tour auto-starts');
  check(/Step 1 of 7/.test(first), 'input tour has 7 steps');
  check(/id="mode-briefing"[^>]*>[^<]{20,}/.test(first), 'mode briefing filled');
  check(/id="about-this-tool"/.test(first) && /id="how-it-works"/.test(first), 'GEO intro + methodology present');
  check(/"@type":\s*"FAQPage"/.test(first) && /"@type":\s*"WebApplication"/.test(first), 'JSON-LD present');
  check((first.match(/class="faq-item"/g) || []).length === 5, 'visible FAQ mirrors JSON-LD (5)');
  check((first.match(/class="req-tag"/g) || []).length >= 4, 'required tags on salary/rating/state/pre-approved');
  check(/class="req-legend"/.test(first), 'required/optional legend present');
  check(/Required to run:/.test(text(first, 'live-strip')), 'live strip names the requirement while unmet');
  check(/G-HG7N8F337G/.test(first) && first.indexOf('gtag') < first.indexOf('<meta charset'), 'GA4 first in head');

  // --- Share link: revealed, tours suppressed, engine correct -----------
  const shared = await dumpDom(BASE + SHARE);
  check(/id="hero-verdict"[^>]*style="display:\s*block/.test(shared), 'share link reveals results');
  check(/id="tour-root"[^>]*hidden/.test(shared), 'tours suppressed for share arrival');
  check(/id="hero-capture"[^>]*style="display:\s*block/.test(shared), 'result-moment capture shown');
  const hero = text(shared, 'hero-verdict');
  check(/Lender's ceiling/.test(shared) && /Comfortable/.test(shared), 'two-number hero renders');
  check(/Your limit:/.test(shared), 'binding constraint chip present');
  const amounts = [...shared.matchAll(/class="nc-amount">\$([\d,]+)</g)].map(m => +m[1].replace(/,/g, ''));
  check(amounts.length === 2 && amounts[0] > 0 && amounts[1] > 0 && amounts[1] <= amounts[0], 'approved ≥ comfortable > 0', amounts.join(' / '));
  check(/Tax-free VA compensation:\s*<strong>\$4,319\/mo/.test(shared), '100% w/ spouse+1 child comp line = $4,319', (shared.match(/Tax-free VA compensation:[^<]*<strong>[^<]*/) || [''])[0]);
  check(/Sets your limit/.test(shared), 'ceilings table marks binding row');
  check(/South, family of 3/.test(shared), 'TX → South, family size 3');
  check(/1,800 sq ft × 14¢/.test(shared), 'maintenance line uses sqft');
  check(/veteran exemption is saving you/.test(shared), 'TX 100% exemption savings surfaced');
  check(/<span class="best-tag">You<\/span>/.test(shared), 'gross-up ladder marks current rung');
  check(/You're ready\. Do it right\./.test(shared) || /6–12 months out/.test(shared), 'readiness tier rendered');
  check(/Net-worth exposure/.test(shared) && /gauge-needle/.test(shared), 'exposure gauge rendered');
  check(/id="action-bar"[^>]*style="display:\s*flex/.test(shared), 'action bar shown');

  // --- Pre-approved mode -----------------------------------------------
  const pre = await dumpDom(BASE + PRE);
  check(/They approved you for <strong>\$700,000/.test(pre), 'pre-approved hero compares the quoted amount');
  check(/id="field-preapproved"(?![^>]*hidden)/.test(pre), 'pre-approved field visible in mode');
  check(/Compare My Pre-Approval/.test(pre), 'gate button relabels per mode');

  // --- Partial entitlement ---------------------------------------------
  const partial = await dumpDom(BASE + PARTIAL);
  check(/Los Angeles County — \$/.test(partial), 'county list populated for CA');
  check(/Loan ≤ \$1,249,125 with an active VA loan/.test(partial), 'LA county limit applied to entitlement ceiling');

  // --- Mode-only link stays gated ---------------------------------------
  const modeOnly = await dumpDom(BASE + '?mode=ready');
  check(/id="hero-verdict"[^>]*style="display:\s*none/.test(modeOnly), 'mode-only link stays gated');
  check(/id="readiness-drawer"[^>]*open/.test(modeOnly), 'ready mode opens the readiness drawer');
} catch (e) {
  failures++;
  console.log('FAIL  harness error —', e.message);
}
console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
