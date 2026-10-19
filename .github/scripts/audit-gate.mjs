// Fails CI on any high or critical advisory in a project's production
// dependencies, except ones listed in .github/audit-allowlist.json.
//
// Plain `npm audit --audit-level=high` has no way to accept a single
// advisory, so one finding that can't be fixed yet would force the whole
// gate off. An allowlist entry must say why it's safe and when it expires,
// and an expired entry fails the build, so exceptions can't quietly become
// permanent.
//
// Usage, from the project directory: node ../.github/scripts/audit-gate.mjs <project>
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const project = process.argv[2];
if (!project) {
  console.error('usage: audit-gate.mjs <project>');
  process.exit(2);
}

const allowlistPath = fileURLToPath(new URL('../audit-allowlist.json', import.meta.url));
const allowlist = JSON.parse(readFileSync(allowlistPath, 'utf8')).filter(
  (entry) => entry.project === project,
);

// npm audit exits non-zero whenever it finds anything, so the report has to
// be read from the error as well as from a clean run.
function auditReport() {
  try {
    return execFileSync('npm', ['audit', '--omit=dev', '--json'], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
  } catch (err) {
    if (typeof err.stdout === 'string' && err.stdout.trim().startsWith('{')) return err.stdout;
    throw err;
  }
}

const report = JSON.parse(auditReport());
const today = new Date().toISOString().slice(0, 10);
const found = new Map();
for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vulnerability.via) {
    if (typeof via === 'string' || !['high', 'critical'].includes(via.severity)) continue;
    const advisory = via.url.split('/').pop();
    found.set(advisory, `${via.severity} ${via.name}: ${via.title} (${via.url})`);
  }
}

let failed = false;
for (const [advisory, description] of found) {
  const entry = allowlist.find((e) => e.advisory === advisory);
  if (!entry) {
    console.error(`FAIL  ${description}`);
    failed = true;
  } else if (entry.expires < today) {
    console.error(`FAIL  ${description}\n      allowlist entry expired on ${entry.expires}; fix it or re-justify it`);
    failed = true;
  } else {
    console.log(`allow ${description}\n      until ${entry.expires}: ${entry.reason}`);
  }
}

for (const entry of allowlist) {
  if (!found.has(entry.advisory)) {
    console.log(`note  ${entry.advisory} is no longer reported; remove it from the allowlist`);
  }
}

if (!failed) console.log(`audit gate passed for ${project} (${found.size} high/critical found)`);
process.exit(failed ? 1 : 0);
