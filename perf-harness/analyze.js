// Summarize a .cpuprofile: self time per package and per function, and inclusive time per package.
const fs = require('node:fs');
const profile = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const top = Number(process.argv[3] ?? 40);
const nodes = new Map(profile.nodes.map(n => [ n.id, n ]));
const parent = new Map();
for (const n of profile.nodes) {
  for (const c of n.children ?? []) {
    parent.set(c, n.id);
  }
}
const dt = new Map();
for (let i = 0; i < profile.samples.length; i++) {
  dt.set(profile.samples[i], (dt.get(profile.samples[i]) ?? 0) + (profile.timeDeltas[i] ?? 0));
}
const total = [ ...dt.values() ].reduce((a, b) => a + b, 0);
function pkg(url) {
  if (!url) {
    return '(native/vm)';
  }
  let m = url.match(/node_modules\/((@[^/]+\/)?[^/]+)/u);
  if (m) {
    return m[1];
  }
  m = url.match(/comunica\/(packages|engines)\/([^/]+)/u);
  if (m) {
    return `@comunica/${m[2]}`;
  }
  if (url.startsWith('node:')) {
    return 'node-internal';
  }
  return url.split('/').slice(-2).join('/');
}
const selfPkg = new Map();
const selfFn = new Map();
const inclPkg = new Map();
for (const [ id, t ] of dt) {
  const n = nodes.get(id);
  const cf = n.callFrame;
  const p = cf.functionName === '(garbage collector)' ? '(gc)' : cf.functionName === '(idle)' ? '(idle)' : pkg(cf.url);
  selfPkg.set(p, (selfPkg.get(p) ?? 0) + t);
  const fn = `${cf.functionName || '(anon)'} ${p}:${cf.lineNumber + 1}`;
  selfFn.set(fn, (selfFn.get(fn) ?? 0) + t);
  // Inclusive per package: count each package once per stack
  const seen = new Set();
  let cur = id;
  while (cur !== undefined) {
    const c = nodes.get(cur).callFrame;
    seen.add(pkg(c.url));
    cur = parent.get(cur);
  }
  for (const s of seen) {
    inclPkg.set(s, (inclPkg.get(s) ?? 0) + t);
  }
}
const show = (title, m) => {
  console.log(`\n== ${title}`);
  for (const [ k, v ] of [ ...m ].sort((a, b) => b[1] - a[1]).slice(0, top)) {
    console.log(`${(100 * v / total).toFixed(1).padStart(5)}%  ${k}`);
  }
};
console.log(`total ${(total / 1000).toFixed(0)} ms`);
show('self time per package', selfPkg);
show('inclusive time per package', inclPkg);
show('self time per function', selfFn);
