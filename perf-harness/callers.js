// Show the heaviest call stacks leading to a function in a .cpuprofile.
// Usage: node callers.js <profile> <functionName> [depth]
const fs = require('node:fs');
const [ file, fnName, depthArg ] = process.argv.slice(2);
const depth = Number(depthArg ?? 8);
const p = JSON.parse(fs.readFileSync(file, 'utf8'));
const byId = new Map(p.nodes.map(n => [ n.id, n ]));
const parent = new Map();
for (const n of p.nodes) {
  for (const c of n.children ?? []) {
    parent.set(c, n.id);
  }
}
const dt = new Map();
let total = 0;
for (let i = 0; i < p.samples.length; i++) {
  dt.set(p.samples[i], (dt.get(p.samples[i]) ?? 0) + p.timeDeltas[i]);
  total += p.timeDeltas[i];
}
const stacks = new Map();
for (const [ id, t ] of dt) {
  if (byId.get(id).callFrame.functionName !== fnName) {
    continue;
  }
  const s = [];
  let cur = parent.get(id);
  while (cur !== undefined && s.length < depth) {
    const cf = byId.get(cur).callFrame;
    s.push(`${cf.functionName || '(anon)'}@${cf.url.split('/').slice(-3).join('/')}:${cf.lineNumber + 1}`);
    cur = parent.get(cur);
  }
  const key = s.join(' < ');
  stacks.set(key, (stacks.get(key) ?? 0) + t);
}
for (const [ k, v ] of [ ...stacks ].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
  console.log(`${(100 * v / total).toFixed(2)}%  ${k}\n`);
}
