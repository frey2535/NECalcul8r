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

const entryPath = path.resolve(root, '.tmp_neutral_load_entry.mjs');
fs.writeFileSync(entryPath, `
export { runNeutralLoadTests } from '@/data/nec/neutralLoadRegression';
`);

const outfile = path.resolve(root, '.tmp_neutral_load_bundle.mjs');

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
  const { results, passed, failed, total } = mod.runNeutralLoadTests();

  console.log('═══════════════════════════════════════════════════');
  console.log('  NEUTRAL LOAD REGRESSION TESTS (NEC 220.61)');
  console.log('═══════════════════════════════════════════════════');

  const failures = [];

  for (const t of results) {
    const status = t.result;
    const icon = status === 'PASS' ? '✓' : '✗';
    console.log(`${icon} ${t.id}: ${status} — ${t.name}`);

    if (status === 'FAIL') {
      failures.push(t);
      for (const [key, r] of Object.entries(t.matches)) {
        if (!r.match) console.log(`    ${key}: expected=${r.expected}, actual=${r.actual}`);
      }
    }
  }

  console.log('\n  Neutral Load: ' + passed + ' passed, ' + failed + ' failed, ' + total + ' total');

  if (failures.length > 0) {
    console.log('\nFAILURES:');
    for (const f of failures) {
      console.log(`  ${f.id} — ${f.name}:`);
      for (const [key, r] of Object.entries(f.matches)) {
        if (!r.match) console.log(`    ${key}: expected=${r.expected}, actual=${r.actual}`);
      }
    }
  }

  console.log('═══════════════════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
} catch (e) {
  console.error('Build/run error:', e.message);
  console.error(e.stack);
  process.exit(1);
} finally {
  fs.unlinkSync(entryPath);
  try { fs.unlinkSync(outfile); } catch {}
}