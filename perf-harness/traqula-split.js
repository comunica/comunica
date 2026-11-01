// Split time spent in @traqula frames by which comunica package called into traqula.
const fs = require('node:fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const byId = new Map(p.nodes.map(n => [ n.id, n ]));
const parent = new Map();
for (const n of p.nodes) {
  for (const c of n.children ?? []) {
    parent.set(c, n.id);
  }
}
const out = new Map();
let total = 0;
let traqula = 0;
for (let i = 0; i < p.samples.length; i++) {
  const t = p.timeDeltas[i];
  let id = p.samples[i];
  const leaf = byId.get(id).callFrame;
  if ([ '(idle)', '(program)' ].includes(leaf.functionName) || leaf.url.startsWith('node:inspector')) {
    continue;
  }
  total += t;
  // Find the innermost traqula frame, then the first non-traqula caller above it
  let inTraqula = false;
  let caller;
  while (id !== undefined) {
    const url = byId.get(id).callFrame.url;
    if (url.includes('@traqula')) {
      inTraqula = true;
    } else if (inTraqula) {
      const m = url.match(/(packages|engines)\/([^/]+)/u);
      caller = `${m ? m[2] : url.split('/').slice(-2).join('/')} ${byId.get(id).callFrame.functionName}`;
      break;
    }
    id = parent.get(id);
  }
  if (inTraqula) {
    traqula += t;
    out.set(caller, (out.get(caller) ?? 0) + t);
  }
}
console.log(`traqula total ${(100 * traqula / total).toFixed(1)}%`);
for (const [ k, v ] of [ ...out ].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`${(100 * v / total).toFixed(1).padStart(5)}%  ${k}`);
}
