import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';
import * as fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const plugin = {
  name: 'alias',
  setup(build) {
    const virtual = {
      'react': `export default {}; export const createElement = () => null;`,
      'react-dom': `export default {};`,
      'react-router-dom': `export const Link = () => null;`,
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
      return { path: base + '.js' };
    });
  },
};

const entryPath = path.resolve(root, '.tmp_pb_entry.mjs');
fs.writeFileSync(entryPath, `export { runPullBoxSizingTests } from '@/data/nec/pullBoxSizingRegression';`);
const outfile = path.resolve(root, '.tmp_pb_bundle.mjs');

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
  });

  const mod = await import(outfile + '?t=' + Date.now());
  const { results, passed, failed, total } = mod.runPullBoxSizingTests();

  console.log('═══════════════════════════════════════════════════');
  console.log('  PULL BOX SIZING — REGRESSION TESTS (NEC 314.28)');
  console.log('═══════════════════════════════════════════════════');

  for (const r of results) {
    const icon = r.result === 'PASS' ? '✓' : '✗';
    console.log(`${icon} ${r.id}: ${r.result} — ${r.name}`);
    if (r.result === 'FAIL') {
      for (const [key, m] of Object.entries(r.matches)) {
        if (!m.match) console.log(`    ${key}: expected=${m.expected}, actual=${m.actual}`);
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed}/${total} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════');

  process.exit(failed > 0 ? 1 : 0);
} catch (e) {
  console.error('Error:', e.message);
  console.error(e.stack);
  process.exit(1);
} finally {
  fs.unlinkSync(entryPath);
  try { fs.unlinkSync(outfile); } catch {}
}