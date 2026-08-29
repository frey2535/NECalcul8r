import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';
import * as fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// ─── esbuild plugin: alias @/ and mock external deps ──────────────────────
const plugin = {
  name: 'alias-and-mock',
  setup(build) {
    const virtual = {
      'react': `export default {}; export const createElement = () => null;`,
      'react-dom': `export default {};`,
      'react-router-dom': `export const Link = () => null; export const useNavigate = () => () => {};`,
      'recharts': `export default {};`,
      'lucide-react': `new Proxy({}, { get: () => () => null });`,
      'framer-motion': `export const motion = {};`,
      'date-fns': `export default {};`,
      'moment': `export default () => ({ format: () => '' });`,
      'lodash': `export default {};`,
      'react-markdown': `export default () => null;`,
      'react-quill-new': `export default () => null;`,
      '@hello-pangea/dnd': `export const DragDropContext = () => null;`,
      '@tanstack/react-query': `export const useQuery = () => ({});`,
      'react-hook-form': `export const useForm = () => ({});`,
      'tailwind-merge': `export const twMerge = (...a) => a.join(' ');`,
      'class-variance-authority': `export const cva = () => () => '';`,
      'clsx': `export default (...a) => a.join(' ');`,
    };

    for (const [mod, src] of Object.entries(virtual)) {
      const esc = mod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      build.onResolve({ filter: new RegExp('^' + esc + '$') }, () => ({ path: mod, namespace: 'virtual' }));
      build.onLoad({ filter: new RegExp('^' + esc + '$'), namespace: 'virtual' }, () => ({ contents: src, loader: 'js' }));
    }

    build.onResolve({ filter: /^@\// }, (args) => {
      const base = path.resolve(root, 'src', args.path.replace(/^@\//, ''));
      const cands = [base + '.jsx', base + '.js', base + '.tsx', base + '.ts', base + '/index.jsx', base + '/index.js'];
      for (const c of cands) { if (fs.existsSync(c)) return { path: c }; }
      return { path: base + '.jsx' };
    });
  },
};

const entryPath = path.resolve(root, '.tmp_annex_d_entry.mjs');
fs.writeFileSync(entryPath, `
export { runAllAnnexDTests } from '@/data/nec/annexDRegression';
export { runAllExternalTests } from '@/data/nec/externalExamplesRegression';
`);

const outfile = path.resolve(root, '.tmp_annex_d_bundle.mjs');

try {
  await build({
    entryPoints: [entryPath],
    bundle: true,
    format: 'esm',
    outfile,
    jsx: 'automatic',
    plugins: [plugin],
    logLevel: 'silent',
    loader: { '.js': 'jsx', '.jsx': 'jsx' },
    external: [],
  });

  const mod = await import(outfile + '?t=' + Date.now());
  const results = mod.runAllAnnexDTests();
  const externalResults = mod.runAllExternalTests();

  let total = 0, passed = 0, failed = 0, notCovered = 0, blocked = 0, partial = 0;
  const failures = [];

  console.log('═══════════════════════════════════════════════════');
  console.log('  ANNEX D REGRESSION TESTS (NEC 2017)');
  console.log('═══════════════════════════════════════════════════');

  for (const [calcId, tests] of Object.entries(results)) {
    for (const t of tests) {
      if (t.necYear !== '2017') continue;
      total++;
      const status = t.annexDResult;
      if (status === 'PASS') passed++;
      else if (status === 'FAIL') { failed++; failures.push(t); }
      else if (status === 'NOT COVERED') notCovered++;
      else if (status === 'BLOCKED — INPUT MAPPING REQUIRED') blocked++;
      else if (status === 'PARTIAL SUPPORT') partial++;

      const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : status === 'NOT COVERED' ? '○' : status === 'BLOCKED — INPUT MAPPING REQUIRED' ? '⚠' : '~';
      console.log(`${icon} ${t.annexDId} [${calcId}]: ${status}`);

      if (status === 'FAIL' || status === 'PARTIAL SUPPORT') {
        if (t.intermediateResults) {
          for (const [key, r] of Object.entries(t.intermediateResults)) {
            if (!r.match) console.log(`    ${key}: expected=${r.expected}, actual=${r.actual}`);
          }
        }
        if (t.finalResults) {
          for (const [key, r] of Object.entries(t.finalResults)) {
            if (!r.match) console.log(`    ${key}: expected=${r.expected}, actual=${r.actual}`);
          }
        }
      }
    }
  }

  console.log('\n  Annex D: ' + passed + ' passed, ' + failed + ' failed, ' + notCovered + ' not covered, ' + blocked + ' blocked, ' + partial + ' partial');

  if (failures.length > 0) {
    console.log('\nANNEX D FAILURES:');
    for (const f of failures) {
      console.log(`  ${f.annexDId} [${f.calculatorId}]:`);
      if (f.intermediateResults) {
        for (const [key, r] of Object.entries(f.intermediateResults)) {
          if (!r.match) console.log(`    ${key}: expected=${r.expected}, actual=${r.actual}`);
        }
      }
      if (f.finalResults) {
        for (const [key, r] of Object.entries(f.finalResults)) {
          if (!r.match) console.log(`    ${key}: expected=${r.expected}, actual=${r.actual}`);
        }
      }
    }
  }

  // ─── External Worked Examples ────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  EXTERNAL WORKED EXAMPLES (Exam Prep Sources)');
  console.log('═══════════════════════════════════════════════════');

  let extTotal = 0, extPassed = 0, extFailed = 0;
  const extFailures = [];

  for (const [calcId, tests] of Object.entries(externalResults)) {
    for (const t of tests) {
      extTotal++;
      const status = t.result;
      if (status === 'PASS') extPassed++;
      else { extFailed++; extFailures.push(t); }

      const icon = status === 'PASS' ? '✓' : '✗';
      console.log(`${icon} ${t.sourceId} [${calcId}]: ${status} — ${t.source}`);
      if (status === 'FAIL' && t.matches) {
        for (const [key, r] of Object.entries(t.matches)) {
          if (!r.match) console.log(`    ${key}: expected=${r.expected}, actual=${r.actual}`);
        }
      }
    }
  }

  console.log('\n  External: ' + extPassed + ' passed, ' + extFailed + ' failed');

  if (extFailures.length > 0) {
    console.log('\nEXTERNAL FAILURES:');
    for (const f of extFailures) {
      console.log(`  ${f.sourceId} [${f.calculatorId}]:`);
      for (const [key, r] of Object.entries(f.matches)) {
        if (!r.match) console.log(`    ${key}: expected=${r.expected}, actual=${r.actual}`);
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  GRAND TOTAL: ' + (passed + extPassed) + '/' + (total + extTotal) + ' passed, ' + (failed + extFailed) + ' failed');
  console.log('═══════════════════════════════════════════════════');

  process.exit((failed + extFailed) > 0 ? 1 : 0);
} catch (e) {
  console.error('Build/run error:', e.message);
  console.error(e.stack);
  process.exit(1);
} finally {
  fs.unlinkSync(entryPath);
  try { fs.unlinkSync(outfile); } catch {}
}