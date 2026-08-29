import { build } from 'esbuild';
import { renderToString } from 'react-dom/server';
import React from 'react';
import { fileURLToPath } from 'url';
import path from 'path';
import * as fs from 'fs';

// Minimal browser-global stubs so real radix/shadcn components render in Node SSR
if (!global.window) {
  const noop = () => {};
  global.window = {
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }),
    addEventListener: noop, removeEventListener: noop,
    scrollTo: noop, scrollY: 0, scrollX: 0,
    innerWidth: 1024, innerHeight: 768,
    requestAnimationFrame: noop, cancelAnimationFrame: noop,
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  };
}
if (!global.document) {
  const noop = () => {};
  global.document = {
    createElement: () => ({ style: {}, setAttribute: noop, appendChild: noop, removeChild: noop, addEventListener: noop, removeEventListener: noop, classList: { add: noop, remove: noop, contains: () => false }, focus: noop, click: noop, getBoundingClientRect: () => ({ x:0,y:0,width:0,height:0,top:0,left:0,right:0,bottom:0 }) }),
    createTextNode: () => ({}),
    addEventListener: noop, removeEventListener: noop,
    body: { appendChild: noop, removeChild: noop },
    documentElement: { style: {}, setAttribute: noop },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    activeElement: null,
    readyState: 'complete',
  };
}
if (!global.navigator) global.navigator = { userAgent: 'node-ssr' };
if (!global.matchMedia) global.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} });
if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// ─── Scan all source files for lucide-react named imports ─────────────────
function collectLucideIcons() {
  const icons = new Set();
  function scanDir(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { scanDir(full); continue; }
      if (!/\.(jsx?|tsx?)$/.test(entry.name)) continue;
      const src = fs.readFileSync(full, 'utf8');
      const re = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g;
      let m;
      while ((m = re.exec(src)) !== null) {
        for (let part of m[1].split(',')) {
          part = part.trim();
          if (!part) continue;
          const name = part.split(/\s+as\s+/)[0].trim();
          if (name) icons.add(name);
        }
      }
    }
  }
  scanDir(path.resolve(root, 'src'));
  return [...icons].sort();
}

const lucideIcons = collectLucideIcons();
const lucideSrc = `import React from 'react';
const mk = (name) => (props) => React.createElement('span', { 'data-icon': name, ...(props||{}) });
${lucideIcons.map(n => `export const ${n} = mk(${JSON.stringify(n)});`).join('\n')}
`;

// ─── UI component stub generator ──────────────────────────────────────────
function makeUiStub(src) {
  const names = new Set();
  const re1 = /export\s+(?:const|function|class)\s+([A-Za-z_][A-Za-z0-9_]*)/g;
  let m; while ((m = re1.exec(src)) !== null) names.add(m[1]);
  const re2 = /export\s*\{([^}]+)\}/g;
  while ((m = re2.exec(src)) !== null) {
    for (let part of m[1].split(',')) {
      part = part.trim();
      if (!part) continue;
      const name = part.split(/\s+as\s+/)[0].trim();
      if (name && name !== 'default') names.add(name);
    }
  }
  const stubs = [...names].map(n => `export const ${n} = (p) => React.createElement('div', { 'data-ui': ${JSON.stringify(n)}, ...(p||{}) }, p?.children);`).join('\n');
  return `import React from 'react';\nconst _d = (p) => React.createElement('div', { 'data-ui': 'default', ...(p||{}) }, p?.children);\nexport default _d;\n${stubs}`;
}

