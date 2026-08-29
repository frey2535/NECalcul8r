import { build } from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Minimal browser stubs
const noop = () => {};
global.window = { matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }), addEventListener: noop, removeEventListener: noop, innerWidth: 1024, innerHeight: 768, localStorage: { getItem: () => null, setItem: noop } };
global.document = { createElement: () => ({ style: {}, setAttribute: noop, appendChild: noop, addEventListener: noop }), addEventListener: noop, body: {}, documentElement: {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], activeElement: null, readyState: 'complete' };
global.navigator = { userAgent: 'node' };
global.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop });

const calcDir = path.resolve(root, 'src/components/calculator/calcs');
const calcFile = process.argv[2] || 'BondingJumperParallel.jsx';
const calcPath = path.join(calcDir, calcFile);
const outfile = path.resolve(root, `.tmp_inspect.mjs`);

// Inline plugin (same as render_calcs_test.mjs)
const plugin2 = {
  name: 'mock',
  setup(build) {
    build.onResolve({ filter: /^@\/api\/base44Client$/ }, () => ({ path: '@/api/base44Client', namespace: 'virtual' }));
    build.onResolve({ filter: /^@\/context\// }, (args) => ({ path: args.path, namespace: 'virtual' }));
    build.onResolve({ filter: /^@\/hooks\// }, (args) => ({ path: args.path, namespace: 'virtual' }));
    build.onResolve({ filter: /^@\/components\/ui\// }, (args) => ({ path: args.path, namespace: 'ui-mock' }));
    build.onResolve({ filter: /^@\// }, (args) => {
      const base = path.resolve(root, 'src', args.path.replace(/^@\//, ''));
      const cands = [base + '.jsx', base + '.js', base + '.tsx', base + '.ts', base + '/index.jsx', base + '/index.js'];
      for (const c of cands) { if (fs.existsSync(c)) return { path: c }; }
      return { path: base + '.jsx' };
    });
    const virtual = {
      'framer-motion': `import React from 'react'; const mk=(t)=>(p)=>React.createElement(t,p); const motion=new Proxy({},{get:(t,p)=>mk(p==='button'?'button':'div')}); export {motion}; export const AnimatePresence=(p)=>React.createElement(React.Fragment,null,p?.children);`,
      'react-router-dom': `import React from 'react'; const Link=(p)=>React.createElement('a',p,p?.children); const Navigate=()=>null; const Outlet=()=>null; export {Link,Navigate,Outlet}; export const useNavigate=()=>()=>{}; export const useParams=()=>({}); export const useLocation=()=>({pathname:'/'});`,
      'tailwind-merge': `export const twMerge=(...a)=>a.filter(Boolean).join(' '); export default twMerge;`,
      'class-variance-authority': `export const cva=()=>()=>''; export const cx=(...a)=>a.filter(Boolean).join(' ');`,
      'vaul': `import React from 'react'; const mk=(n)=>(p)=>React.createElement('div',{['data-vaul']:n,...(p||{})},p?.children); export const Drawer=mk('Drawer'); export const DrawerContent=mk('DrawerContent'); export const DrawerHeader=mk('DrawerHeader'); export const DrawerTitle=mk('DrawerTitle'); export const DrawerTrigger=mk('DrawerTrigger'); export const DrawerClose=mk('DrawerClose'); export const DrawerFooter=mk('DrawerFooter'); export const DrawerDescription=mk('DrawerDescription'); export const DrawerPortal=mk('DrawerPortal'); export const DrawerOverlay=mk('DrawerOverlay');`,
      'recharts': `import React from 'react'; const mk=(n)=>(p)=>React.createElement('div',p,p?.children); const h={}; export default new Proxy(h,{get:(t,p)=>mk(p)});`,
      'date-fns': `export default {};`,
      'moment': `export default () => ({ format: () => '' });`,
      'lodash': `export default {};`,
      'react-markdown': `import React from 'react'; export default (p)=>React.createElement('div',null,p?.children);`,
      'react-quill-new': `import React from 'react'; export default (p)=>React.createElement('div',null,p?.children);`,
      '@hello-pangea/dnd': `import React from 'react'; const mk=(n)=>(p)=>React.createElement('div',p,p?.children); export const DragDropContext=mk('D'); export const Droppable=mk('Dp'); export const Draggable=mk('Dg');`,
      '@tanstack/react-query': `export const useQuery=()=>({data:null}); export const useMutation=()=>({mutate:()=>{}}); export const QueryClientProvider=(p)=>p?.children;`,
      'react-hook-form': `export const useForm=()=>({register:()=>({}),handleSubmit:()=>()=>{},watch:()=>({}),formState:{}}); export const Controller=()=>null;`,
      '@hookform/resolvers': `export const zodResolver=()=>({});`,
      'zod': `export default {}; export const z=new Proxy({},{get:()=>()=>({})});`,
      'cmdk': `import React from 'react'; export default (p)=>React.createElement('div',null,p?.children);`,
      'embla-carousel-react': `export default () => ({ on: () => {} });`,
      'react-day-picker': `export default () => null;`,
      'react-leaflet': `export const MapContainer=()=>null; export const TileLayer=()=>null; export const Marker=()=>null; export const Popup=()=>null;`,
      'three': `export default {};`,
      'html2canvas': `export default () => Promise.resolve({});`,
      'jspdf': `export default function(){ return { save: () => {} }; }`,
      'pdf-lib': `export default {};`,
      'pdf-parse': `export default () => Promise.resolve({});`,
      'canvas-confetti': `export default () => {};`,
      'sonner': `export const Toaster=()=>null; export const toast=()=>{};`,
      'react-hot-toast': `export const Toaster=()=>null; export const toast=()=>{};`,
      'next-themes': `export const useTheme=()=>({theme:'light',setTheme:()=>{}});`,
      'input-otp': `export const OTPInput=()=>null;`,
      'react-resizable-panels': `export const Panel=(p)=>p?.children; export const PanelGroup=(p)=>p?.children; export const PanelResizeHandle=(p)=>p?.children;`,
      '@base44/sdk': `export default {};`,
    };
    for (const [mod, src] of Object.entries(virtual)) {
      const esc = mod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      build.onResolve({ filter: new RegExp('^' + esc + '$') }, () => ({ path: mod, namespace: 'virtual' }));
      build.onLoad({ filter: new RegExp('^' + esc + '$'), namespace: 'virtual' }, () => ({ contents: src, loader: 'js' }));
    }
    build.onLoad({ filter: /^@\/api\/base44Client$/, namespace: 'virtual' }, () => ({
      contents: `const base44 = { entities: new Proxy({}, { get: () => ({ list: async()=>[], filter: async()=>[], create: async()=>({}), update: async()=>({}), delete: async()=>({}) }) }), auth: { me: async()=>({id:'u1',role:'admin'}), logout: ()=>{} }, users: { inviteUser: async()=>({}) } }; export { base44 };`,
      loader: 'js',
    }));
    build.onLoad({ filter: /^@\/context\/NECYearContext$/, namespace: 'virtual' }, () => ({
      contents: `export const useNECYear=()=>({year:'2017',setYear:()=>{},years:['2017','2020']}); export const NECYearProvider=({children})=>children;`,
      loader: 'js',
    }));
    build.onLoad({ filter: /^@\/context\/ThemeContext$/, namespace: 'virtual' }, () => ({
      contents: `export const useTheme=()=>({theme:'light',toggleTheme:()=>{}}); export const ThemeProvider=({children})=>children;`,
      loader: 'js',
    }));
    build.onLoad({ filter: /^@\/context\//, namespace: 'virtual' }, () => ({ contents: `export default {};`, loader: 'js' }));
    build.onLoad({ filter: /^@\/hooks\/useArticleVerification/, namespace: 'virtual' }, () => ({
      contents: `export const useArticleVerification=()=>({getStatus:()=>({status:'pending_review',notes:null}),verificationMap:{},isLoading:false});`,
      loader: 'js',
    }));
    build.onLoad({ filter: /^@\/hooks\/use-mobile/, namespace: 'virtual' }, () => ({ contents: `export const useIsMobile=()=>false;`, loader: 'js' }));
    build.onLoad({ filter: /^@\/hooks\/usePullToRefresh/, namespace: 'virtual' }, () => ({ contents: `export const usePullToRefresh=()=>({pullDistance:0,isRefreshing:false,containerRef:{current:null}});`, loader: 'js' }));
    build.onLoad({ filter: /^@\/hooks\/useTrialStatus/, namespace: 'virtual' }, () => ({ contents: `export const useTrialStatus=()=>({canAccess:true,status:'active',daysLeft:30});`, loader: 'js' }));
    build.onLoad({ filter: /^@\/hooks\//, namespace: 'virtual' }, () => ({ contents: `export default {};`, loader: 'js' }));
    build.onLoad({ filter: /.*/, namespace: 'ui-mock' }, (args) => {
      const base = path.resolve(root, 'src', args.path.replace(/^@\//, ''));
      const cands = [base + '.jsx', base + '.js', base + '.tsx', base + '.ts'];
      let src = '';
      for (const c of cands) { if (fs.existsSync(c)) { src = fs.readFileSync(c, 'utf8'); break; } }
      const names = new Set();
      const re1 = /export\s+(?:const|function|class)\s+([A-Za-z_][A-Za-z0-9_]*)/g;
      let m; while ((m = re1.exec(src)) !== null) names.add(m[1]);
      const re2 = /export\s*\{([^}]+)\}/g;
      while ((m = re2.exec(src)) !== null) {
        for (let part of m[1].split(',')) {
          part = part.trim(); if (!part) continue;
          const name = part.split(/\s+as\s+/)[0].trim();
          if (name && name !== 'default') names.add(name);
        }
      }
      const stubs = [...names].map(n => `export const ${n} = (p) => React.createElement('div', { 'data-ui': '${n}', ...(p||{}) }, p?.children);`).join('\n');
      return { contents: `import React from 'react';\nconst _d=(p)=>React.createElement('div',{'data-ui':'default',...(p||{})},p?.children);\nexport default _d;\n${stubs}`, loader: 'js' };
    });
  },
};

await build({
  entryPoints: [calcPath],
  bundle: true,
  format: 'esm',
  outfile,
  jsx: 'automatic',
  plugins: [plugin2],
  logLevel: 'silent',
  loader: { '.js': 'jsx', '.jsx': 'jsx' },
  external: ['react', 'react-dom', 'react-dom/server', 'react/jsx-runtime'],
});

const lines = fs.readFileSync(outfile, 'utf8').split('\n');
// Print lines around 269 with more context
for (let i = 255; i < 285 && i < lines.length; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
// Also find the __toESM helper and any .displayName access
const allText = lines.join('\n');
const dnIdx = allText.indexOf('displayName');
if (dnIdx >= 0) {
  const start = Math.max(0, allText.lastIndexOf('\n', dnIdx - 200) + 1);
  const end = allText.indexOf('\n', dnIdx + 200);
  console.log('\n--- displayName context ---');
  console.log(allText.substring(start, end));
}
fs.unlinkSync(outfile);