// ─── esbuild plugin: alias @/ and mock external deps ──────────────────────
const plugin = {
  name: 'mock-and-alias',
  setup(build) {
    // Virtual mocks for external packages
    const virtual = {
      'framer-motion': `import React from 'react';
        const mk = (type) => (props) => React.createElement(type, props);
        const motion = new Proxy({}, { get: (t, p) => mk(p === 'button' ? 'button' : 'div') });
        export { motion };
        export const AnimatePresence = (props) => React.createElement(React.Fragment, null, props?.children);
      `,
      'react-router-dom': `import React from 'react';
        const Link = (p) => React.createElement('a', p, p?.children);
        const Navigate = () => null; const Outlet = () => null;
        const Routes = (p) => p?.children; const Route = () => null;
        const BrowserRouter = (p) => p?.children;
        export { Link, Navigate, Outlet, Routes, Route, BrowserRouter };
        export const useNavigate = () => () => {};
        export const useParams = () => ({});
        export const useLocation = () => ({ pathname: '/' });
      `,
      'tailwind-merge': `export const twMerge = (...a) => a.filter(Boolean).join(' '); export default twMerge;`,
      'class-variance-authority': `export const cva = () => () => ''; export const cx = (...a) => a.filter(Boolean).join(' ');`,
      'clsx': `export default (...a) => a.filter(Boolean).join(' '); export const clsx = (...a) => a.filter(Boolean).join(' ');`,
      'vaul': `import React from 'react'; const mk=(n)=>(p)=>React.createElement('div',{['data-vaul']:n,...(p||{})},p?.children); export const Drawer=mk('Drawer'); export const DrawerContent=mk('DrawerContent'); export const DrawerHeader=mk('DrawerHeader'); export const DrawerTitle=mk('DrawerTitle'); export const DrawerTrigger=mk('DrawerTrigger'); export const DrawerClose=mk('DrawerClose'); export const DrawerFooter=mk('DrawerFooter'); export const DrawerDescription=mk('DrawerDescription'); export const DrawerPortal=mk('DrawerPortal'); export const DrawerOverlay=mk('DrawerOverlay');`,
      'recharts': `import React from 'react'; const mk=(n)=>(p)=>React.createElement('div',{['data-recharts']:n,...(p||{})},p?.children); const h={}; export default new Proxy(h,{get:(t,p)=>mk(p)});`,
      'date-fns': `export default {};`,
      'moment': `export default () => ({ format: () => '' });`,
      'lodash': `export default {};`,
      'react-markdown': `import React from 'react'; export default (p) => React.createElement('div', null, p?.children);`,
      'react-quill-new': `import React from 'react'; export default (p) => React.createElement('div', null, p?.children);`,
      '@hello-pangea/dnd': `import React from 'react'; const mk=(n)=>(p)=>React.createElement('div',{['data-dnd']:n,...(p||{})},p?.children); export const DragDropContext=mk('DragDropContext'); export const Droppable=mk('Droppable'); export const Draggable=mk('Draggable');`,
      '@tanstack/react-query': `import React from 'react'; export const useQuery=()=>({data:null}); export const useMutation=()=>({mutate:()=>{}}); export const QueryClientProvider=(p)=>p?.children;`,
      'react-hook-form': `import React from 'react'; export const useForm=()=>({register:()=>({}),handleSubmit:()=>()=>{},watch:()=>({}),formState:{}}); export const Controller=(p)=>null;`,
      '@hookform/resolvers': `export const zodResolver=()=>({});`,
      'zod': `export default {}; export const z= new Proxy({}, {get:()=>()=>({})});`,
      'cmdk': `import React from 'react'; export default (p)=>React.createElement('div',null,p?.children);`,
      'embla-carousel-react': `export default () => ({ on: () => {} });`,
      'react-day-picker': `import React from 'react'; export default (p)=>null;`,
      'react-leaflet': `import React from 'react'; const mk=(n)=>(p)=>null; export const MapContainer=mk('MapContainer'); export const TileLayer=mk('TileLayer'); export const Marker=mk('Marker'); export const Popup=mk('Popup');`,
      'three': `export default {};`,
      'html2canvas': `export default () => Promise.resolve({});`,
      'jspdf': `export default function(){ return { save: () => {} }; }`,
      'pdf-lib': `export default {};`,
      'pdf-parse': `export default () => Promise.resolve({});`,
      'canvas-confetti': `export default () => {};`,
      'sonner': `import React from 'react'; export const Toaster=()=>null; export const toast=()=>{};`,
      'react-hot-toast': `import React from 'react'; export const Toaster=()=>null; export const toast=()=>{};`,
      'next-themes': `export const useTheme=()=>({theme:'light',setTheme:()=>{}});`,
      'input-otp': `import React from 'react'; export const OTPInput=(p)=>null;`,
      'react-resizable-panels': `import React from 'react'; const mk=(n)=>(p)=>p?.children; export const Panel=mk('Panel'); export const PanelGroup=mk('PanelGroup'); export const PanelResizeHandle=mk('PanelResizeHandle');`,
      '@base44/sdk': `export default {};`,
      'lucide-react': lucideSrc,
    };

    for (const [mod, src] of Object.entries(virtual)) {
      const esc = mod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      build.onResolve({ filter: new RegExp('^' + esc + '$') }, () => ({ path: mod, namespace: 'virtual' }));
      build.onLoad({ filter: new RegExp('^' + esc + '$'), namespace: 'virtual' }, () => ({ contents: src, loader: 'js' }));
    }

    // @/api/base44Client mock
    build.onResolve({ filter: /^@\/api\/base44Client$/ }, () => ({ path: '@/api/base44Client', namespace: 'virtual' }));
    build.onLoad({ filter: /^@\/api\/base44Client$/, namespace: 'virtual' }, () => ({
      contents: `const base44 = { entities: new Proxy({}, { get: () => ({ list: async()=>[], filter: async()=>[], create: async()=>({}), update: async()=>({}), delete: async()=>({}) }) }), auth: { me: async()=>({id:'u1',role:'admin'}), logout: ()=>{} }, users: { inviteUser: async()=>({}) } }; export { base44 };`,
      loader: 'js',
    }));

    // @/context mocks
    build.onResolve({ filter: /^@\/context\// }, (args) => ({ path: args.path, namespace: 'virtual' }));
    build.onLoad({ filter: /^@\/context\/NECYearContext$/, namespace: 'virtual' }, () => ({
      contents: `export const useNECYear = () => ({ year: '2017', setYear: ()=>{}, years: ['2017','2020'] }); export const NECYearProvider = ({children}) => children;`,
      loader: 'js',
    }));
    build.onLoad({ filter: /^@\/context\/ThemeContext$/, namespace: 'virtual' }, () => ({
      contents: `export const useTheme = () => ({ theme: 'light', toggleTheme: ()=>{} }); export const ThemeProvider = ({children}) => children;`,
      loader: 'js',
    }));
    build.onLoad({ filter: /^@\/context\//, namespace: 'virtual' }, () => ({ contents: `export default {};`, loader: 'js' }));

    // @/hooks mocks
    build.onResolve({ filter: /^@\/hooks\// }, (args) => ({ path: args.path, namespace: 'virtual' }));
    build.onLoad({ filter: /^@\/hooks\/useArticleVerification/, namespace: 'virtual' }, () => ({
      contents: `export const useArticleVerification = () => ({ getStatus: ()=>({status:'pending_review',notes:null}), verificationMap: {}, isLoading: false });`,
      loader: 'js',
    }));
    build.onLoad({ filter: /^@\/hooks\/use-mobile/, namespace: 'virtual' }, () => ({
      contents: `export const useIsMobile = () => false;`, loader: 'js',
    }));
    build.onLoad({ filter: /^@\/hooks\/usePullToRefresh/, namespace: 'virtual' }, () => ({
      contents: `export const usePullToRefresh = () => ({ pullDistance: 0, isRefreshing: false, containerRef: { current: null } });`, loader: 'js',
    }));
    build.onLoad({ filter: /^@\/hooks\/useTrialStatus/, namespace: 'virtual' }, () => ({
      contents: `export const useTrialStatus = () => ({ canAccess: true, status: 'active', daysLeft: 30 });`, loader: 'js',
    }));
    build.onLoad({ filter: /^@\/hooks\//, namespace: 'virtual' }, () => ({ contents: `export default {};`, loader: 'js' }));

    // @/components/ui/* — stub by reading the file's exports
    build.onResolve({ filter: /^@\/components\/ui\// }, (args) => ({ path: args.path, namespace: 'ui-mock' }));
    build.onLoad({ filter: /.*/, namespace: 'ui-mock' }, (args) => {
      const base = path.resolve(root, 'src', args.path.replace(/^@\//, ''));
      const cands = [base + '.jsx', base + '.js', base + '.tsx', base + '.ts'];
      let src = '';
      for (const c of cands) { if (fs.existsSync(c)) { src = fs.readFileSync(c, 'utf8'); break; } }
      return { contents: makeUiStub(src), loader: 'js' };
    });

    // Generic @/ alias -> src/ (real local modules) — must be LAST among @/ handlers
    build.onResolve({ filter: /^@\// }, (args) => {
      const base = path.resolve(root, 'src', args.path.replace(/^@\//, ''));
      const cands = [base + '.jsx', base + '.js', base + '.tsx', base + '.ts', base + '/index.jsx', base + '/index.js'];
      for (const c of cands) { if (fs.existsSync(c)) return { path: c }; }
      return { path: base + '.jsx', external: false };
    });
  },
};

// ─── Build a single entry that imports ALL calculators ───────────────────
const calcDir = path.resolve(root, 'src/components/calculator/calcs');
// Extract the set of calculator files actually mapped in CalculatorPanel.jsx
const panelSrc = fs.readFileSync(path.resolve(root, 'src/components/calculator/CalculatorPanel.jsx'), 'utf8');
const mappedFiles = new Set();
for (const m of panelSrc.matchAll(/from\s*["']\.\/calcs\/([^"']+)["']/g)) {
  mappedFiles.add(m[1].endsWith('.jsx') ? m[1] : m[1] + '.jsx');
}
const calcFiles = fs.readdirSync(calcDir).filter(f => f.endsWith('.jsx') && mappedFiles.has(f));

const entryContents = `
${calcFiles.map((f, i) => `import C${i} from ${JSON.stringify(path.join(calcDir, f))};`).join('\n')}
export const calcs = [
${calcFiles.map((f, i) => `{ file: ${JSON.stringify(f)}, Comp: C${i} }`).join(',\n')}
];
`;

const entryPath = path.resolve(root, '.tmp_calcs_entry.mjs');
fs.writeFileSync(entryPath, entryContents);

const outfile = path.resolve(root, '.tmp_calcs_bundle.mjs');
const results = [];

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
    external: ['react', 'react-dom', 'react-dom/server', 'react/jsx-runtime'],
  });

  const mod = await import(outfile + '?t=' + Date.now());
  const calcs = mod.calcs;

  for (const { file, Comp } of calcs) {
    if (!Comp) { results.push({ file, error: 'no default export' }); continue; }
    try {
      const calcId = file.replace(/\.jsx$/, '');
      const category = { id: calcId, label: 'Test', article: 'NEC', description: 'd', color: 'blue', emoji: '⚡' };
      const html = renderToString(React.createElement(Comp, { category, necYear: '2017' }));
      results.push({ file, ok: true, len: html.length });
    } catch (e) {
      results.push({ file, error: (e.stack || e.message || String(e)).split('\n').slice(0, 6).join(' | ') });
    }
  }
} catch (e) {
  results.push({ file: '__build__', error: (e.stack || e.message || String(e)).substring(0, 1500) });
} finally {
  fs.unlinkSync(entryPath);
  try { fs.unlinkSync(outfile); } catch {}
}

console.log(JSON.stringify(results, null, 2));